"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, sql, count, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  fundos,
  operacoes,
  parcelasComissao,
  users,
  construtoras,
  imobiliarias,
} from "@/db/schema";
import { requireAdmin, getCurrentDbUser } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { audit } from "@/lib/audit";

/* =========================================
   ADMIN — CRUD de fundos
   ========================================= */

/** Parseia uma string percentual ("40", "40,00", "40%", "0.40", "") em
 *  decimal (0–1). Vazio = 0 (default). Valores claramente percentuais (>=1)
 *  são convertidos por /100. Retorna "INVALID" se não der pra parsear ou
 *  se o resultado ficar fora de [0, 1]. */
function parsePctOpcional(input: string): number | "INVALID" {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  const n = parseFloat(trimmed.replace(",", ".").replace("%", ""));
  if (!Number.isFinite(n) || n < 0) return "INVALID";
  const decimal = n >= 1 ? n / 100 : n;
  if (decimal < 0 || decimal > 1) return "INVALID";
  return decimal;
}

export type FundoState =
  | { ok: false; error: string }
  | { ok: true; fundoId: string }
  | null;

export async function createFundoAction(
  _prev: FundoState,
  formData: FormData,
): Promise<FundoState> {
  await requireAdmin();

  const razaoSocial = String(formData.get("razaoSocial") || "").trim();
  const nomeFantasia =
    String(formData.get("nomeFantasia") || "").trim() || null;
  const cnpj = unmaskCNPJ(String(formData.get("cnpj") || ""));
  const cep = String(formData.get("cep") || "").trim() || null;
  const endereco = String(formData.get("endereco") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;
  const uf = String(formData.get("uf") || "").trim().toUpperCase() || null;
  const contatoResponsavel =
    String(formData.get("contatoResponsavel") || "").trim() || null;
  const telefone = String(formData.get("telefone") || "")
    .replace(/\D/g, "") || null;
  const emailComercial =
    String(formData.get("emailComercial") || "").trim() || null;
  const emailAssinatura =
    String(formData.get("emailAssinatura") || "").trim() || null;
  const contratoUrl =
    String(formData.get("contratoUrl") || "").trim() || null;
  const contratoNome =
    String(formData.get("contratoNome") || "").trim() || null;
  const taxaInput = String(formData.get("taxaMensalBase") || "").trim();

  if (!razaoSocial)
    return { ok: false, error: "Razão social é obrigatória" };
  if (!isValidCNPJ(cnpj))
    return { ok: false, error: "CNPJ inválido" };
  if (!emailComercial)
    return { ok: false, error: "Email comercial é obrigatório" };
  if (!emailAssinatura)
    return { ok: false, error: "Email para assinatura é obrigatório" };

  const taxa = parseFloat(taxaInput.replace(",", ".").replace("%", ""));
  if (!Number.isFinite(taxa) || taxa <= 0)
    return { ok: false, error: "Taxa de juros inválida" };
  // Aceita 0.06 ou 6 (admin pode digitar como percentual)
  const taxaMensal = taxa >= 0.5 ? taxa / 100 : taxa;
  if (taxaMensal < 0.001 || taxaMensal > 0.5)
    return { ok: false, error: "Taxa fora do limite (0,1% a 50%)" };

  const custoFinanceiroPct = parsePctOpcional(
    String(formData.get("custoFinanceiroPct") || ""),
  );
  if (custoFinanceiroPct === "INVALID")
    return { ok: false, error: "Custo financeiro / rateio inválido" };
  const impostosPct = parsePctOpcional(
    String(formData.get("impostosPct") || ""),
  );
  if (impostosPct === "INVALID")
    return { ok: false, error: "% de impostos inválido" };

  const existing = await db
    .select()
    .from(fundos)
    .where(eq(fundos.cnpj, cnpj))
    .limit(1);
  if (existing[0])
    return { ok: false, error: "Já existe fundo cadastrado com esse CNPJ" };

  const [created] = await db
    .insert(fundos)
    .values({
      razaoSocial,
      nomeFantasia,
      cnpj,
      cep,
      endereco,
      cidade,
      uf,
      contatoResponsavel,
      telefone,
      emailComercial,
      emailAssinatura,
      contratoUrl,
      contratoNome,
      taxaMensalBase: taxaMensal.toFixed(4),
      custoFinanceiroPct: custoFinanceiroPct.toFixed(4),
      impostosPct: impostosPct.toFixed(4),
      bancoNome: String(formData.get("bancoNome") || "").trim() || null,
      bancoCodigo:
        String(formData.get("bancoCodigo") || "").trim() || null,
      bancoAgencia:
        String(formData.get("bancoAgencia") || "").trim() || null,
      bancoConta: String(formData.get("bancoConta") || "").trim() || null,
      bancoPix: String(formData.get("bancoPix") || "").trim() || null,
      boletosBancoNome:
        String(formData.get("boletosBancoNome") || "").trim() || null,
      boletosApiUrl:
        String(formData.get("boletosApiUrl") || "").trim() || null,
      sistemaGestaoNome:
        String(formData.get("sistemaGestaoNome") || "").trim() || null,
      sistemaGestaoDocsUrl:
        String(formData.get("sistemaGestaoDocsUrl") || "").trim() || null,
      /* Encargos + cobrança opcionais (wizard preenche) */
      multaAtrasoPct: parseEncargo(
        String(formData.get("multaAtrasoPct") || ""),
        "0.02",
      ),
      jurosMoraMensalPct: parseEncargo(
        String(formData.get("jurosMoraMensalPct") || ""),
        "0.01",
      ),
      boletosModo: normalizeModo(
        String(formData.get("boletosModo") || "manual"),
      ),
      cobrancaApiUrl:
        String(formData.get("cobrancaApiUrl") || "").trim() || null,
      cnabBancoCodigo:
        String(formData.get("cnabBancoCodigo") || "").trim() || null,
      cnabCarteira:
        String(formData.get("cnabCarteira") || "").trim() || null,
      cnabConvenio:
        String(formData.get("cnabConvenio") || "").trim() || null,
      cnabCedenteCodigo:
        String(formData.get("cnabCedenteCodigo") || "").trim() || null,
    })
    .returning({ id: fundos.id });

  audit({
    action: "create_fundo",
    targetType: "fundo",
    targetId: created.id,
    targetLabel: razaoSocial,
  }).catch(() => undefined);

  revalidatePath("/admin/fundos");
  return { ok: true, fundoId: created.id };
}

export async function editFundoAction(
  _prev: FundoState,
  formData: FormData,
): Promise<FundoState> {
  await requireAdmin();
  const fundoId = String(formData.get("fundoId") || "").trim();
  if (!fundoId) return { ok: false, error: "fundoId obrigatório" };

  const cnpj = unmaskCNPJ(String(formData.get("cnpj") || ""));
  if (!isValidCNPJ(cnpj))
    return { ok: false, error: "CNPJ inválido" };

  const taxaInput = String(formData.get("taxaMensalBase") || "").trim();
  const taxa = parseFloat(taxaInput.replace(",", ".").replace("%", ""));
  if (!Number.isFinite(taxa) || taxa <= 0)
    return { ok: false, error: "Taxa de juros inválida" };
  const taxaMensal = taxa >= 0.5 ? taxa / 100 : taxa;
  if (taxaMensal < 0.001 || taxaMensal > 0.5)
    return { ok: false, error: "Taxa fora do limite (0,1% a 50%)" };

  const custoFinanceiroPct = parsePctOpcional(
    String(formData.get("custoFinanceiroPct") || ""),
  );
  if (custoFinanceiroPct === "INVALID")
    return { ok: false, error: "Custo financeiro / rateio inválido" };
  const impostosPct = parsePctOpcional(
    String(formData.get("impostosPct") || ""),
  );
  if (impostosPct === "INVALID")
    return { ok: false, error: "% de impostos inválido" };

  await db
    .update(fundos)
    .set({
      razaoSocial: String(formData.get("razaoSocial") || "").trim(),
      nomeFantasia:
        String(formData.get("nomeFantasia") || "").trim() || null,
      cnpj,
      cep: String(formData.get("cep") || "").trim() || null,
      endereco: String(formData.get("endereco") || "").trim() || null,
      cidade: String(formData.get("cidade") || "").trim() || null,
      uf: String(formData.get("uf") || "").trim().toUpperCase() || null,
      contatoResponsavel:
        String(formData.get("contatoResponsavel") || "").trim() || null,
      telefone:
        String(formData.get("telefone") || "")
          .replace(/\D/g, "") || null,
      emailComercial:
        String(formData.get("emailComercial") || "").trim() || null,
      emailAssinatura:
        String(formData.get("emailAssinatura") || "").trim() || null,
      contratoUrl:
        String(formData.get("contratoUrl") || "").trim() || null,
      contratoNome:
        String(formData.get("contratoNome") || "").trim() || null,
      taxaMensalBase: taxaMensal.toFixed(4),
      custoFinanceiroPct: custoFinanceiroPct.toFixed(4),
      impostosPct: impostosPct.toFixed(4),
      bancoNome: String(formData.get("bancoNome") || "").trim() || null,
      bancoCodigo:
        String(formData.get("bancoCodigo") || "").trim() || null,
      bancoAgencia:
        String(formData.get("bancoAgencia") || "").trim() || null,
      bancoConta: String(formData.get("bancoConta") || "").trim() || null,
      bancoPix: String(formData.get("bancoPix") || "").trim() || null,
      boletosBancoNome:
        String(formData.get("boletosBancoNome") || "").trim() || null,
      boletosApiUrl:
        String(formData.get("boletosApiUrl") || "").trim() || null,
      sistemaGestaoNome:
        String(formData.get("sistemaGestaoNome") || "").trim() || null,
      sistemaGestaoDocsUrl:
        String(formData.get("sistemaGestaoDocsUrl") || "").trim() || null,
      /* Encargos de atraso */
      multaAtrasoPct: parseEncargo(
        String(formData.get("multaAtrasoPct") || ""),
        "0.02",
      ),
      jurosMoraMensalPct: parseEncargo(
        String(formData.get("jurosMoraMensalPct") || ""),
        "0.01",
      ),
      /* Modo de cobrança */
      boletosModo: normalizeModo(
        String(formData.get("boletosModo") || "manual"),
      ),
      cobrancaApiUrl:
        String(formData.get("cobrancaApiUrl") || "").trim() || null,
      cobrancaApiAuthTipo:
        String(formData.get("cobrancaApiAuthTipo") || "").trim() || null,
      cobrancaApiCredenciais: parseJsonOpcional(
        String(formData.get("cobrancaApiCredenciais") || ""),
      ),
      cobrancaWebhookSecret:
        String(formData.get("cobrancaWebhookSecret") || "").trim() || null,
      cnabLayout: String(formData.get("cnabLayout") || "").trim() || null,
      cnabBancoCodigo:
        String(formData.get("cnabBancoCodigo") || "").trim() || null,
      cnabCarteira:
        String(formData.get("cnabCarteira") || "").trim() || null,
      cnabConvenio:
        String(formData.get("cnabConvenio") || "").trim() || null,
      cnabCedenteCodigo:
        String(formData.get("cnabCedenteCodigo") || "").trim() || null,
      /* Assinatura digital */
      assinaturaUsaPadrao:
        String(formData.get("assinaturaUsaPadrao") || "true") === "true",
      assinaturaSistema:
        String(formData.get("assinaturaSistema") || "").trim() || null,
      assinaturaApiUrl:
        String(formData.get("assinaturaApiUrl") || "").trim() || null,
      assinaturaApiCredenciais: parseJsonOpcional(
        String(formData.get("assinaturaApiCredenciais") || ""),
      ),
      updatedAt: new Date(),
    })
    .where(eq(fundos.id, fundoId));

  audit({
    action: "update_fundo",
    targetType: "fundo",
    targetId: fundoId,
  }).catch(() => undefined);

  revalidatePath("/admin/fundos");
  revalidatePath(`/admin/fundos/${fundoId}`);
  return { ok: true, fundoId };
}

function parseEncargo(raw: string, fallback: string): string {
  const cleaned = raw.replace(",", ".").replace("%", "").trim();
  const v = parseFloat(cleaned);
  if (!Number.isFinite(v) || v < 0) return fallback;
  // Aceita "2" como 2% (=0.02) ou "0.02" como 2%
  const pct = v >= 1 ? v / 100 : v;
  if (pct > 1) return fallback;
  return pct.toFixed(4);
}

function normalizeModo(raw: string): "api" | "cnab" | "manual" {
  if (raw === "api" || raw === "cnab" || raw === "manual") return raw;
  return "manual";
}

function parseJsonOpcional(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/** Edição feita pelo próprio dono do fundo (role=fundo). Limitada aos
 *  campos que fazem sentido o fundo gerenciar: contato, endereço, banco,
 *  contrato modelo e configuração de assinatura digital. NÃO permite mexer
 *  em razão social, CNPJ, taxa-base, custo financeiro, impostos, encargos
 *  ou config de cobrança — esses ficam restritos ao admin. */
export async function editFundoSelfAction(
  _prev: FundoState,
  formData: FormData,
): Promise<FundoState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "fundo")
    return { ok: false, error: "Apenas dono do fundo pode editar" };

  const [meuFundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.ownerUserId, user.id))
    .limit(1);
  if (!meuFundo) return { ok: false, error: "Fundo não encontrado" };

  await db
    .update(fundos)
    .set({
      nomeFantasia:
        String(formData.get("nomeFantasia") || "").trim() || null,
      cep: String(formData.get("cep") || "").trim() || null,
      endereco: String(formData.get("endereco") || "").trim() || null,
      cidade: String(formData.get("cidade") || "").trim() || null,
      uf:
        String(formData.get("uf") || "").trim().toUpperCase() || null,
      contatoResponsavel:
        String(formData.get("contatoResponsavel") || "").trim() || null,
      telefone:
        String(formData.get("telefone") || "").replace(/\D/g, "") || null,
      emailComercial:
        String(formData.get("emailComercial") || "").trim() || null,
      emailAssinatura:
        String(formData.get("emailAssinatura") || "").trim() || null,
      contratoUrl:
        String(formData.get("contratoUrl") || "").trim() || null,
      contratoNome:
        String(formData.get("contratoNome") || "").trim() || null,
      bancoNome: String(formData.get("bancoNome") || "").trim() || null,
      bancoCodigo:
        String(formData.get("bancoCodigo") || "").trim() || null,
      bancoAgencia:
        String(formData.get("bancoAgencia") || "").trim() || null,
      bancoConta: String(formData.get("bancoConta") || "").trim() || null,
      bancoPix: String(formData.get("bancoPix") || "").trim() || null,
      /* Assinatura digital — fundo escolhe usar padrão (ZapSign) ou o seu */
      assinaturaUsaPadrao:
        String(formData.get("assinaturaUsaPadrao") || "true") === "true",
      assinaturaSistema:
        String(formData.get("assinaturaSistema") || "").trim() || null,
      assinaturaApiUrl:
        String(formData.get("assinaturaApiUrl") || "").trim() || null,
      assinaturaApiCredenciais: parseJsonOpcional(
        String(formData.get("assinaturaApiCredenciais") || ""),
      ),
      updatedAt: new Date(),
    })
    .where(eq(fundos.id, meuFundo.id));

  audit({
    action: "update_fundo_self",
    targetType: "fundo",
    targetId: meuFundo.id,
  }).catch(() => undefined);

  revalidatePath("/painel/perfil");
  return { ok: true, fundoId: meuFundo.id };
}

