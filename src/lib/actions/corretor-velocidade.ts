"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  compradorColetaTokens,
  construtoras,
  corretorOperacaoTemplates,
  operacaoCompradores,
  operacoes,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";

/* =========================================================================
   TEMPLATES DE OPERAÇÃO
   ========================================================================= */

export type OperacaoTemplateConfig = {
  numeroParcelas?: number;
  percentualComissao?: number; // 0–1 ex 0.06 = 6% do valorVenda
  pagadorTipo?: "construtora" | "compradores";
  intervaloDias?: number; // espaçamento entre parcelas, default 30
  observacaoPadrao?: string;
};

async function requireCorretor() {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  if (user.role !== "corretor" && user.role !== "imobiliaria")
    throw new Error("Apenas corretor/imobiliária");
  return user;
}

export async function listMeusTemplates(construtoraId?: string) {
  const user = await requireCorretor();
  const conds = [eq(corretorOperacaoTemplates.corretorUserId, user.id)];
  if (construtoraId)
    conds.push(eq(corretorOperacaoTemplates.construtoraId, construtoraId));
  return db
    .select({
      id: corretorOperacaoTemplates.id,
      construtoraId: corretorOperacaoTemplates.construtoraId,
      nome: corretorOperacaoTemplates.nome,
      config: corretorOperacaoTemplates.config,
      construtoraNome: construtoras.razaoSocial,
    })
    .from(corretorOperacaoTemplates)
    .leftJoin(
      construtoras,
      eq(construtoras.id, corretorOperacaoTemplates.construtoraId),
    )
    .where(and(...conds))
    .orderBy(desc(corretorOperacaoTemplates.updatedAt));
}

export type SaveTemplateState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

export async function salvarTemplateAction(
  _prev: SaveTemplateState,
  formData: FormData,
): Promise<SaveTemplateState> {
  const user = await requireCorretor();
  const construtoraId = String(formData.get("construtoraId") || "").trim();
  const nome = String(formData.get("nome") || "").trim();
  const configRaw = String(formData.get("config") || "").trim();

  if (!construtoraId) return { ok: false, error: "Construtora obrigatória" };
  if (!nome) return { ok: false, error: "Informe um nome" };

  let config: OperacaoTemplateConfig;
  try {
    config = JSON.parse(configRaw);
  } catch {
    return { ok: false, error: "Config inválida" };
  }

  const [created] = await db
    .insert(corretorOperacaoTemplates)
    .values({
      corretorUserId: user.id,
      construtoraId,
      nome,
      config: config as never,
    })
    .returning();

  revalidatePath("/painel/operacoes/nova");
  return { ok: true, id: created.id };
}

export async function deleteTemplateAction(id: string) {
  const user = await requireCorretor();
  await db
    .delete(corretorOperacaoTemplates)
    .where(
      and(
        eq(corretorOperacaoTemplates.id, id),
        eq(corretorOperacaoTemplates.corretorUserId, user.id),
      ),
    );
  revalidatePath("/painel/operacoes/nova");
}

/* =========================================================================
   AUTOCOMPLETE DE COMPRADORES POR DOCUMENTO
   ========================================================================= */

export async function lookupCompradorPorDocumento(documento: string) {
  const user = await requireCorretor();
  const doc = documento.replace(/\D/g, "");
  if (doc.length < 11) return null;

  // Busca o comprador mais recente desse CPF/CNPJ em ops do corretor
  const [row] = await db
    .select({
      tipoPessoa: operacaoCompradores.tipoPessoa,
      nome: operacaoCompradores.nome,
      documento: operacaoCompradores.documento,
      telefone: operacaoCompradores.telefone,
      email: operacaoCompradores.email,
      endereco: operacaoCompradores.endereco,
      cidade: operacaoCompradores.cidade,
      uf: operacaoCompradores.uf,
      cep: operacaoCompradores.cep,
    })
    .from(operacaoCompradores)
    .innerJoin(operacoes, eq(operacoes.id, operacaoCompradores.operacaoId))
    .where(
      and(
        eq(operacaoCompradores.documento, doc),
        eq(operacoes.corretorUserId, user.id),
      ),
    )
    .orderBy(desc(operacaoCompradores.createdAt))
    .limit(1);

  return row ?? null;
}

