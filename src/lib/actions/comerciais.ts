"use server";

import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { comerciais, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ, isValidCPF, unmaskCPF } from "@/lib/cnpj";
import { audit } from "@/lib/audit";

export type CadastrarComercialState =
  | { ok: false; error: string }
  | { ok: true; comercialId: string }
  | null;

/**
 * Admin cadastra um comercial (PF ou PJ).
 * Cria invitation Clerk + user placeholder + comercial row.
 *
 * Quando o comercial aceita o convite e faz primeiro login,
 * getCurrentDbUser detecta a publicMetadata.role='comercial' + comercialId
 * e vincula o user real ao comercial (similar ao fluxo de fundo).
 */
export async function cadastrarComercialAction(
  _prev: CadastrarComercialState,
  formData: FormData,
): Promise<CadastrarComercialState> {
  await requireAdmin();

  const tipoPessoa = String(formData.get("tipoPessoa") || "").trim();
  if (tipoPessoa !== "fisica" && tipoPessoa !== "juridica") {
    return { ok: false, error: "Selecione PF ou PJ" };
  }

  const nomeCompleto = String(formData.get("nomeCompleto") || "").trim();
  const apelido = String(formData.get("apelido") || "").trim() || null;
  const documentoRaw = String(formData.get("documento") || "");
  const cep = String(formData.get("cep") || "").trim() || null;
  const endereco = String(formData.get("endereco") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;
  const uf = String(formData.get("uf") || "").trim().toUpperCase() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const telefone =
    String(formData.get("telefone") || "").replace(/\D/g, "") || null;

  // Validações
  if (!nomeCompleto)
    return {
      ok: false,
      error: tipoPessoa === "fisica"
        ? "Nome completo é obrigatório"
        : "Razão social é obrigatória",
    };
  if (!email || !email.includes("@"))
    return { ok: false, error: "Email inválido" };

  let documento: string;
  if (tipoPessoa === "fisica") {
    documento = unmaskCPF(documentoRaw);
    if (!isValidCPF(documento))
      return { ok: false, error: "CPF inválido" };
  } else {
    documento = unmaskCNPJ(documentoRaw);
    if (!isValidCNPJ(documento))
      return { ok: false, error: "CNPJ inválido" };
  }

  // Verifica duplicata por documento
  const existingDoc = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.documento, documento))
    .limit(1);
  if (existingDoc[0]) {
    return {
      ok: false,
      error: `Já existe comercial cadastrado com esse ${tipoPessoa === "fisica" ? "CPF" : "CNPJ"} (${existingDoc[0].nomeCompleto}).`,
    };
  }

  // Verifica/cria user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;
  if (existingUser[0]) {
    // Atualiza role pra comercial se já existe
    userId = existingUser[0].id;
    await db
      .update(users)
      .set({
        role: "comercial" as never,
        nome: nomeCompleto,
        telefone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } else {
    // Cria invitation Clerk
    let inviteId: string;
    try {
      const clerk = await clerkClient();
      const inv = await clerk.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: { role: "comercial" },
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/painel`,
      });
      inviteId = inv.id;
    } catch (e) {
      return {
        ok: false,
        error: "Erro ao criar convite no Clerk: " + (e as Error).message,
      };
    }

    // Cria user placeholder. Será sincronizado quando comercial logar.
    userId = `invited_${inviteId}`;
    await db.insert(users).values({
      id: userId,
      email,
      nome: nomeCompleto,
      telefone,
      role: "comercial" as never,
      onboardingStatus: "aprovado",
      isActive: true,
    });
  }

  // Cria comercial vinculado
  const [created] = await db
    .insert(comerciais)
    .values({
      ownerUserId: userId,
      tipoPessoa: tipoPessoa as "fisica" | "juridica",
      nomeCompleto,
      apelido,
      documento,
      cep,
      endereco,
      cidade,
      uf,
      email,
      telefone,
    })
    .returning({ id: comerciais.id });

  audit({
    action: "admin_cadastrou_comercial",
    targetType: "comercial",
    targetId: created.id,
    targetLabel: nomeCompleto,
    metadata: { tipoPessoa, email, documento, userId },
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
  revalidatePath("/admin/cadastrar");
  return { ok: true, comercialId: created.id };
}

export async function editComercialAction(
  _prev: CadastrarComercialState,
  formData: FormData,
): Promise<CadastrarComercialState> {
  await requireAdmin();

  const comercialId = String(formData.get("comercialId") || "").trim();
  if (!comercialId) return { ok: false, error: "ID inválido" };

  const tipoPessoa = String(formData.get("tipoPessoa") || "").trim();
  if (tipoPessoa !== "fisica" && tipoPessoa !== "juridica")
    return { ok: false, error: "Tipo de pessoa inválido" };

  const documentoRaw = String(formData.get("documento") || "");
  let documento: string;
  if (tipoPessoa === "fisica") {
    documento = unmaskCPF(documentoRaw);
    if (!isValidCPF(documento))
      return { ok: false, error: "CPF inválido" };
  } else {
    documento = unmaskCNPJ(documentoRaw);
    if (!isValidCNPJ(documento))
      return { ok: false, error: "CNPJ inválido" };
  }

  await db
    .update(comerciais)
    .set({
      tipoPessoa: tipoPessoa as "fisica" | "juridica",
      nomeCompleto: String(formData.get("nomeCompleto") || "").trim(),
      apelido: String(formData.get("apelido") || "").trim() || null,
      documento,
      cep: String(formData.get("cep") || "").trim() || null,
      endereco: String(formData.get("endereco") || "").trim() || null,
      cidade: String(formData.get("cidade") || "").trim() || null,
      uf: String(formData.get("uf") || "").trim().toUpperCase() || null,
      email: String(formData.get("email") || "").trim().toLowerCase(),
      telefone:
        String(formData.get("telefone") || "").replace(/\D/g, "") || null,
      updatedAt: new Date(),
    })
    .where(eq(comerciais.id, comercialId));

  audit({
    action: "update_comercial",
    targetType: "comercial",
    targetId: comercialId,
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
  revalidatePath(`/admin/comerciais/${comercialId}`);
  return { ok: true, comercialId };
}

export async function deleteComercialAction(comercialId: string) {
  await requireAdmin();
  const [c] = await db
    .select({ id: comerciais.id, nomeCompleto: comerciais.nomeCompleto, ownerUserId: comerciais.ownerUserId })
    .from(comerciais)
    .where(eq(comerciais.id, comercialId))
    .limit(1);
  if (!c) throw new Error("Comercial não encontrado");

  await db.delete(comerciais).where(eq(comerciais.id, comercialId));

  // Tenta deletar o user vinculado (best-effort)
  if (c.ownerUserId) {
    await db
      .delete(users)
      .where(eq(users.id, c.ownerUserId))
      .catch(() => undefined);
    if (!c.ownerUserId.startsWith("invited_")) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(c.ownerUserId);
      } catch (e) {
        console.error("[delete-comercial] Clerk:", e);
      }
    }
  }

  audit({
    action: "delete_comercial",
    targetType: "comercial",
    targetId: comercialId,
    targetLabel: c.nomeCompleto,
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
}

/* =========================================
   QUERIES
   ========================================= */

export async function listAllComerciais() {
  return db.select().from(comerciais).orderBy(desc(comerciais.createdAt));
}

export async function getComercialDetail(comercialId: string) {
  const [c] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.id, comercialId))
    .limit(1);
  if (!c) return null;

  const owner = c.ownerUserId
    ? (
        await db
          .select()
          .from(users)
          .where(eq(users.id, c.ownerUserId))
          .limit(1)
      )[0] ?? null
    : null;

  return { comercial: c, owner };
}

/**
 * Retorna o ID do comercial "Antecipaqui" (default fallback).
 * Cacheado em memória dentro do request.
 */
let _defaultCache: string | null = null;
export async function getDefaultComercialId(): Promise<string | null> {
  if (_defaultCache) return _defaultCache;
  const [c] = await db
    .select({ id: comerciais.id })
    .from(comerciais)
    .where(eq(comerciais.documento, "32708702000110"))
    .limit(1);
  _defaultCache = c?.id ?? null;
  return _defaultCache;
}

/** Lista comerciais ativos pra dropdown / selector. */
export async function listComerciaisForSelector() {
  return db
    .select({
      id: comerciais.id,
      nomeCompleto: comerciais.nomeCompleto,
      apelido: comerciais.apelido,
      documento: comerciais.documento,
      tipoPessoa: comerciais.tipoPessoa,
    })
    .from(comerciais)
    .where(eq(comerciais.isActive, true))
    .orderBy(comerciais.nomeCompleto);
}

export async function getCurrentComercial() {
  const { getCurrentDbUser } = await import("@/lib/auth-user");
  const user = await getCurrentDbUser();
  if (!user || user.role !== "comercial") return null;
  const [c] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.ownerUserId, user.id))
    .limit(1);
  return c ?? null;
}
