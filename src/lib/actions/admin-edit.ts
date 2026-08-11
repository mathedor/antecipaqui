"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  documentos,
  imobiliarias,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { parseBRLNumber, valorPresente } from "@/lib/format";
import { getTaxaMensal } from "@/lib/actions/settings";
import { extractValidacao } from "@/lib/validacao-form";

type DocTipo = "contrato_social" | "comprovante_endereco" | "creci";

/** Persiste/substitui um documento KYC pra owner (user/imob/construtora). */
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
  // Remove versões anteriores do mesmo tipo pro mesmo owner
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

/* =============================================================
   USUÁRIO — editar
   ============================================================= */

export type EditUserState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function editUserAction(
  _prev: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  await requireAdmin();
  const userId = String(formData.get("userId") || "").trim();
  if (!userId) return { ok: false, error: "userId obrigatório" };

  const nome = String(formData.get("nome") || "").trim() || null;
  const telefoneRaw = String(formData.get("telefone") || "").trim();
  const telefone = telefoneRaw.replace(/\D/g, "") || null;
  const role = String(formData.get("role") || "").trim();

  if (!["corretor", "imobiliaria", "construtora"].includes(role))
    return { ok: false, error: "Role inválida" };

  await db
    .update(users)
    .set({ nome, telefone, role: role as never, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Imobiliária do usuário (se existir)
  let imobiliariaId: string | null = null;
  const razaoSocial = String(formData.get("imobRazaoSocial") || "").trim();
  if (razaoSocial) {
    const cnpj = unmaskCNPJ(String(formData.get("imobCnpj") || ""));
    const update = {
      razaoSocial,
      nomeFantasia: String(formData.get("imobNomeFantasia") || "").trim() || null,
      cnpj,
      creciResponsavel:
        String(formData.get("imobCreci") || "").trim() || null,
      telefone: String(formData.get("imobTelefone") || "")
        .replace(/\D/g, "") || null,
      cep: String(formData.get("imobCep") || "").trim() || null,
      endereco: String(formData.get("imobEndereco") || "").trim() || null,
      cidade: String(formData.get("imobCidade") || "").trim() || null,
      uf:
        String(formData.get("imobUf") || "").trim().toUpperCase() || null,
      bancoNome: String(formData.get("imobBancoNome") || "").trim() || null,
      bancoCodigo: String(formData.get("imobBancoCodigo") || "").trim() || null,
      bancoAgencia:
        String(formData.get("imobBancoAgencia") || "").trim() || null,
      bancoConta: String(formData.get("imobBancoConta") || "").trim() || null,
      updatedAt: new Date(),
    };
    if (cnpj && !isValidCNPJ(cnpj))
      return { ok: false, error: "CNPJ da imobiliária inválido" };

    const existing = await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, userId))
      .limit(1);
    if (existing[0]) {
      await db
        .update(imobiliarias)
        .set(update)
        .where(eq(imobiliarias.id, existing[0].id));
      imobiliariaId = existing[0].id;
    }
  }

  // Documentos KYC (se admin subiu)
  const docs: { tipo: DocTipo; field: string }[] = [
    { tipo: "contrato_social", field: "doc_contrato_social" },
    { tipo: "comprovante_endereco", field: "doc_comprovante_endereco" },
    { tipo: "creci", field: "doc_creci" },
  ];
  for (const d of docs) {
    const url = String(formData.get(d.field) || "").trim();
    if (!url) continue;
    const nome = String(
      formData.get(`${d.field}_nome`) || `${d.tipo}.pdf`,
    );
    await upsertDocumento({
      tipo: d.tipo,
      url,
      nome,
      formData,
      nameBase: d.field,
      userId,
      imobiliariaId,
    });
  }

  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
  return { ok: true };
}

/* =============================================================
   CONSTRUTORA — editar
   ============================================================= */

export type EditConstrutoraState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function editConstrutoraAction(
  _prev: EditConstrutoraState,
  formData: FormData,
): Promise<EditConstrutoraState> {
  await requireAdmin();
  const construtoraId = String(formData.get("construtoraId") || "").trim();
  if (!construtoraId) return { ok: false, error: "construtoraId obrigatório" };

  const cnpj = unmaskCNPJ(String(formData.get("cnpj") || ""));
  if (!isValidCNPJ(cnpj)) return { ok: false, error: "CNPJ inválido" };

  // Fidelização: campo "fidelizar?" + fundoFidelizadoId
  const fidelizar = String(formData.get("fidelizar") || "") === "sim";
  const fundoFidelizadoId = fidelizar
    ? String(formData.get("fundoFidelizadoId") || "").trim() || null
    : null;
  if (fidelizar && !fundoFidelizadoId) {
    return { ok: false, error: "Selecione o fundo responsável pela fidelização" };
  }

  await db
    .update(construtoras)
    .set({
      razaoSocial: String(formData.get("razaoSocial") || "").trim(),
      nomeFantasia:
        String(formData.get("nomeFantasia") || "").trim() || null,
      cnpj,
      telefone: String(formData.get("telefone") || "")
        .replace(/\D/g, "") || null,
      email: String(formData.get("email") || "").trim() || null,
      cep: String(formData.get("cep") || "").trim() || null,
      endereco: String(formData.get("endereco") || "").trim() || null,
      cidade: String(formData.get("cidade") || "").trim() || null,
      uf:
        String(formData.get("uf") || "").trim().toUpperCase() || null,
      fundoFidelizadoId,
      updatedAt: new Date(),
    })
    .where(eq(construtoras.id, construtoraId));

  // Documentos KYC
  const docs: { tipo: DocTipo; field: string }[] = [
    { tipo: "contrato_social", field: "doc_contrato_social" },
    { tipo: "comprovante_endereco", field: "doc_comprovante_endereco" },
  ];
  for (const d of docs) {
    const url = String(formData.get(d.field) || "").trim();
    if (!url) continue;
    const nome = String(
      formData.get(`${d.field}_nome`) || `${d.tipo}.pdf`,
    );
    await upsertDocumento({
      tipo: d.tipo,
      url,
      nome,
      formData,
      nameBase: d.field,
      construtoraId,
    });
  }

  revalidatePath("/admin/construtoras");
  revalidatePath(`/admin/construtoras/${construtoraId}`);
  return { ok: true };
}

