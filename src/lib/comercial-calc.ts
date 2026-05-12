/** Cálculos de comissão do comercial — sync helpers fora do server actions.
 *
 *  A comissão do comercial é calculada SÓ sobre o spread/2 (a parte da AQ
 *  no spread), depois de impostos. Custos da operação não entram — são
 *  receita de serviço, não margem financeira.
 *
 *  spread        = juros (desagio) − custo_dinheiro_fundo
 *  lucro_aq_op   = spread / 2     (metade do spread fica com a AQ)
 *  lucro_liquido = lucro_aq_op × (1 − 0,18 imposto)
 *  comissao      = lucro_liquido × 0,10
 */

export const COMERCIAL_PCT = 0.1;
export const IMPOSTO_PCT = 0.18;
export const CIA_SHARE = 0.5;

/** Lucro líquido da AQ sobre o spread (pós-imposto). Recebe o spread bruto. */
export function calcLucroOperacao(spread: number) {
  const lucroBruto = spread * CIA_SHARE;
  return lucroBruto * (1 - IMPOSTO_PCT);
}

/** Comissão do comercial = 10% do lucro líquido da AQ no spread. */
export function calcComissaoComercial(spread: number) {
  return calcLucroOperacao(spread) * COMERCIAL_PCT;
}
