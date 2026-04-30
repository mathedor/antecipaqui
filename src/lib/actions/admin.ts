"use server";

import { revalidatePath } from "next/cache";
import { eq, sql, desc, and, count } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  imobiliarias,
  construtoras,
  operacoes,
  parcelasComissao,
  documentos,
  operacaoEvents,
  type User,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { generateContractForOperacao } from "@/lib/actions/contract";

/* =========================================
   STATS — Admin dashboard
   ========================================= */

export async function getAdminStats() {
  const ops = await db
    .select({
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
    })
    .from(operacoes);

  const sumComissao = (statuses: string[]) =>
    ops
      .filter((o) => statuses.includes(o.status))
      .reduce((s, o) => s + parseFloat(o.valorComissao), 0);

  const sumVP = (statuses: string[]) =>
    ops
      .filter((o) => statuses.includes(o.status))
      .reduce((s, o) => s + parseFloat(o.valorPresente), 0);

  // Parcelas a vencer / vencidas
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parcelas = await db
    .select({
      valor: parcelasComissao.valor,
      vencimento: parcelasComissao.vencimento,
      status: parcelasComissao.status,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
    .where(
      sql`${operacoes.status} IN ('pre_aprovada', 'analise_final', 'enviada_para_assinatura', 'enviada_para_pagamento')`,
    );

  const aVencer = parcelas
    .filter((p) => p.status === "a_vencer")
    .reduce((s, p) => s + parseFloat(p.valor), 0);

  const vencidas = parcelas
    .filter((p) => {
      if (p.status === "vencida") return true;
      if (p.status !== "a_vencer") return false;
      const v = new Date(p.vencimento + "T00:00:00");
      return v < today;
    })
    .reduce((s, p) => s + parseFloat(p.valor), 0);

  const STATUS_PENDING = ["aguardando_aprovacao", "documentos_incompletos"];
  const STATUS_APROVADAS = [
    "pre_aprovada",
    "analise_final",
    "enviada_para_assinatura",
    "enviada_para_pagamento",
  ];

  return {
    totalOperacoes: ops.length,
    pendentesAprovacao: ops.filter((o) => STATUS_PENDING.includes(o.status))
      .length,
    aprovadas: ops.filter((o) => STATUS_APROVADAS.includes(o.status)).length,
    recusadas: ops.filter((o) => o.status === "recusada").length,
    liquidadas: ops.filter((o) => o.status === "realizada").length,
    valorComissaoTotal: sumComissao([
      ...STATUS_PENDING,
      ...STATUS_APROVADAS,
      "realizada",
    ]),
    valorAntecipado: sumVP([...STATUS_APROVADAS, "realizada"]),
    aVencer,
    vencidas,
  };
}

export async function getAllOperacoes(filterStatus?: string) {
  const base = db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      dataVenda: operacoes.dataVenda,
      createdAt: operacoes.createdAt,
      construtoraNome: construtoras.razaoSocial,
      corretorNome: users.nome,
      corretorEmail: users.email,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(users, eq(operacoes.corretorUserId, users.id));

  return filterStatus
    ? base
        .where(eq(operacoes.status, filterStatus as never))
        .orderBy(desc(operacoes.createdAt))
    : base.orderBy(desc(operacoes.createdAt));
}

export async function getAdminOperacaoDetail(operacaoId: string) {
  const [op] = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorVenda: operacoes.valorVenda,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      dataVenda: operacoes.dataVenda,
      numeroParcelas: operacoes.numeroParcelas,
      taxaMensal: operacoes.taxaMensal,
      motivoRecusa: operacoes.motivoRecusa,
      motivoPendencia: operacoes.motivoPendencia,
      aprovadoEm: operacoes.aprovadoEm,
      liquidadoEm: operacoes.liquidadoEm,
      createdAt: operacoes.createdAt,
      imobiliariaId: operacoes.imobiliariaId,
      corretorUserId: operacoes.corretorUserId,
      corretorNome: users.nome,
      corretorEmail: users.email,
      corretorTelefone: users.telefone,
      construtoraId: operacoes.construtoraId,
      construtoraNome: construtoras.razaoSocial,
      construtoraNomeFantasia: construtoras.nomeFantasia,
      construtoraCnpj: construtoras.cnpj,
      construtoraTelefone: construtoras.telefone,
      construtoraEmail: construtoras.email,
      construtoraEndereco: construtoras.endereco,
      construtoraCidade: construtoras.cidade,
      construtoraUf: construtoras.uf,
      construtoraCep: construtoras.cep,
      construtoraOwnerUserId: construtoras.ownerUserId,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(users, eq(operacoes.corretorUserId, users.id))
    .where(eq(operacoes.id, operacaoId))
    .limit(1);

  if (!op) return null;

  const imobiliaria = op.imobiliariaId
    ? (
        await db
          .select()
          .from(imobiliarias)
          .where(eq(imobiliarias.id, op.imobiliariaId))
          .limit(1)
      )[0] ?? null
    : null;

  const construtoraOwner = op.construtoraOwnerUserId
    ? (
        await db
          .select({
            id: users.id,
            nome: users.nome,
            email: users.email,
            telefone: users.telefone,
          })
          .from(users)
          .where(eq(users.id, op.construtoraOwnerUserId))
          .limit(1)
      )[0] ?? null
    : null;

  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, operacaoId))
    .orderBy(parcelasComissao.numero);

  const docs = await db
    .select()
    .from(documentos)
    .where(eq(documentos.operacaoId, operacaoId))
    .orderBy(documentos.createdAt);

  const events = await db
    .select()
    .from(operacaoEvents)
    .where(eq(operacaoEvents.operacaoId, operacaoId))
    .orderBy(desc(operacaoEvents.createdAt));

  return {
    ...op,
    imobiliaria,
    construtoraOwner,
    parcelas,
    documentos: docs,
    events,
  };
}

