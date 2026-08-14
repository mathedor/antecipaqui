/* ─────────────────────────────────────────────────────────────────────────────
   O PREÇO DA INFRAESTRUTURA VEM DA ANA, TODO MÊS

   A conta da Vercel e a do banco chegam uma só, com todos os sistemas da casa
   dentro. Quem lê a fatura de verdade é a Ana: ela consulta a Vercel e o
   Supabase todo dia, reparte a conta (o banco pelo valor exato de cada projeto,
   o resto dividido entre os sistemas no ar) e publica o número aqui.

   Assim esta página deixa de mostrar um valor escrito à mão em 2025 e passa a
   mostrar o que saiu do caixa neste mês, sem ninguém precisar republicar nada.

   Se a Ana não responder, vale o valor local do relatório — a página nunca
   fica em branco nem mostra zero.
   ───────────────────────────────────────────────────────────────────────────── */

export type ContaAna = {
  id: string;
  nome: string;
  valor: number;
  obs: string;
  fonte: "api" | "derivado" | "repetido" | "informado";
  estimado: boolean;
};

type ContaLocal = { id?: string; nome?: string; valor: number; obs?: string; estimado?: boolean };

const ANA = process.env.ANA_CUSTOS_URL ?? "https://www.ana.show";

/** Busca a conta deste sistema na Ana. `null` = não deu, usa o valor local. */
export async function contasDaAna(projeto: string): Promise<ContaAna[] | null> {
  const token = process.env.ANA_CUSTOS_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(`${ANA}/api/custos-infra?projeto=${encodeURIComponent(projeto)}&t=${token}`, {
      next: { revalidate: 21_600 },  // 6 horas: a fatura não muda de minuto em minuto
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.ok && Array.isArray(d.contas) && d.contas.length > 0 ? (d.contas as ContaAna[]) : null;
  } catch {
    return null;  // Ana fora do ar não pode derrubar o relatório
  }
}

/* ── de que conta da casa é essa linha? ──
   Cada sistema batizou do seu jeito ("Hospedagem (Vercel)", "Banco de dados
   (Neon)", "Z-API (WhatsApp)", id "host", id "db"), então o reconhecimento é
   pelo nome, não pelo id. */
export function contaDaCasa(...pistas: (string | undefined | null)[]): string | null {
  const t = pistas.filter(Boolean).join(" ").toLowerCase();
  if (/vercel|hospedagem|host/.test(t) && !/blob|marketplace/.test(t)) return "vercel";
  if (/supabase|neon|banco de dados|postgres|\bdb\b/.test(t)) return "banco";
  if (/backup/.test(t)) return "backup";
  if (/resend|e-?mail/.test(t)) return "resend";
  if (/whats|z-?api|zapi/.test(t)) return "whatsapp";
  if (/firewall/.test(t)) return "firewall";
  if (/prox/.test(t)) return "proxies";
  if (/vps|servidor|agentes/.test(t)) return "vps";
  return null;   // I.A., domínio, assinatura só deste sistema: não é da casa
}

/** O valor que foi copiado igual pra dentro de todo relatório em 2025 — é
 *  exatamente essa linha que o preço real vem substituir. Valor diferente do
 *  padrão significa infra dedicada deste sistema, com preço próprio. */
const PADRAO: Record<string, number> = {
  vercel: 109, banco: 136.25, backup: 440, resend: 109,
  whatsapp: 99, firewall: 125.35, proxies: 103.55, vps: 590,
};

/** Troca o valor de cada conta pelo que a Ana leu na fonte, mantendo o nome e a
 *  ordem do relatório.
 *
 *  Duas travas, para nunca estragar quem tem infra própria:
 *   1. a linha precisa estar com o valor padrão da casa;
 *   2. o relatório precisa ter UMA só linha daquele tipo (dois backups ou duas
 *      VPS = infra dedicada, e nenhuma delas é a conta compartilhada).
 *
 *  `campo` diz onde mora o valor quando a conta não usa `valor`/`obs`. */
export function comValorDaAna<T extends ContaLocal>(locais: T[], daAna: ContaAna[] | null): T[] {
  if (!daAna) return locais;

  const quantas = new Map<string, number>();
  for (const c of locais) {
    const k = contaDaCasa(c.id, c.nome, c.obs);
    if (k) quantas.set(k, (quantas.get(k) ?? 0) + 1);
  }

  return locais.map((c) => {
    const k = contaDaCasa(c.id, c.nome, c.obs);
    if (!k) return c;
    if ((quantas.get(k) ?? 0) > 1) return c;                  // infra própria deste sistema
    const padrao = PADRAO[k];
    if (padrao === undefined) return c;
    if (Math.abs(c.valor - padrao) > Math.max(0.5, padrao * 0.01)) return c;  // preço próprio
    const r = daAna.find((x) => x.id === k);
    return r ? { ...c, valor: r.valor, obs: r.obs, estimado: r.estimado } : c;
  });
}

/* ══ O ✓ DE PAGO TAMBÉM É DA ANA ══
   O checkbox de "paguei" vivia no localStorage: valia só naquele navegador e a
   Ana nunca ficava sabendo — ela seguia cobrando o que já tinha sido pago.
   Agora o estado é a conta dela: marcar aqui dá baixa lá, baixa dada lá acende
   o ✓ aqui. Um número só, nos dois lados. */

export type EstadoMes = { pago: boolean; pago_em: string | null; centavos: number; vencimento: string };
export type PagamentosAna = { custos: Record<string, EstadoMes>; dev: Record<string, EstadoMes> };

const SEM_ANA: PagamentosAna = { custos: {}, dev: {} };

export async function pagamentosDaAna(projeto: string): Promise<PagamentosAna> {
  const token = process.env.ANA_CUSTOS_TOKEN;
  if (!token) return SEM_ANA;
  try {
    const r = await fetch(`${ANA}/api/custos-pagamentos?projeto=${encodeURIComponent(projeto)}&t=${token}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return SEM_ANA;
    const d = await r.json();
    return d?.ok ? { custos: d.custos ?? {}, dev: d.dev ?? {} } : SEM_ANA;
  } catch {
    return SEM_ANA;   // Ana fora do ar não pode derrubar o relatório
  }
}

/** Dá (ou tira) a baixa do mês na Ana. Devolve o estado novo, ou null se não deu. */
export async function marcarNaAna(
  projeto: string, tipo: "custos" | "dev", mes: string, pago: boolean,
): Promise<PagamentosAna | null> {
  const token = process.env.ANA_CUSTOS_TOKEN;
  if (!token) return null;
  try {
    const r = await fetch(`${ANA}/api/custos-pagamentos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projeto, tipo, mes, pago, t: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.ok ? { custos: d.custos ?? {}, dev: d.dev ?? {} } : null;
  } catch {
    return null;
  }
}