export async function deleteFundoAction(fundoId: string) {
  await requireAdmin();
  // Verifica operações vinculadas
  const [{ qtd }] = await db
    .select({ qtd: count() })
    .from(operacoes)
    .where(eq(operacoes.fundoId, fundoId));
  if (qtd > 0) {
    throw new Error(
      `Não é possível deletar: ${qtd} operação(ões) ainda vinculada(s) a este fundo. Desvincule antes.`,
    );
  }
  await db.delete(fundos).where(eq(fundos.id, fundoId));
  audit({
    action: "delete_fundo",
    targetType: "fundo",
    targetId: fundoId,
  }).catch(() => undefined);
  revalidatePath("/admin/fundos");
}

/* =========================================
   QUERIES
   ========================================= */

export async function listAllFundos() {
  // Stats agregadas por fundo
  const stats = await db
    .select({
      fundoId: operacoes.fundoId,
      qtdOperacoes: count(),
      valorOperado: sql<string>`COALESCE(SUM(${operacoes.valorPresente}) FILTER (WHERE ${operacoes.status} NOT IN ('rascunho','recusada','cancelada')), 0)`,
    })
    .from(operacoes)
    .groupBy(operacoes.fundoId);

  const statsMap = new Map(
    stats.map((s) => [
      s.fundoId,
      { qtd: s.qtdOperacoes, valor: parseFloat(s.valorOperado) },
    ]),
  );

  const list = await db
    .select()
    .from(fundos)
    .orderBy(desc(fundos.createdAt));

  return list.map((f) => ({
    ...f,
    qtdOperacoes: statsMap.get(f.id)?.qtd ?? 0,
    valorOperado: statsMap.get(f.id)?.valor ?? 0,
  }));
}

