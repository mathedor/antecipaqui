/**
 * DESBLOQUEIO DE DOCUMENTOS (step-up por senha do próprio usuário).
 *
 * O proxy de arquivos (/api/blob) passa a exigir mais do que estar logado:
 * pra abrir/baixar documento, a pessoa confirma a senha de login dela. Isso
 * fecha o vetor "sessão roubada baixa documento" — o cookie de sessão sozinho
 * não basta.
 *
 * O desbloqueio vira um cookie ASSINADO (HMAC) atrelado ao userId, com
 * validade curta (8h). Ninguém reaproveita o cookie de outro: a assinatura
 * amarra ao dono, e o proxy confere contra o usuário logado do momento.
 */
import crypto from "node:crypto";

export const DOC_UNLOCK_COOKIE = "doc_unlock";
const VALIDADE_MS = 8 * 60 * 60 * 1000; // 8h
const CLERK_API = "https://api.clerk.com/v1";

/** Segredo de assinatura do cookie. Dedicado se existir; senão usa a chave
 *  do Clerk (sempre presente) como material — nunca vai pro cliente. */
function segredo(): string {
  return (
    process.env.DOC_UNLOCK_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "sem-segredo-configurado"
  );
}

function assinar(userId: string, expMs: number): string {
  return crypto
    .createHmac("sha256", segredo())
    .update(`${userId}.${expMs}`)
    .digest("hex");
}

/** Gera o valor do cookie de desbloqueio pra este usuário. */
export function emitirCookie(userId: string): {
  nome: string;
  valor: string;
  maxAgeSeg: number;
} {
  const expMs = Date.now() + VALIDADE_MS;
  const valor = `${expMs}.${assinar(userId, expMs)}`;
  return { nome: DOC_UNLOCK_COOKIE, valor, maxAgeSeg: Math.floor(VALIDADE_MS / 1000) };
}

/** Confere se o cookie desbloqueia PARA ESTE usuário e ainda vale. */
export function cookieValido(
  valorCookie: string | undefined,
  userId: string,
): boolean {
  if (!valorCookie) return false;
  const [expStr, hmac] = valorCookie.split(".");
  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return false;
  const esperado = assinar(userId, expMs);
  const a = Buffer.from(hmac ?? "");
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Confere a senha do usuário no Clerk (verify_password da Backend API). */
export async function conferirSenhaClerk(
  clerkUserId: string,
  senha: string,
): Promise<boolean> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key || !senha) return false;
  try {
    const res = await fetch(`${CLERK_API}/users/${clerkUserId}/verify_password`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ password: senha }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const json = (await res.json().catch(() => ({}))) as { verified?: boolean };
    return json.verified === true;
  } catch {
    return false;
  }
}
