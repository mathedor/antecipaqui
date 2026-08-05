"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, imobiliarias, construtoras, documentos } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { extractValidacao } from "@/lib/validacao-form";
import { applyRefToImobiliaria } from "@/lib/actions/comercial-convite";
import { REF_COOKIE_NAME } from "@/lib/comercial-convite-constants";

type DocumentoTipo =
  | "contrato_social"
  | "comprovante_endereco"
  | "creci";

async function persistDocumentos(
  args: {
    userId: string;
    imobiliariaId?: string;
    construtoraId?: string;
    formData: FormData;
    docs: { tipo: DocumentoTipo; url: string; nome: string; nameBase: string }[];
  },
) {
  const rows = args.docs
    .filter((d) => d.url)
    .map((d) => {
      const v = extractValidacao(args.formData, d.nameBase);
      return {
        tipo: d.tipo,
        url: d.url,
        nomeOriginal: d.nome,
        userId: args.userId,
        imobiliariaId: args.imobiliariaId ?? null,
        construtoraId: args.construtoraId ?? null,
        validacaoStatus: v.validacaoStatus,
        validacaoConfianca: v.validacaoConfianca,
        validacaoMotivo: v.validacaoMotivo,
      };
    });
  if (rows.length === 0) return;
  await db.insert(documentos).values(rows);
}

type Role = "corretor" | "imobiliaria" | "construtora";

const VALID_ROLES: Role[] = ["corretor", "imobiliaria", "construtora"];

export async function selectRoleAction(formData: FormData) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const role = String(formData.get("role")) as Role;
  if (!VALID_ROLES.includes(role)) {
    throw new Error("Tipo de cadastro inválido");
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/painel");
  redirect("/painel/onboarding/dados");
}

export type SaveCompanyState =
  | { ok: false; error: string; values?: Record<string, string> }
  | { ok: true; redirectTo: string }
  | null;

function snapshotValues(formData: FormData): Record<string, string> {
  const keys = [
    "nome",
    "telefone",
    "razaoSocial",
    "nomeFantasia",
    "cnpj",
    "cep",
    "endereco",
    "cidade",
    "uf",
    "creci",
    "email",
    "bancoNome",
    "bancoCodigo",
    "bancoAgencia",
    "bancoConta",
    "doc_contrato_social",
    "doc_comprovante_endereco",
    "doc_creci",
    "doc_contrato_social_nome",
    "doc_comprovante_endereco_nome",
    "doc_creci_nome",
  ];
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = String(formData.get(k) ?? "");
  return out;
}

function fail(error: string, formData: FormData): SaveCompanyState {
  return { ok: false, error, values: snapshotValues(formData) };
}