/* =========================================================================
   COLETA PÚBLICA DE COMPRADOR (QR/link)
   ========================================================================= */

function gerarToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function gerarTokenColetaComprador(opts?: {
  construtoraId?: string;
  operacaoId?: string;
}): Promise<{ token: string; expiresAt: Date; url: string }> {
  const user = await requireCorretor();

  const token = gerarToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await db.insert(compradorColetaTokens).values({
    token,
    corretorUserId: user.id,
    construtoraId: opts?.construtoraId ?? null,
    operacaoId: opts?.operacaoId ?? null,
    expiresAt,
  });

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";
  const url = `${origin}/coleta-comprador/${token}`;
  return { token, expiresAt, url };
}

export async function listTokensColetaPendentes() {
  const user = await requireCorretor();
  return db
    .select()
    .from(compradorColetaTokens)
    .where(
      and(
        eq(compradorColetaTokens.corretorUserId, user.id),
        gt(compradorColetaTokens.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(compradorColetaTokens.createdAt))
    .limit(20);
}

/** Server action chamada pela página pública pra registrar os dados do
 *  comprador. SEM auth — público. */
export async function submeterColetaComprador(
  token: string,
  dados: {
    tipoPessoa: "fisica" | "juridica";
    nome: string;
    documento: string;
    telefone: string;
    email: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Não chama requireCorretor — é endpoint público
  if (!token) return { ok: false, error: "Token ausente" };

  const [row] = await db
    .select()
    .from(compradorColetaTokens)
    .where(eq(compradorColetaTokens.token, token))
    .limit(1);

  if (!row) return { ok: false, error: "Link inválido" };
  if (row.preenchidoEm)
    return { ok: false, error: "Esse link já foi usado" };
  if (row.expiresAt < new Date())
    return { ok: false, error: "Link expirou" };

  if (!dados.nome.trim())
    return { ok: false, error: "Nome obrigatório" };
  const docNum = dados.documento.replace(/\D/g, "");
  if (docNum.length < 11)
    return { ok: false, error: "Documento inválido" };

  await db
    .update(compradorColetaTokens)
    .set({
      dadosColetados: { ...dados, documento: docNum } as never,
      preenchidoEm: new Date(),
    })
    .where(eq(compradorColetaTokens.id, row.id));

  return { ok: true };
}

export async function getColetaTokenInfo(token: string) {
  const [row] = await db
    .select({
      id: compradorColetaTokens.id,
      preenchidoEm: compradorColetaTokens.preenchidoEm,
      expiresAt: compradorColetaTokens.expiresAt,
      construtoraNome: construtoras.razaoSocial,
      corretorNome: users.nome,
    })
    .from(compradorColetaTokens)
    .leftJoin(
      construtoras,
      eq(construtoras.id, compradorColetaTokens.construtoraId),
    )
    .leftJoin(users, eq(users.id, compradorColetaTokens.corretorUserId))
    .where(eq(compradorColetaTokens.token, token))
    .limit(1);
  return row ?? null;
}

/* =========================================================================
   CNPJ LOOKUP via BrasilAPI (público)
   ========================================================================= */

export type BrasilCnpjData = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  logradouro: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  ddd_telefone_1: string | null;
  email: string | null;
};

export async function lookupCnpj(cnpj: string): Promise<
  | { ok: true; data: BrasilCnpjData }
  | { ok: false; error: string }
> {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return { ok: false, error: "CNPJ inválido" };
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
      // Cache 1h por CNPJ
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: res.status === 404 ? "CNPJ não encontrado" : "Erro na consulta",
      };
    }
    const data = (await res.json()) as BrasilCnpjData;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
