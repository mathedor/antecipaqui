import crypto from "node:crypto";

/**
 * Verificação de assinatura HMAC de webhook — em tempo constante.
 *
 * Comparar assinatura com `a === b` vaza, pelo relógio, quantos caracteres
 * batem: um atacante consegue forjar byte a byte. crypto.timingSafeEqual
 * fecha esse canal. Aceita o HMAC puro ou com prefixo "sha256=".
 */
export function verificarAssinaturaHmac(
  segredo: string,
  corpoCru: string,
  assinaturaRecebida: string | null,
): boolean {
  if (!segredo || !assinaturaRecebida) return false;

  const limpa = assinaturaRecebida.startsWith("sha256=")
    ? assinaturaRecebida.slice("sha256=".length)
    : assinaturaRecebida;

  const esperada = crypto
    .createHmac("sha256", segredo)
    .update(corpoCru, "utf8")
    .digest("hex");

  const a = Buffer.from(esperada);
  const b = Buffer.from(limpa);
  // Tamanhos diferentes já reprovam — e timingSafeEqual exige mesmo tamanho.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
