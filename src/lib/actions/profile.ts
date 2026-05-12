"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  imobiliarias,
  construtoras,
  documentos,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { audit } from "@/lib/audit";
import { extractValidacao } from "@/lib/validacao-form";

export type EditProfileState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

type DocTipo = "contrato_social" | "comprovante_endereco" | "creci";

async function upsertDocumento(args: {
  tipo: DocTipo;
  url: string;
  nome: string;
  formData: FormData;
  nameBase: string;
  userId?: string | null;
  imobiliariaId?: string | null;
  construtoraId?: string | null;
}) {
  if (!args.url) return;
  if (args.userId) {
    await db
      .delete(documentos)
      .where(
        and(eq(documentos.userId, args.userId), eq(documentos.tipo, args.tipo)),
      );
  }
  if (args.imobiliariaId) {
    await db
      .delete(documentos)
      .where(
        and(
          eq(documentos.imobiliariaId, args.imobiliariaId),
          eq(documentos.tipo, args.tipo),
        ),
      );
  }
  if (args.construtoraId) {
    await db
      .delete(documentos)
      .where(
        and(
          eq(documentos.construtoraId, args.construtoraId),
          eq(documentos.tipo, args.tipo),
        ),
      );
  }
  const v = extractValidacao(args.formData, args.nameBase);
  await db.insert(documentos).values({
    tipo: args.tipo,
    url: args.url,
    nomeOriginal: args.nome,
    userId: args.userId ?? null,
    imobiliariaId: args.imobiliariaId ?? null,
    construtoraId: args.construtoraId ?? null,
    validacaoStatus: v.validacaoStatus,
    validacaoConfianca: v.validacaoConfianca,
    validacaoMotivo: v.validacaoMotivo,
  });
}

/**
 * Usuário edita o próprio cadastro (não admin).
 * Atualiza dados pessoais, empresa (imob/construtora), endereço, banco e docs.
 * Email e role NÃO são editáveis aqui (email vem do Clerk; role troca só admin).
 */
export async function editProfileAction(
  _prev: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const nome = String(formData.get("nome") || "").trim() || null;
  const telefoneRaw = String(formData.get("telefone") || "").trim();
  const telefone = telefoneRaw.replace(/\D/g, "") || null;

  if (!nome) return { ok: false, error: "Nome é obrigatório" };
  if (!telefone) return { ok: false, error: "Telefone é obrigatório" };

  await db
    .update(users)
    .set({ nome, telefone, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Empresa (imobiliária ou construtora)
  let imobiliariaId: string | null = null;
  let construtoraId: string | null = null;

  if (user.role === "corretor" || user.role === "imobiliaria") {
    const razaoSocial = String(formData.get("razaoSocial") || "").trim();
    if (razaoSocial) {
      const cnpj = unmaskCNPJ(String(formData.get("cnpj") || ""));
      if (cnpj && !isValidCNPJ(cnpj)) {
        return { ok: false, error: "CNPJ inválido" };
      }
      const update = {
        razaoSocial,
        nomeFantasia:
          String(formData.get("nomeFantasia") || "").trim() || null,
        cnpj,
        creciResponsavel:
          String(formData.get("creci") || "").trim() || null,
        telefone,
        cep: String(formData.get("cep") || "").trim() || null,
        endereco: String(formData.get("endereco") || "").trim() || null,
        cidade: String(formData.get("cidade") || "").trim() || null,
        uf:
          String(formData.get("uf") || "").trim().toUpperCase() || null,
        bancoNome: String(formData.get("bancoNome") || "").trim() || null,
        bancoCodigo:
          String(formData.get("bancoCodigo") || "").trim() || null,
        bancoAgencia:
          String(formData.get("bancoAgencia") || "").trim() || null,
        bancoConta: String(formData.get("bancoConta") || "").trim() || null,
        updatedAt: new Date(),
      };
      const existing = await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.ownerUserId, user.id))
        .limit(1);
      if (existing[0]) {
        await db
          .update(imobiliarias)
          .set(update)
          .where(eq(imobiliarias.id, existing[0].id));
        imobiliariaId = existing[0].id;
      }
    }
  } else if (user.role === "construtora") {
    const razaoSocial = String(formData.get("razaoSocial") || "").trim();
    if (razaoSocial) {
      const cnpj = unmaskCNPJ(String(formData.get("cnpj") || ""));
      if (cnpj && !isValidCNPJ(cnpj)) {
        return { ok: false, error: "CNPJ inválido" };
      }
      const update = {
        razaoSocial,
        nomeFantasia:
          String(formData.get("nomeFantasia") || "").trim() || null,
        cnpj,
        telefone,
        email: String(formData.get("email") || "").trim() || null,
        cep: String(formData.get("cep") || "").trim() || null,
        endereco: String(formData.get("endereco") || "").trim() || null,
        cidade: String(formData.get("cidade") || "").trim() || null,
        uf:
          String(formData.get("uf") || "").trim().toUpperCase() || null,
        updatedAt: new Date(),
      };
      const existing = await db
        .select()
        .from(construtoras)
        .where(eq(construtoras.ownerUserId, user.id))
        .limit(1);
      if (existing[0]) {
        await db
          .update(construtoras)
          .set(update)
          .where(eq(construtoras.id, existing[0].id));
        construtoraId = existing[0].id;
      }
    }
  }

  // Documentos KYC (se usuário enviou novos)
  const docs: { tipo: DocTipo; field: string }[] = [
    { tipo: "contrato_social", field: "doc_contrato_social" },
    { tipo: "comprovante_endereco", field: "doc_comprovante_endereco" },
  ];
  if (user.role === "corretor" || user.role === "imobiliaria") {
    docs.push({ tipo: "creci", field: "doc_creci" });
  }
  for (const d of docs) {
    const url = String(formData.get(d.field) || "").trim();
    if (!url) continue;
    const nome = String(formData.get(`${d.field}_nome`) || `${d.tipo}.pdf`);
    await upsertDocumento({
      tipo: d.tipo,
      url,
      nome,
      formData,
      nameBase: d.field,
      userId: user.id,
      imobiliariaId,
      construtoraId,
    });
  }

  audit({
    action: "self_edit_profile",
    targetType: "user",
    targetId: user.id,
    targetLabel: nome ?? user.email,
  }).catch(() => undefined);

  revalidatePath("/painel/perfil");
  revalidatePath("/painel");
  return { ok: true };
}
