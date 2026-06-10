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

/** Resultado interno de um provedor: achou (data), não-existe (notFound) ou
 *  falhou/indisponível (erro de rede, 429, 5xx). */
type ProviderResult =
  | { kind: "ok"; data: BrasilCnpjData }
  | { kind: "notfound" }
  | { kind: "fail" };

async function fetchCnpjJson(
  url: string,
): Promise<{ status: number; json: unknown } | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
      headers: { accept: "application/json" },
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  } catch {
    return null;
  }
}

/** BrasilAPI — já retorna no formato BrasilCnpjData. */
async function fromBrasilApi(clean: string): Promise<ProviderResult> {
  const r = await fetchCnpjJson(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
  if (!r) return { kind: "fail" };
  if (r.status === 404) return { kind: "notfound" };
  if (r.status !== 200 || !r.json) return { kind: "fail" };
  return { kind: "ok", data: r.json as BrasilCnpjData };
}

/** cnpj.ws (pública) — formato com `estabelecimento`. */
async function fromCnpjWs(clean: string): Promise<ProviderResult> {
  const r = await fetchCnpjJson(`https://publica.cnpj.ws/cnpj/${clean}`);
  if (!r) return { kind: "fail" };
  if (r.status === 404) return { kind: "notfound" };
  if (r.status !== 200 || !r.json) return { kind: "fail" };
  const d = r.json as {
    razao_social?: string;
    estabelecimento?: {
      cnpj?: string;
      nome_fantasia?: string | null;
      tipo_logradouro?: string | null;
      logradouro?: string | null;
      numero?: string | null;
      bairro?: string | null;
      cep?: string | null;
      ddd1?: string | null;
      telefone1?: string | null;
      email?: string | null;
      cidade?: { nome?: string } | null;
      estado?: { sigla?: string } | null;
    };
  };
  const e = d.estabelecimento ?? {};
  const logradouro =
    [e.tipo_logradouro, e.logradouro, e.numero].filter(Boolean).join(" ") ||
    null;
  return {
    kind: "ok",
    data: {
      cnpj: e.cnpj ?? clean,
      razao_social: d.razao_social ?? "",
      nome_fantasia: e.nome_fantasia ?? null,
      logradouro,
      bairro: e.bairro ?? null,
      municipio: e.cidade?.nome ?? null,
      uf: e.estado?.sigla ?? null,
      cep: e.cep ?? null,
      ddd_telefone_1:
        e.ddd1 && e.telefone1 ? `${e.ddd1}${e.telefone1}` : null,
      email: e.email ?? null,
    },
  };
}

/** ReceitaWS — formato plano. status "ERROR" quando não encontra. */
async function fromReceitaWs(clean: string): Promise<ProviderResult> {
  const r = await fetchCnpjJson(`https://www.receitaws.com.br/v1/cnpj/${clean}`);
  if (!r) return { kind: "fail" };
  if (r.status === 404) return { kind: "notfound" };
  if (r.status !== 200 || !r.json) return { kind: "fail" };
  const d = r.json as {
    status?: string;
    nome?: string;
    fantasia?: string | null;
    logradouro?: string | null;
    numero?: string | null;
    bairro?: string | null;
    municipio?: string | null;
    uf?: string | null;
    cep?: string | null;
    telefone?: string | null;
    email?: string | null;
  };
  if (d.status === "ERROR" || !d.nome) return { kind: "notfound" };
  const logradouro =
    [d.logradouro, d.numero].filter(Boolean).join(", ") || null;
  return {
    kind: "ok",
    data: {
      cnpj: clean,
      razao_social: d.nome ?? "",
      nome_fantasia: d.fantasia || null,
      logradouro,
      bairro: d.bairro ?? null,
      municipio: d.municipio ?? null,
      uf: d.uf ?? null,
      cep: (d.cep ?? "").replace(/\D/g, "") || null,
      ddd_telefone_1: (d.telefone ?? "").replace(/\D/g, "").slice(0, 11) || null,
      email: d.email || null,
    },
  };
}

/**
 * Consulta dados do CNPJ com cadeia de fallback entre provedores. A BrasilAPI
 * costuma rejeitar/limitar (429) os IPs compartilhados da Vercel em produção,
 * então caímos pra cnpj.ws e ReceitaWS antes de desistir. Cada provedor tem
 * timeout de 8s. Só retorna "não encontrado" se algum provedor afirmar isso e
 * nenhum tiver achado.
 */
export async function lookupCnpj(cnpj: string): Promise<
  | { ok: true; data: BrasilCnpjData }
  | { ok: false; error: string }
> {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return { ok: false, error: "CNPJ inválido" };

  const providers = [fromBrasilApi, fromCnpjWs, fromReceitaWs];
  let sawNotFound = false;
  for (const provider of providers) {
    const r = await provider(clean);
    if (r.kind === "ok") return { ok: true, data: r.data };
    if (r.kind === "notfound") sawNotFound = true;
    // kind === "fail" → tenta o próximo provedor
  }

  if (sawNotFound) return { ok: false, error: "CNPJ não encontrado" };
  return {
    ok: false,
    error:
      "Não conseguimos consultar o CNPJ agora (serviço indisponível). Preencha os dados manualmente e siga com o cadastro.",
  };
}