/** Busca apenas dados básicos pra dropdown/selector. */
export async function listFundosForSelector() {
  return db
    .select({
      id: fundos.id,
      razaoSocial: fundos.razaoSocial,
      nomeFantasia: fundos.nomeFantasia,
      taxaMensalBase: fundos.taxaMensalBase,
    })
    .from(fundos)
    .where(eq(fundos.isActive, true))
    .orderBy(fundos.razaoSocial);
}

export async function getFundoDetail(fundoId: string) {
  const [f] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  if (!f) return null;

  // Owner user (login do fundo)
  const owner = f.ownerUserId
    ? (
        await db
          .select()
          .from(users)
          .where(eq(users.id, f.ownerUserId))
          .limit(1)
      )[0] ?? null
    : null;

  // Operações + agregados
  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      taxaMensal: operacoes.taxaMensal,
      dataVenda: operacoes.dataVenda,
      createdAt: operacoes.createdAt,
      construtoraNome: construtoras.razaoSocial,
      corretorNome: users.nome,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(users, eq(operacoes.corretorUserId, users.id))
    .where(eq(operacoes.fundoId, fundoId))
    .orderBy(desc(operacoes.createdAt));

  const totals = ops.reduce(
    (acc, o) => {
      const vp = parseFloat(o.valorPresente);
      const desagio = parseFloat(o.desagio);
      acc.valorOperado += vp;
      acc.lucroDesagio += desagio;
      acc.qtd += 1;
      if (
        ["enviada_para_assinatura", "enviada_para_pagamento", "realizada"].includes(
          o.status,
        )
      ) {
        acc.valorAtivo += vp;
      }
      return acc;
    },
    { valorOperado: 0, lucroDesagio: 0, valorAtivo: 0, qtd: 0 },
  );

  return { fundo: f, owner, operacoes: ops, totals };
}

