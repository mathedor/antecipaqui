/** Cálculos canônicos do modelo de negócio Antecipaqui.
 *
 *  A AQ é a tecnologia que viabiliza a operação — não emprestadora.
 *  O fundo coloca o capital e cobra um custo (taxa mensal). A operação
 *  cobra uma taxa maior do cedente. O spread em pontos % é dividido 50/50
 *  entre AQ e fundo:
 *
 *    custos                = receita 100% AQ (operação, contrato, lead)
 *    custo_dinheiro_fundo  = juros × (taxa_fundo / taxa_op)
 *    spread                = max(0, juros − custo_dinheiro_fundo)
 *    resultado_op_AQ       = custos + spread / 2   (sempre ≥ 0)
 *    parte_fundo_op        = custo_dinheiro + spread / 2
 *
 *  Pra Invoice (repasse devido pelo fundo no mês), proporcional ao % pago:
 *    saldo_invoice_op_mes  = resultado_op_AQ × (pago_no_periodo / valor_comissao)
 *
 *  Garantia: spread e repasse nunca negativos. Se taxa_fundo ≥ taxa_op
 *  (anomalia de cadastro), spread = 0 e a AQ ainda ganha os custos.
 *
 *  Convenções:
 *  - `juros`            = operacoes.desagio
 *  - `custos`           = SUM(custos_operacao.valor)
 *  - `taxaMensalOp`     = operacoes.taxa_mensal (decimal 0–1 ao mês)
 *  - `taxaMensalFundo`  = fundos.taxa_mensal_base (decimal 0–1 ao mês)
 *  - `valorComissao`    = operacoes.valor_comissao
 */

export type CustoDinheiroInputs = {
  juros: number;
  taxaMensalOp: number;
  taxaMensalFundo: number;
};

export type SpreadInputs = CustoDinheiroInputs;

export type ResultadoOpInputs = SpreadInputs & {
  custos: number;
};

export type RepasseInvoiceInputs = {
  resultadoOpAQ: number;
  valorPagoNoPeriodo: number;
  valorComissao: number;
};

/** Custo de capital do fundo na operação, em R$.
 *  Proporcional à razão entre a taxa do fundo e a taxa da operação. */
export function calcCustoDinheiroFundo(i: CustoDinheiroInputs): number {
  if (i.taxaMensalOp <= 0) return 0;
  const razao = Math.min(1, i.taxaMensalFundo / i.taxaMensalOp);
  return i.juros * razao;
}

/** Spread bruto = juros − custo do dinheiro do fundo. Clampado em 0 pra
 *  casos anômalos (taxa_fundo > taxa_op). */
export function calcSpread(i: SpreadInputs): number {
  return Math.max(0, i.juros - calcCustoDinheiroFundo(i));
}

/** Resultado da operação, do ponto de vista da AQ.
 *  AQ fica com 100% dos custos + metade do spread. Sempre ≥ 0. */
export function calcResultadoOperacao(i: ResultadoOpInputs): number {
  return Math.max(0, i.custos) + calcSpread(i) / 2;
}

/** Parte do fundo na operação = custo do dinheiro + metade do spread.
 *  Sempre ≥ 0. */
export function calcParteFundo(i: SpreadInputs): number {
  const custoDinheiro = calcCustoDinheiroFundo(i);
  const spread = calcSpread(i);
  return custoDinheiro + spread / 2;
}

/** Repasse devido pelo fundo no período, proporcional ao % pago.
 *  Sempre ≥ 0. */
export function calcRepasseInvoice(i: RepasseInvoiceInputs): number {
  if (i.valorComissao <= 0) return 0;
  const pctPago = Math.max(0, i.valorPagoNoPeriodo / i.valorComissao);
  return Math.max(0, i.resultadoOpAQ * pctPago);
}
