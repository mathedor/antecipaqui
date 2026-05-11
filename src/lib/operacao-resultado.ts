/** Cálculos canônicos de "resultado da operação" e derivados.
 *
 *  Convenções:
 *  - `juros`  = operacoes.desagio (já é o ganho bruto da antecipação).
 *  - `custos` = SUM(custos_operacao.valor) da operação.
 *  - `prazoMeses` = operacoes.numero_parcelas (prazo cheio — capital fica
 *    emprestado por todo o período; aproximação conservadora).
 *  - `taxaMensalFundo` = fundos.taxa_mensal_base (decimal 0–1 ao mês).
 */

export type ResultadoInputs = {
  /** Juros brutos (desagio) em R$. */
  juros: number;
  /** Soma dos custos cadastrados na operação em R$. */
  custos: number;
};

export type SaldoInvoiceInputs = ResultadoInputs & {
  valorPresente: number;
  /** Decimal 0–1 ao mês. Ex: 0.025 = 2,5% a.m. */
  taxaMensalFundo: number;
  prazoMeses: number;
};

export function calcResultadoOperacao(i: ResultadoInputs): number {
  return i.juros - i.custos;
}

export function calcCustoDinheiroFundo(
  valorPresente: number,
  taxaMensalFundo: number,
  prazoMeses: number,
): number {
  return valorPresente * taxaMensalFundo * prazoMeses;
}

/** Saldo a repassar ao fundo no Invoice — split 50/50 após pagar o custo de
 *  capital do fundo. Pode dar negativo (fundo "deve" pra Antecipaqui) se o
 *  custo do dinheiro engolir o resultado. */
export function calcSaldoInvoice(i: SaldoInvoiceInputs): number {
  const resultado = calcResultadoOperacao(i);
  const custoDinheiro = calcCustoDinheiroFundo(
    i.valorPresente,
    i.taxaMensalFundo,
    i.prazoMeses,
  );
  return (resultado - custoDinheiro) / 2;
}
