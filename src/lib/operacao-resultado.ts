/** Cálculos canônicos do modelo de negócio Antecipaqui.
 *
 *  A AQ é a tecnologia que viabiliza a operação — não emprestadora.
 *  O fundo é quem coloca o dinheiro e cobra um custo de capital. A operação
 *  gera juros e custos, e a margem é dividida assim:
 *
 *    custos                = receita 100% AQ (operação, contrato, lead)
 *    custo_dinheiro_fundo  = VP × taxa_mensal_fundo × prazo_meses
 *    spread                = juros − custo_dinheiro_fundo
 *    resultado_op_AQ       = custos + spread/2      ← o que AQ ganha na op
 *    parte_fundo_op        = custo_dinheiro + spread/2
 *
 *  Pra Invoice (repasse devido pelo fundo no mês), proporcional às parcelas
 *  pagas no período:
 *
 *    saldo_invoice_op_mes  = resultado_op_AQ × (pago_no_periodo / valor_comissao)
 *
 *  Convenções:
 *  - `juros`         = operacoes.desagio
 *  - `custos`        = SUM(custos_operacao.valor)
 *  - `valorPresente` = operacoes.valor_presente
 *  - `taxaMensalFundo` = fundos.taxa_mensal_base (decimal 0–1 ao mês)
 *  - `prazoMeses`    = operacoes.numero_parcelas
 *  - `valorComissao` = operacoes.valor_comissao
 */

export type CustoDinheiroInputs = {
  valorPresente: number;
  taxaMensalFundo: number;
  prazoMeses: number;
};

export type SpreadInputs = CustoDinheiroInputs & {
  juros: number;
};

export type ResultadoOpInputs = SpreadInputs & {
  custos: number;
};

export type RepasseInvoiceInputs = {
  resultadoOpAQ: number;
  valorPagoNoPeriodo: number;
  valorComissao: number;
};

/** Custo de capital do fundo na operação (R$). */
export function calcCustoDinheiroFundo(i: CustoDinheiroInputs): number {
  return i.valorPresente * i.taxaMensalFundo * i.prazoMeses;
}

/** Spread bruto da operação = juros − custo do dinheiro do fundo. */
export function calcSpread(i: SpreadInputs): number {
  return i.juros - calcCustoDinheiroFundo(i);
}

/** Resultado da operação, do ponto de vista da AQ.
 *  AQ fica com 100% dos custos + metade do spread. */
export function calcResultadoOperacao(i: ResultadoOpInputs): number {
  return i.custos + calcSpread(i) / 2;
}

/** Parte do fundo na operação = custo do dinheiro + metade do spread. */
export function calcParteFundo(i: SpreadInputs): number {
  const custoDinheiro = calcCustoDinheiroFundo(i);
  const spread = i.juros - custoDinheiro;
  return custoDinheiro + spread / 2;
}

/** Repasse devido pelo fundo no período, proporcional ao % pago.
 *  Quando nada foi pago no período (valorPagoNoPeriodo=0) ou a op não tem
 *  valor_comissao (= 0), retorna 0. */
export function calcRepasseInvoice(i: RepasseInvoiceInputs): number {
  if (i.valorComissao <= 0) return 0;
  const pctPago = i.valorPagoNoPeriodo / i.valorComissao;
  return i.resultadoOpAQ * pctPago;
}
