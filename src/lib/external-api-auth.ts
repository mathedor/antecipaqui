import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundoApiKeys, fundos, type Fundo, type FundoApiKey } from "@/db/schema";

const TOKEN_PREFIX = "aq_";
const TOKEN_BYTES = 24; // 32 chars base64-ish

export type ApiKeyEscopo = "read_only" | "read_write";

export type AuthedRequest = {
  fundo: Fundo;
  apiKey: FundoApiKey;
};

/** Gera um novo token plaintext. Só aparece uma vez. */
export function generateApiKey(): { token: string; hash: string; prefix: string } {
  const raw = randomBytes(TOKEN_BYTES)
    .toString("base64url")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 32);
  const token = `${TOKEN_PREFIX}${raw}`;
  const hash = createHash("sha256").update(token).digest("hex");
  const prefix = token.slice(0, 11); // "aq_" + 8 chars
  return { token, hash, prefix };
}

/** Hash de um token recebido (pra busca no banco). */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Extrai e valida o Bearer token do header de Authorization. */
function extractBearer(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const token = m[1].trim();
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  return token;
}

/** Valida token e retorna fundo + apiKey. Atualiza lastUsedAt. */
export async function authenticate(req: Request): Promise<AuthedRequest | null> {
  const token = extractBearer(req);
  if (!token) return null;
  const hash = hashToken(token);

  const [key] = await db
    .select()
    .from(fundoApiKeys)
    .where(eq(fundoApiKeys.tokenHash, hash))
    .limit(1);
  if (!key) return null;
  if (key.revokedAt) return null;

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, key.fundoId))
    .limit(1);
  if (!fundo || !fundo.isActive) return null;

  // Atualiza lastUsedAt fire-and-forget (não bloqueia request)
  void db
    .update(fundoApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(fundoApiKeys.id, key.id))
    .catch(() => {});

  return { fundo, apiKey: key };
}

/** Resposta JSON padrão de erro. */
export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json(
    { error: message, code: "unauthorized" },
    { status: 401 },
  );
}

export function forbiddenResponse(message = "Forbidden") {
  return Response.json({ error: message, code: "forbidden" }, { status: 403 });
}

export function notFoundResponse(message = "Not found") {
  return Response.json({ error: message, code: "not_found" }, { status: 404 });
}

export function badRequestResponse(message: string) {
  return Response.json({ error: message, code: "bad_request" }, { status: 400 });
}

export function requireScope(
  ctx: AuthedRequest,
  scope: ApiKeyEscopo,
): Response | null {
  if (scope === "read_only") return null; // qualquer key passa
  if (ctx.apiKey.escopo !== "read_write")
    return forbiddenResponse("API key sem permissão de escrita");
  return null;
}
