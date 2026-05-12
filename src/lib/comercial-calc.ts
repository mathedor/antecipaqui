/**
 * Cálculos de lucro do comercial — sync helpers fora do server actions.
 *
 * Comissão = ~10% do lucro líquido da operação.
 * lucro_op = (resultado / 2) × (1 − 18% imposto)
 * resultado = juros (deságio) − custos cadastrados na operação
 */

export const COMERCIAL_PCT = 0.1;
export const IMPOSTO_PCT = 0.18;
export const CIA_SHARE = 0.5;

export function calcLucroOperacao(resultado: number) {
  const lucroBruto = resultado * CIA_SHARE;
  return lucroBruto * (1 - IMPOSTO_PCT);
}

export function calcComissaoComercial(resultado: number) {
  return calcLucroOperacao(resultado) * COMERCIAL_PCT;
}
