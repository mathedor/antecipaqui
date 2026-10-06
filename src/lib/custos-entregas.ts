/* ─────────────────────────────────────────────────────────────────────────────
   O DESENVOLVIMENTO DO MÊS = O ARQUIVO + O QUE A ANA ENTREGOU

   `DESENVOLVIMENTO` (custos-data.ts) é escrito à mão e a Ana lê ele do GitHub
   do jeito que está — por isso a junção mora aqui, fora do arquivo de dados.
   É a MESMA conta que a página desenha e que a conferência roda.

   · tarefa da Ana → entra no desenvolvimento do mês dela, precificada pelo tier
     exatamente como uma entrega escrita à mão daquele tier naquele mês (a
     margem de set/2026 incluída). A Ana soma igualzinho no dev do mês dela,
     então o total daqui bate com o de lá e o "marcar mês como pago" cobre.
   · pedido da Ana → fatura própria, cobrada de quem pediu. Fica fora do mês
     (nem total, nem baixa): só aparece no bloco "Pedidos pela Ana".
   ───────────────────────────────────────────────────────────────────────────── */

import { DESENVOLVIMENTO, TIERS, labelMes, type DevEntry, type Tier } from "./custos-data";
import type { EntregaDaAna, PagamentosAna, SaldoAna } from "./custosAna";

/** Uma linha do desenvolvimento do mês, com a chave do ✓/ajuste de valor. */
export type LinhaDev = DevEntry & {
  /** `dev:<mês>#<i>` pras escritas à mão (o índice no arquivo, como sempre
   *  foi — marcação antiga continua no lugar); `dev:<mês>#ana:<ref>` pra Ana */
  id: string;
  ana?: true;
};

export type PedidoDaAna = {
  id: string;
  numero: string;
  /** dd/mm */
  data: string;
  titulo: string;
  desc: string;
  quem: string | null;
  valor: number;
  tokens: number;
  pago: boolean;
};

/** "2026-09-11" → "11/09" (o formato das entregas escritas à mão) */
const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const diaDe = (data: string) => Number(data.slice(0, 2)) || 0;

/** Desenvolvimento do mês: o que está no arquivo + as tarefas da Ana daquele
 *  mês. Com tarefa da Ana misturada, o mês fica em ordem de data (mais nova em
 *  cima); sem ela, a ordem do arquivo continua a mesma de sempre. */
export function devDoMesComAna(mes: string, entregas: EntregaDaAna[]): LinhaDev[] {
  const linhas: LinhaDev[] = (DESENVOLVIMENTO[mes] ?? []).map((e, i) => ({ ...e, id: `dev:${mes}#${i}` }));
  const daAna = entregas.filter((e) => e.tipo === "tarefa" && e.dia.slice(0, 7) === mes);
  if (!daAna.length) return linhas;
  for (const e of daAna) {
    const tier: Tier = e.tier in TIERS ? e.tier : "P";
    linhas.push({
      id: `dev:${mes}#ana:${e.ref}`,
      data: ddmm(e.dia),
      titulo: e.titulo,
      desc: e.descricao,
      tier,
      ana: true,
    });
  }
  return linhas.sort((a, b) => diaDe(b.data) - diaDe(a.data));
}

/** Pedidos entregues pela Ana, por mês (AAAA-MM), mais novo em cima. */
export function pedidosDaAnaPorMes(entregas: EntregaDaAna[]): Record<string, PedidoDaAna[]> {
  const out: Record<string, PedidoDaAna[]> = {};
  for (const e of entregas) {
    if (e.tipo !== "pedido") continue;
    (out[e.dia.slice(0, 7)] ??= []).push({
      id: `ped:${e.ref}`,
      numero: e.ref.split(":")[1] ?? "",
      data: ddmm(e.dia),
      titulo: e.titulo,
      desc: e.descricao,
      quem: e.quem,
      valor: (e.valor_centavos ?? 0) / 100,
      tokens: Math.round(e.tokens_milhoes * 1_000_000),
      pago: e.pago,
    });
  }
  for (const lista of Object.values(out)) lista.sort((a, b) => diaDe(b.data) - diaDe(a.data));
  return out;
}

/* ── saldos (06/10/2026) ──
   Mês pago que mudou depois vira saldo no próximo mês em aberto (a Ana
   calcula). Aqui ele aparece duas vezes: como linha no mês de DESTINO (soma
   no total, no % pago e no KPI do mês) e como nota no mês de ORIGEM — cujo
   total continua o do relatório. O pago é o da Ana, só leitura: ela dá baixa
   no saldo junto com o mês de destino. */

/** Evento da página quando a Ana devolve o estado novo (baixa dada no painel ou
 *  no quadro de pagamentos) — os dois redesenham com o mesmo número. */
export const EVENTO_PAGAMENTOS = "antecipaqui:pagamentos-ana";

export function avisarPagamentos(estado: PagamentosAna) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENTO_PAGAMENTOS, { detail: estado }));
}

export type LinhaSaldo = { id: string; titulo: string; desc: string; valor: number; pago: boolean };

const reais = (centavos: number) =>
  (Math.abs(centavos) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Linhas de saldo que caem neste mês (destino), do tipo pedido. */
export function saldosNoMes(saldos: SaldoAna[], tipo: "dev" | "custos", mes: string): LinhaSaldo[] {
  return saldos
    .filter((s) => s.tipo === tipo && s.destino === mes && s.centavos !== 0)
    .map((s) => ({
      id: `saldo:${s.ref}`,
      titulo: `Saldo de ${labelMes(s.origem)}`,
      desc: s.centavos < 0
        ? `crédito: ${labelMes(s.origem)} pago acima do valor real`
        : tipo === "dev"
          ? `entregas de ${labelMes(s.origem)} registradas depois do pagamento`
          : `${labelMes(s.origem)} pago abaixo do custo real`,
      valor: s.centavos / 100,
      pago: s.pago,
    }));
}

/** Notas do mês de origem: pra onde foi a diferença. */
export function notasDaOrigem(saldos: SaldoAna[], tipo: "dev" | "custos", mes: string): string[] {
  return saldos
    .filter((s) => s.tipo === tipo && s.origem === mes && s.centavos !== 0)
    .map((s) => s.centavos < 0
      ? `pago ${reais(s.centavos)} acima do real → crédito em ${labelMes(s.destino)}`
      : tipo === "dev"
        ? `${reais(s.centavos)} entrou depois do pagamento → saldo em ${labelMes(s.destino)}`
        : `pago ${reais(s.centavos)} abaixo do real → saldo em ${labelMes(s.destino)}`);
}