/* =========================================
   ACTIONS — Regenerar contrato (admin)
   ========================================= */

/** Botão "Regenerar contrato" — útil se o primeiro deu erro ou dados mudaram. */
export async function regenerateContractAction(operacaoId: string) {
  const admin = await requireAdmin();
  const { contratoId, url } = await generateContractForOperacao(operacaoId);
  await db.insert(operacaoEvents).values({
    operacaoId,
    userId: admin.id,
    type: "contract_regenerated",
    payload: { contratoId, url },
  });
  revalidatePath(`/admin/operacoes/${operacaoId}`);
  revalidatePath(`/painel/operacoes/${operacaoId}`);
  return { url };
}

/* =========================================
   USERS / EMPRESAS — Aprovar onboarding KYC
   ========================================= */

export async function approveUserOnboardingAction(userId: string) {
  await requireAdmin();
  await db
    .update(users)
    .set({ onboardingStatus: "aprovado", updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/construtoras");
}

export async function approveConstrutoraOnboardingAction(construtoraId: string) {
  await requireAdmin();
  await db
    .update(construtoras)
    .set({ onboardingStatus: "aprovado", updatedAt: new Date() })
    .where(eq(construtoras.id, construtoraId));
  revalidatePath("/admin/construtoras");
}

export async function rejectUserOnboardingAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  if (!userId) throw new Error("userId obrigatório");
  await db
    .update(users)
    .set({ onboardingStatus: "recusado", updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/usuarios");
}

/* =========================================
   LISTINGS — corretores e construtoras
   ========================================= */

export async function listAllUsers() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      nome: users.nome,
      role: users.role,
      onboardingStatus: users.onboardingStatus,
      telefone: users.telefone,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Conta operações por user
  const opCounts = await db
    .select({
      corretorUserId: operacoes.corretorUserId,
      total: count(),
    })
    .from(operacoes)
    .groupBy(operacoes.corretorUserId);

  const opMap = new Map(opCounts.map((c) => [c.corretorUserId, c.total]));

  return rows.map((u) => ({
    ...u,
    totalOperacoes: opMap.get(u.id) ?? 0,
  }));
}

export async function listAllConstrutoras() {
  return db
    .select({
      id: construtoras.id,
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      cnpj: construtoras.cnpj,
      telefone: construtoras.telefone,
      email: construtoras.email,
      onboardingStatus: construtoras.onboardingStatus,
      ownerUserId: construtoras.ownerUserId,
      createdAt: construtoras.createdAt,
    })
    .from(construtoras)
    .orderBy(desc(construtoras.createdAt));
}

export async function getUserDetail(userId: string) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return null;

  const imob = (
    await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, userId))
      .limit(1)
  )[0];

  const docs = await db
    .select()
    .from(documentos)
    .where(eq(documentos.userId, userId));

  const userOps = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorPresente: operacoes.valorPresente,
      createdAt: operacoes.createdAt,
    })
    .from(operacoes)
    .where(eq(operacoes.corretorUserId, userId))
    .orderBy(desc(operacoes.createdAt));

  return { user: u, imobiliaria: imob, documentos: docs, operacoes: userOps };
}

export async function getConstrutoraDetail(construtoraId: string) {
  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
    .limit(1);
  if (!c) return null;

  const owner: User | null = c.ownerUserId
    ? (await db.select().from(users).where(eq(users.id, c.ownerUserId)).limit(1))[0] ?? null
    : null;

  const docs = await db
    .select()
    .from(documentos)
    .where(eq(documentos.construtoraId, construtoraId));

  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      createdAt: operacoes.createdAt,
    })
    .from(operacoes)
    .where(eq(operacoes.construtoraId, construtoraId))
    .orderBy(desc(operacoes.createdAt));

  return { construtora: c, owner, documentos: docs, operacoes: ops };
}
