/**
 * Cálculos de lucro do comercial — sync helpers fora do server actions.
 *
 * Comissão = ~10% do lucro líquido da operação.
 * lucro_op = (juros / 2) - 18% impostos sobre esse resultado
 */

export const COMERCIAL_PCT = 0.1;
export const IMPOSTO_PCT = 0.18;
export const CIA_SHARE = 0.5;

export function calcLucroOperacao(juros: number) {
  const lucroBruto = juros * CIA_SHARE;
  return lucroBruto * (1 - IMPOSTO_PCT);
}

export function calcComissaoComercial(juros: number) {
  return calcLucroOperacao(juros) * COMERCIAL_PCT;
}