export async function saveCompanyDataAction(
  _prev: SaveCompanyState,
  formData: FormData,
): Promise<SaveCompanyState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const razaoSocial = String(formData.get("razaoSocial") || "").trim();
  const nomeFantasia =
    String(formData.get("nomeFantasia") || "").trim() || null;
  const cnpjRaw = String(formData.get("cnpj") || "");
  const cnpj = unmaskCNPJ(cnpjRaw);
  const cep = String(formData.get("cep") || "").trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const cidade = String(formData.get("cidade") || "").trim();
  const uf = String(formData.get("uf") || "").trim().toUpperCase();
  const creci = String(formData.get("creci") || "").trim() || null;
  const emailEmpresa = String(formData.get("email") || "").trim() || null;

  // Grupo econômico: quando marcado, mandamos o user direto pra tela de
  // cadastro das filiais depois de salvar a matriz.
  const possuiFiliais = String(formData.get("possuiFiliais") || "") === "1";

  // Dados bancários (apenas pra corretor/imobiliária — usados no contrato)
  const bancoNome = String(formData.get("bancoNome") || "").trim() || null;
  const bancoCodigo = String(formData.get("bancoCodigo") || "").trim() || null;
  const bancoAgencia = String(formData.get("bancoAgencia") || "").trim() || null;
  const bancoConta = String(formData.get("bancoConta") || "").trim() || null;

  // Validações
  if (!nome) return fail("Nome é obrigatório", formData);
  if (!razaoSocial) return fail("Razão social é obrigatória", formData);
  if (!isValidCNPJ(cnpj)) return fail("CNPJ inválido", formData);
  if (!cep || cep.replace(/\D/g, "").length !== 8) {
    return fail("CEP inválido", formData);
  }
  if (!endereco) return fail("Endereço é obrigatório", formData);
  if (!cidade) return fail("Cidade é obrigatória", formData);
  if (uf.length !== 2) return fail("UF inválida", formData);
  if (!telefone) return fail("Telefone é obrigatório", formData);

  if (
    user.role === "corretor" || user.role === "imobiliaria"
  ) {
    if (!bancoNome || !bancoAgencia || !bancoConta) {
      return fail(
        "Dados bancários (banco, agência e conta) são obrigatórios pra corretor/imobiliária — necessários no contrato",
        formData,
      );
    }
  }

  // Atualiza dados do usuário
  await db
    .update(users)
    .set({
      nome,
      telefone,
      onboardingStatus: "documentos_enviados",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Documentos enviados (URLs do Vercel Blob, vindos do form)
  const docContratoSocial = String(formData.get("doc_contrato_social") || "");
  const docComprovEndereco = String(formData.get("doc_comprovante_endereco") || "");
  const docCreci = String(formData.get("doc_creci") || "");
  const nomeContratoSocial = String(formData.get("doc_contrato_social_nome") || "contrato_social.pdf");
  const nomeComprovEndereco = String(formData.get("doc_comprovante_endereco_nome") || "comprovante.pdf");
  const nomeCreci = String(formData.get("doc_creci_nome") || "creci.pdf");

  // Cria/assume empresa de acordo com role.
  // Se uma row com mesmo CNPJ já existe (ex: cadastrada por outro user
  // durante operação), o user atual ASSUME a titularidade.
  let imobiliariaId: string | undefined;
  let construtoraId: string | undefined;

  if (user.role === "imobiliaria" || user.role === "corretor") {
    const existing = await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.cnpj, cnpj))
      .limit(1);
    if (existing[0]) {
      await db
        .update(imobiliarias)
        .set({
          ownerUserId: user.id,
          razaoSocial,
          nomeFantasia,
          creciResponsavel: creci,
          telefone,
          cep,
          endereco,
          cidade,
          uf,
          bancoNome,
          bancoCodigo,
          bancoAgencia,
          bancoConta,
          possuiFiliais,
          apelido: existing[0].apelido ?? "Matriz",
          updatedAt: new Date(),
        })
        .where(eq(imobiliarias.id, existing[0].id));
      imobiliariaId = existing[0].id;
    } else {
      const [created] = await db
        .insert(imobiliarias)
        .values({
          ownerUserId: user.id,
          razaoSocial,
          nomeFantasia,
          cnpj,
          creciResponsavel: creci,
          telefone,
          cep,
          endereco,
          cidade,
          uf,
          bancoNome,
          bancoCodigo,
          bancoAgencia,
          bancoConta,
          possuiFiliais,
          apelido: "Matriz",
        })
        .returning({ id: imobiliarias.id });
      imobiliariaId = created.id;

      // Vincula a um comercial se vier cookie de ref válido (link de
      // convite usado no signup). Idempotente — se já tiver comercial, no-op.
      const cookieStore = await cookies();
      const refToken = cookieStore.get(REF_COOKIE_NAME)?.value;
      if (refToken) {
        await applyRefToImobiliaria({
          imobiliariaId: created.id,
          token: refToken,
        }).catch(() => {
          // Best-effort — não trava onboarding se falhar
        });
        // Limpa cookie pra não reutilizar
        cookieStore.delete(REF_COOKIE_NAME);
      }
    }
    await persistDocumentos({
      userId: user.id,
      imobiliariaId,
      formData,
      docs: [
        { tipo: "contrato_social", url: docContratoSocial, nome: nomeContratoSocial, nameBase: "doc_contrato_social" },
        { tipo: "comprovante_endereco", url: docComprovEndereco, nome: nomeComprovEndereco, nameBase: "doc_comprovante_endereco" },
        { tipo: "creci", url: docCreci, nome: nomeCreci, nameBase: "doc_creci" },
      ],
    });
  } else if (user.role === "construtora") {
    const existing = await db
      .select()
      .from(construtoras)
      .where(eq(construtoras.cnpj, cnpj))
      .limit(1);
    if (existing[0]) {
      await db
        .update(construtoras)
        .set({
          ownerUserId: user.id,
          razaoSocial,
          nomeFantasia,
          telefone,
          email: emailEmpresa,
          cep,
          endereco,
          cidade,
          uf,
          onboardingStatus: "documentos_enviados",
          updatedAt: new Date(),
        })
        .where(eq(construtoras.id, existing[0].id));
      construtoraId = existing[0].id;
    } else {
      const [created] = await db
        .insert(construtoras)
        .values({
          ownerUserId: user.id,
          razaoSocial,
          nomeFantasia,
          cnpj,
          telefone,
          email: emailEmpresa,
          cep,
          endereco,
          cidade,
          uf,
          onboardingStatus: "documentos_enviados",
        })
        .returning({ id: construtoras.id });
      construtoraId = created.id;
    }
    await persistDocumentos({
      userId: user.id,
      construtoraId,
      formData,
      docs: [
        { tipo: "contrato_social", url: docContratoSocial, nome: nomeContratoSocial, nameBase: "doc_contrato_social" },
        { tipo: "comprovante_endereco", url: docComprovEndereco, nome: nomeComprovEndereco, nameBase: "doc_comprovante_endereco" },
      ],
    });
  }

  revalidatePath("/painel");
  // Com filiais declaradas, o próximo passo natural é cadastrá-las.
  const destino =
    possuiFiliais && imobiliariaId ? "/painel/filiais" : "/painel";
  return { ok: true, redirectTo: destino };
}
