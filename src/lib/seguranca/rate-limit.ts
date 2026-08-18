/**
 * Rate limiting leve, em memória por instância.
 *
 * Não é um limitador distribuído — cada instância serverless tem o seu
 * balde. Mesmo assim corta o caso que importa: um cliente martelando um
 * endpoint caro (OCR pago, geração de PDF) na mesma instância quente. Para
 * teto global de custo, combine com um kill-switch por env.
 *
 * Janela deslizante simples: guarda os timestamps recentes por chave e
 * conta quantos caíram na janela.
 */
type Balde = { hits: number[] };

const baldes = new Map<string, Balde>();

// Limpeza preguiçosa: quando o mapa cresce, varre e descarta chaves frias.
let ultimaLimpeza = 0;
function talvezLimpar(agora: number, janelaMs: number) {
  if (baldes.size < 5000 || agora - ultimaLimpeza < 60_000) return;
  ultimaLimpeza = agora;
  for (const [k, b] of baldes) {
    if (b.hits.length === 0 || b.hits[b.hits.length - 1] < agora - janelaMs) {
      baldes.delete(k);
    }
  }
}

/** IP do cliente a partir dos headers de proxy (Vercel põe x-forwarded-for). */
export function ipDaRequisicao(req: {
  headers: { get(name: string): string | null };
}): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "desconhecido";
}

export type ResultadoLimite = {
  ok: boolean;
  /** Quantas chamadas ainda cabem na janela. */
  restantes: number;
  /** Segundos até liberar mais uma, quando estourou. */
  retryEmSeg: number;
};

/**
 * Registra uma tentativa e diz se passou do teto.
 * @param chave identificador do cliente+rota (ex.: `ocr:${userId}`)
 * @param limite máximo de chamadas na janela
 * @param janelaMs tamanho da janela em ms (padrão 60s)
 */
export function consumir(
  chave: string,
  limite: number,
  janelaMs = 60_000,
): ResultadoLimite {
  const agora = Date.now();
  talvezLimpar(agora, janelaMs);

  const balde = baldes.get(chave) ?? { hits: [] };
  // Descarta o que saiu da janela.
  balde.hits = balde.hits.filter((t) => t > agora - janelaMs);

  if (balde.hits.length >= limite) {
    const maisAntigo = balde.hits[0];
    const retryEmSeg = Math.max(1, Math.ceil((maisAntigo + janelaMs - agora) / 1000));
    baldes.set(chave, balde);
    return { ok: false, restantes: 0, retryEmSeg };
  }

  balde.hits.push(agora);
  baldes.set(chave, balde);
  return { ok: true, restantes: limite - balde.hits.length, retryEmSeg: 0 };
}

/* ─────────────────────────────────────────────────────────────
   VERSÃO DISTRIBUÍDA (Upstash Redis via REST)
   ─────────────────────────────────────────────────────────────
   Quando UPSTASH_REDIS_REST_URL + _TOKEN estão configurados, o teto vale
   entre TODAS as instâncias (limitador global de verdade). Sem eles, cai no
   balde em memória por instância — que já segura rajada. Qualquer erro de
   rede com o Upstash também cai no fallback: disponibilidade nunca depende
   do limitador. */

function upstashConfig(): { url: string; token: string } | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL ?? "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();
  return url && token ? { url, token } : null;
}

/** Janela fixa via Upstash: INCR + PEXPIRE(NX) + PTTL, em um pipeline. */
async function consumirUpstash(
  cfg: { url: string; token: string },
  chave: string,
  limite: number,
  janelaMs: number,
): Promise<ResultadoLimite> {
  const k = `rl:${chave}`;
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${cfg.token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", k],
      ["PEXPIRE", k, String(janelaMs), "NX"],
      ["PTTL", k],
    ]),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`upstash HTTP ${res.status}`);
  const arr = (await res.json()) as Array<{ result?: number }>;
  const contagem = Number(arr?.[0]?.result ?? 0);
  const ttlMs = Number(arr?.[2]?.result ?? janelaMs);
  if (contagem > limite) {
    return {
      ok: false,
      restantes: 0,
      retryEmSeg: Math.max(1, Math.ceil((ttlMs > 0 ? ttlMs : janelaMs) / 1000)),
    };
  }
  return { ok: true, restantes: Math.max(0, limite - contagem), retryEmSeg: 0 };
}

/**
 * Consome uma tentativa do limite — distribuído se o Upstash estiver
 * configurado, senão em memória. É o que middleware e rotas devem usar.
 */
export async function consumirDistribuido(
  chave: string,
  limite: number,
  janelaMs = 60_000,
): Promise<ResultadoLimite> {
  const cfg = upstashConfig();
  if (cfg) {
    try {
      return await consumirUpstash(cfg, chave, limite, janelaMs);
    } catch {
      // Upstash fora do ar → não derruba a request; usa o balde local.
    }
  }
  return consumir(chave, limite, janelaMs);
}
