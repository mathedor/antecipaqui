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