/* =============================================================
   OPERAÇÃO — editar valores e parcelas
   ============================================================= */

export type EditOperacaoState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

// Taxa mensal vem de system_settings — admin configura em /admin/configuracoes.
// Pra editar operação, lemos a taxa que já está gravada na própria row
// (preserva taxa específica da operação se foi customizada).

function monthsBetween(from: Date, to: Date) {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return y * 12 + m + dayFrac;
}

export async function editOperacaoAction(
  _prev: EditOperacaoState,
  formData: FormData,
): Promise<EditOperacaoState> {
  await requireAdmin();
  const operacaoId = String(formData.get("operacaoId") || "").trim();
  if (!operacaoId) return { ok: false, error: "operacaoId obrigatório" };

  const valorVenda = parseBRLNumber(String(formData.get("valorVenda") || ""));
  const valorComissao = parseBRLNumber(
    String(formData.get("valorComissao") || ""),
  );
  const dataVenda = String(formData.get("dataVenda") || "").trim();

  if (!valorVenda || valorVenda <= 0)
    return { ok: false, error: "Valor da venda inválido" };
  if (!valorComissao || valorComissao <= 0)
    return { ok: false, error: "Valor da comissão inválido" };
  if (valorComissao > valorVenda)
    return { ok: false, error: "Comissão maior que valor da venda" };
  if (!dataVenda) return { ok: false, error: "Data da venda obrigatória" };

  const parcelasJson = String(formData.get("parcelas") || "[]");
  let parcelasRaw: { valor: unknown; vencimento: unknown }[] = [];
  try {
    parcelasRaw = JSON.parse(parcelasJson);
  } catch {
    return { ok: false, error: "Parcelas inválidas" };
  }
  if (!Array.isArray(parcelasRaw) || parcelasRaw.length === 0)
    return { ok: false, error: "Adicione pelo menos uma parcela" };
  if (parcelasRaw.length > 5)
    return { ok: false, error: "Limite máximo de 5 parcelas" };

  const parcelas = parcelasRaw.map((p) => ({
    valor:
      typeof p.valor === "number" ? p.valor : parseBRLNumber(String(p.valor)),
    vencimento: String(p.vencimento ?? ""),
  }));

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  if (Math.abs(totalParcelas - valorComissao) > 0.5)
    return {
      ok: false,
      error: `Soma das parcelas (${totalParcelas.toFixed(2)}) não bate com a comissão (${valorComissao.toFixed(2)})`,
    };

  // Recalcula VP usando a taxa que já está gravada na operação
  // (admin pode customizar taxa por operação na aprovação).
  const [opCurrent] = await db
    .select({ taxaMensal: operacoes.taxaMensal })
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  const taxaMensal = opCurrent
    ? parseFloat(opCurrent.taxaMensal)
    : await getTaxaMensal();
  const today = new Date();
  const arr = parcelas.map((p) => ({
    valor: p.valor,
    mesesAteVencimento: Math.max(monthsBetween(today, new Date(p.vencimento)), 0),
  }));
  const vp = valorPresente(arr, taxaMensal);
  const desagio = valorComissao - vp;

  await db
    .update(operacoes)
    .set({
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      valorPresente: String(vp.toFixed(2)),
      desagio: String(desagio.toFixed(2)),
      dataVenda,
      numeroParcelas: parcelas.length,
      updatedAt: new Date(),
    })
    .where(eq(operacoes.id, operacaoId));

  // Substitui parcelas (delete + insert) — simples e correto
  await db
    .delete(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, operacaoId));
  await db.insert(parcelasComissao).values(
    parcelas.map((p, i) => ({
      operacaoId,
      numero: i + 1,
      valor: String(p.valor.toFixed(2)),
      vencimento: p.vencimento,
      status: "a_vencer" as const,
    })),
  );

  revalidatePath("/admin/operacoes");
  revalidatePath(`/admin/operacoes/${operacaoId}`);
  redirect(`/admin/operacoes/${operacaoId}`);
}
