"use server";

import { revalidatePath } from "next/cache";
import { eq, and, desc, sql, count } from "drizzle-orm";
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
      taxaMensal: operacoes.taxaMensal,
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
        .where(sql`${parcelasComissao.operacaoId} = ANY(${opIds})`)
    : [];

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
  for (const o of ops) {
    if (
      ["pre_aprovada", "analise_final", "enviada_para_assinatura", "enviada_para_pagamento", "realizada"].includes(
        o.status,
      )
    ) {
      totalLucro += parseFloat(o.desagio);
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
