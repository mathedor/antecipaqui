/** Formatadores brasileiros pra moeda, percentuais e datas. */

export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const BRLcompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatBRL(v: number) {
  return BRL.format(v);
}
export function formatBRLcompact(v: number) {
  return BRLcompact.format(v);
}

export function formatPercent(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(v);
}

/**
 * Calcula o valor presente líquido de uma operação parcelada.
 * Cada parcela é trazida a valor presente usando juros compostos mensais.
 *
 * @param parcelas Lista de parcelas { valor, mesesAteVencimento }
 * @param taxaMensal Taxa mensal em decimal (ex: 0.06 = 6%)
 */
export function valorPresente(
  parcelas: { valor: number; mesesAteVencimento: number }[],
  taxaMensal: number,
): number {
  return parcelas.reduce(
    (acc, p) => acc + p.valor / Math.pow(1 + taxaMensal, p.mesesAteVencimento),
    0,
  );
}

/**
 * Helper simples pra cenário comum: parcelas iguais distribuídas mensalmente.
 */
export function valorPresenteParcelasIguais(
  total: number,
  numeroParcelas: number,
  taxaMensal: number,
): number {
  if (numeroParcelas <= 0) return 0;
  const valorParcela = total / numeroParcelas;
  let vp = 0;
  for (let i = 1; i <= numeroParcelas; i++) {
    vp += valorParcela / Math.pow(1 + taxaMensal, i);
  }
  return vp;
}
