"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, desc } from "drizzle-orm";
import { db } from "@/db";
import { fundoApiKeys, type FundoApiKey } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getCurrentFundo } from "@/lib/actions/fundos";
import { generateApiKey } from "@/lib/external-api-auth";
import { audit } from "@/lib/audit";

export type ApiKeyListItem = Omit<FundoApiKey, "tokenHash">;

/** Lista todas as keys do fundo atual (não retorna o hash). */
export async function listApiKeys(): Promise<ApiKeyListItem[]> {
  const fundo = await getCurrentFundo();
  if (!fundo) return [];
  const rows = await db
    .select({
      id: fundoApiKeys.id,
      fundoId: fundoApiKeys.fundoId,
      nome: fundoApiKeys.nome,
      prefix: fundoApiKeys.prefix,
      escopo: fundoApiKeys.escopo,
      createdByUserId: fundoApiKeys.createdByUserId,
      createdAt: fundoApiKeys.createdAt,
      lastUsedAt: fundoApiKeys.lastUsedAt,
      revokedAt: fundoApiKeys.revokedAt,
    })
    .from(fundoApiKeys)
    .where(eq(fundoApiKeys.fundoId, fundo.id))
    .orderBy(desc(fundoApiKeys.createdAt));
  return rows;
}

export type CriarKeyState =
  | { ok: false; error: string }
  | {
      ok: true;
      token: string; // plaintext — só aparece uma vez
      prefix: string;
      keyId: string;
    }
  | null;

/** Cria nova key. Retorna o token plaintext UMA vez. */
export async function criarApiKeyAction(
  _prev: CriarKeyState,
  formData: FormData,
): Promise<CriarKeyState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo")
    return { ok: false, error: "Não autorizado" };
  const fundo = await getCurrentFundo();
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const nome = String(formData.get("nome") || "").trim().slice(0, 80);
  const escopoRaw = String(formData.get("escopo") || "read_only").trim();
  if (!nome) return { ok: false, error: "Dê um nome pra essa key" };
  if (escopoRaw !== "read_only" && escopoRaw !== "read_write") {
    return { ok: false, error: "Escopo inválido" };
  }

  // Limita quantidade de keys ativas por fundo
  const ativas = await db
    .select({ id: fundoApiKeys.id })
    .from(fundoApiKeys)
    .where(
      and(eq(fundoApiKeys.fundoId, fundo.id), isNull(fundoApiKeys.revokedAt)),
    );
  if (ativas.length >= 10) {
    return {
      ok: false,
      error: "Limite de 10 keys ativas atingido. Revogue alguma antes.",
    };
  }

  const { token, hash, prefix } = generateApiKey();

  const [inserted] = await db
    .insert(fundoApiKeys)
    .values({
      fundoId: fundo.id,
      nome,
      tokenHash: hash,
      prefix,
      escopo: escopoRaw,
      createdByUserId: user.id,
    })
    .returning({ id: fundoApiKeys.id });

  await audit({
    action: "fundo_api_key_criada",
    targetType: "fundo_api_key",
    targetId: inserted.id,
    targetLabel: nome,
    metadata: { fundoId: fundo.id, escopo: escopoRaw, prefix },
  });

  revalidatePath("/painel/api");
  return { ok: true, token, prefix, keyId: inserted.id };
}

export type RevogarKeyState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function revogarApiKeyAction(
  _prev: RevogarKeyState,
  formData: FormData,
): Promise<RevogarKeyState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo")
    return { ok: false, error: "Não autorizado" };
  const fundo = await getCurrentFundo();
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const keyId = String(formData.get("keyId") || "").trim();
  if (!keyId) return { ok: false, error: "keyId obrigatório" };

  const [key] = await db
    .select()
    .from(fundoApiKeys)
    .where(
      and(eq(fundoApiKeys.id, keyId), eq(fundoApiKeys.fundoId, fundo.id)),
    )
    .limit(1);
  if (!key) return { ok: false, error: "Key não encontrada" };
  if (key.revokedAt) return { ok: false, error: "Key já revogada" };

  await db
    .update(fundoApiKeys)
    .set({ revokedAt: new Date() })
    .where(eq(fundoApiKeys.id, keyId));

  await audit({
    action: "fundo_api_key_revogada",
    targetType: "fundo_api_key",
    targetId: keyId,
    targetLabel: key.nome,
    metadata: { fundoId: fundo.id, prefix: key.prefix },
  });

  revalidatePath("/painel/api");
  return { ok: true };
}
