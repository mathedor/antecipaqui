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

type ContaLocal = { id: string; nome: string; valor: number; obs?: string; estimado?: boolean };

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

/** Troca o valor de cada conta pelo que a Ana leu na fonte, mantendo o nome e a
 *  ordem do relatório. Conta que a Ana não conhece (uma assinatura só deste
 *  sistema, a I.A. dele) fica exatamente como está. */
export function comValorDaAna<T extends ContaLocal>(locais: T[], daAna: ContaAna[] | null): T[] {
  if (!daAna) return locais;
  return locais.map((c) => {
    const r = daAna.find((x) => x.id === c.id);
    return r ? { ...c, valor: r.valor, obs: r.obs, estimado: r.estimado } : c;
  });
}