/* =========================================
   FUNDO — dados próprios (role=fundo logado)
   ========================================= */

export async function getCurrentFundo() {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo") return null;
  const [f] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.ownerUserId, user.id))
    .limit(1);
  return f ?? null;
}

export async function getFundoDashboard() {
  const fundo = await getCurrentFundo();
  if (!fundo) return null;

  // Operações do fundo
  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      taxaMensalOp: operacoes.taxaMensal,
      taxaFundoSnapshot: operacoes.taxaFundoSnapshot,
      numeroParcelas: operacoes.numeroParcelas,
      dataVenda: operacoes.dataVenda,
      createdAt: operacoes.createdAt,
      construtoraNome: construtoras.razaoSocial,
      construtoraId: operacoes.construtoraId,
      corretorNome: users.nome,
      corretorEmail: users.email,
      imobiliariaId: operacoes.imobiliariaId,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(users, eq(operacoes.corretorUserId, users.id))
    .where(eq(operacoes.fundoId, fundo.id))
    .orderBy(desc(operacoes.createdAt));

  // Parcelas dessas operações
  const opIds = ops.map((o) => o.id);
  const todas = opIds.length
    ? await db
        .select()
        .from(parcelasComissao)
        .where(inArray(parcelasComissao.operacaoId, opIds))
    : [];

  // Soma de custos por operação — pro cálculo de resultado (juros − custos)
  const custosByOp = new Map<string, number>();
  if (opIds.length) {
    const idsList = sql.join(
      opIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    const custosResult = await db.execute(sql`
      SELECT operacao_id::text AS op_id, SUM(valor)::float AS total
      FROM custos_operacao
      WHERE operacao_id IN (${idsList})
      GROUP BY operacao_id
    `);
    const rows =
      (custosResult as unknown as { rows: { op_id: string; total: number }[] })
        .rows ?? [];
    for (const r of rows) custosByOp.set(r.op_id, r.total);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  let aVencer = 0;
  let vencidas = 0;
  let pagasNoMes = 0;
  let totalLucro = 0;
  for (const p of todas) {
    const valor = parseFloat(p.valor);
    const venc = new Date(p.vencimento + "T00:00:00");
    if (p.status === "paga") {
      if (p.pagoEm && new Date(p.pagoEm + "T00:00:00") >= monthStart) {
        pagasNoMes += parseFloat(p.pagoValor ?? p.valor);
      }
    } else {
      if (venc < today) vencidas += valor;
      else aVencer += valor;
    }
  }
  // totalLucro pro fundo = parte_fundo = custo_dinheiro + spread/2
  // custo_dinheiro = juros × (taxa_fundo / taxa_op)
  // spread        = max(0, juros − custo_dinheiro)
  const taxaFundo = parseFloat(fundo.taxaMensalBase ?? "0");
  for (const o of ops) {
    if (
      ["pre_aprovada", "analise_final", "enviada_para_assinatura", "enviada_para_pagamento", "realizada"].includes(
        o.status,
      )
    ) {
      const juros = parseFloat(o.desagio);
      const taxaOp = parseFloat(o.taxaMensalOp ?? "0");
      if (taxaOp <= 0) continue;
      // Usa snapshot por op se disponível, senão taxa atual do fundo.
      const taxaFundoEfetiva = o.taxaFundoSnapshot
        ? parseFloat(o.taxaFundoSnapshot)
        : taxaFundo;
      const razao = Math.min(1, taxaFundoEfetiva / taxaOp);
      const custoDinheiro = juros * razao;
      const spread = Math.max(0, juros - custoDinheiro);
      totalLucro += custoDinheiro + spread / 2;
    }
  }

  // Construtoras únicas
  const cMap = new Map<
    string,
    { id: string; nome: string; qtd: number; valorOperado: number }
  >();
  for (const o of ops) {
    if (!o.construtoraId) continue;
    const cur = cMap.get(o.construtoraId);
    if (cur) {
      cur.qtd++;
      cur.valorOperado += parseFloat(o.valorPresente);
    } else {
      cMap.set(o.construtoraId, {
        id: o.construtoraId,
        nome: o.construtoraNome ?? "—",
        qtd: 1,
        valorOperado: parseFloat(o.valorPresente),
      });
    }
  }
  const construtorasOperadas = Array.from(cMap.values()).sort(
    (a, b) => b.valorOperado - a.valorOperado,
  );

  // Imobiliárias únicas
  const iMap = new Map<
    string,
    { id: string; nome: string; cnpj: string; qtd: number; valorOperado: number }
  >();
  if (opIds.length) {
    const imobJoin = await db
      .select({
        id: operacoes.id,
        imobId: operacoes.imobiliariaId,
        razaoSocial: imobiliarias.razaoSocial,
        cnpj: imobiliarias.cnpj,
        valorPresente: operacoes.valorPresente,
      })
      .from(operacoes)
      .leftJoin(imobiliarias, eq(operacoes.imobiliariaId, imobiliarias.id))
      .where(eq(operacoes.fundoId, fundo.id));
    for (const r of imobJoin) {
      if (!r.imobId || !r.razaoSocial) continue;
      const cur = iMap.get(r.imobId);
      if (cur) {
        cur.qtd++;
        cur.valorOperado += parseFloat(r.valorPresente);
      } else {
        iMap.set(r.imobId, {
          id: r.imobId,
          nome: r.razaoSocial,
          cnpj: r.cnpj ?? "",
          qtd: 1,
          valorOperado: parseFloat(r.valorPresente),
        });
      }
    }
  }
  const imobiliariasOperadas = Array.from(iMap.values()).sort(
    (a, b) => b.valorOperado - a.valorOperado,
  );

  return {
    fundo,
    operacoes: ops,
    totals: {
      qtdOperacoes: ops.length,
      valorAVencer: aVencer,
      valorVencido: vencidas,
      faturadoNoMes: pagasNoMes,
      lucroAcumulado: totalLucro,
    },
    construtoras: construtorasOperadas,
    imobiliarias: imobiliariasOperadas,
  };
}

/**
 * Lista parcelas a receber pelo fundo: cada parcela das operações que ele
 * financia, ordenadas por vencimento.
 *
 * Retorna `null` se o usuário não é fundo. Operações em status pré-aprovação
 * são excluídas (parcelas só "valem" pro fundo após desembolso = realizada
 * em diante; mas incluímos pre_aprovada→realizada pra que ele veja o
 * cronograma esperado).
 */
export async function getRecebimentosFundo() {
  const fundo = await getCurrentFundo();
  if (!fundo) return null;

  const rows = await db
    .select({
      parcelaId: parcelasComissao.id,
      numero: parcelasComissao.numero,
      valor: parcelasComissao.valor,
      vencimento: parcelasComissao.vencimento,
      statusParcela: parcelasComissao.status,
      pagoEm: parcelasComissao.pagoEm,
      pagoValor: parcelasComissao.pagoValor,
      operacaoId: operacoes.id,
      operacaoNumero: operacoes.numero,
      operacaoStatus: operacoes.status,
      construtoraNome: construtoras.razaoSocial,
      corretorNome: users.nome,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(users, eq(operacoes.corretorUserId, users.id))
    .where(
      sql`${operacoes.fundoId} = ${fundo.id} AND ${operacoes.status} IN ('pre_aprovada','analise_final','enviada_para_assinatura','enviada_para_pagamento','realizada')`,
    )
    .orderBy(parcelasComissao.vencimento);

  return { fundo, parcelas: rows };
}
