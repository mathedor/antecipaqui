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

/**
 * Agregação dos últimos 12 meses pra dashboards do admin.
 * Considera todas operações exceto rascunho/recusada/cancelada.
 * Lucro = soma do deságio (juros que ficam com a Antecipaqui).
 *
 * Retorna SEMPRE 12 meses (mesmo que vazios) ordenados do mais antigo
 * pro mais recente, formato { month: "2026-01", label: "jan/26",
 * operacoes, lucro, valorAntecipado, valorComissao }.
 */
/** Extrai array de rows de qualquer formato retornado por db.execute() */
function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function getAdminMonthlyStats() {
  await requireAdmin();
  const result = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COUNT(*)::int AS operacoes,
      COALESCE(SUM(desagio), 0)::float AS lucro,
      COALESCE(SUM(valor_presente), 0)::float AS valor_antecipado,
      COALESCE(SUM(valor_comissao), 0)::float AS valor_comissao
    FROM operacoes
    WHERE created_at >= date_trunc('month', now()) - interval '11 months'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada')
    GROUP BY date_trunc('month', created_at)
  `);

  const rows = extractRows<{
    month: string;
    operacoes: number;
    lucro: number;
    valor_antecipado: number;
    valor_comissao: number;
  }>(result);

  return fillMonthlySeries(
    rows.map((r) => ({
      month: r.month,
      operacoes: Number(r.operacoes),
      lucro: Number(r.lucro),
      valorAntecipado: Number(r.valor_antecipado),
      valorComissao: Number(r.valor_comissao),
    })),
  );
}

/**
 * Preenche meses faltantes com zeros pra ter sempre 12 entradas
 * cronologicamente ordenadas. Adiciona label "mmm/aa" pt-BR.
 */
function fillMonthlySeries<
  T extends {
    month: string;
    operacoes: number;
    lucro: number;
    valorAntecipado: number;
    valorComissao: number;
  },
>(rows: T[]) {
  const map = new Map(rows.map((r) => [r.month, r]));
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);

  const result: Array<{
    month: string;
    label: string;
    operacoes: number;
    lucro: number;
    valorAntecipado: number;
    valorComissao: number;
  }> = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      .replace(".", "")
      .replace(" de ", "/");
    const found = map.get(monthKey);
    result.push({
      month: monthKey,
      label,
      operacoes: found?.operacoes ?? 0,
      lucro: found?.lucro ?? 0,
      valorAntecipado: found?.valorAntecipado ?? 0,
      valorComissao: found?.valorComissao ?? 0,
    });
  }
  return result;
}

export async function getAllOperacoes(filters?: {
  status?: string;
  from?: string;
  to?: string;
}) {
  const filterStatus = filters?.status;
  const from = filters?.from;
  const to = filters?.to;

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

  const conds = [];
  if (filterStatus) conds.push(eq(operacoes.status, filterStatus as never));
  if (from) conds.push(sql`${operacoes.createdAt} >= ${from}::timestamptz`);
  if (to)
    conds.push(
      sql`${operacoes.createdAt} <= (${to}::date + interval '1 day')`,
    );

  return conds.length > 0
    ? base.where(and(...conds)).orderBy(desc(operacoes.createdAt))
    : base.orderBy(desc(operacoes.createdAt));
}

/** Stats agregados pra topo da listagem admin de operações */
export async function getAdminOperacoesStatBoxes() {
  await requireAdmin();
  const monthStart = (() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  })();

  const all = await db
    .select({
      status: operacoes.status,
      valorPresente: operacoes.valorPresente,
      createdAt: operacoes.createdAt,
    })
    .from(operacoes);

  const ativas = all.filter(
    (o) => !["rascunho", "recusada", "cancelada"].includes(o.status),
  );
  const valorTotalAntecipado = ativas.reduce(
    (s, o) => s + parseFloat(o.valorPresente),
    0,
  );
  const operacoesNoMes = all.filter(
    (o) => new Date(o.createdAt).toISOString() >= monthStart,
  ).length;
  const pendentesAprovacao = all.filter((o) =>
    ["aguardando_aprovacao", "documentos_incompletos"].includes(o.status),
  ).length;

  return {
    totalOperacoes: all.length,
    valorTotalAntecipado,
    operacoesNoMes,
    pendentesAprovacao,
  };
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
      isActive: users.isActive,
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

  // Conta documentos KYC por user (tipo contrato_social + comprovante_endereco)
  const docs = await db
    .select({ userId: documentos.userId, tipo: documentos.tipo })
    .from(documentos);

  const docsByUser = new Map<string, Set<string>>();
  for (const d of docs) {
    if (!d.userId) continue;
    if (!docsByUser.has(d.userId)) docsByUser.set(d.userId, new Set());
    docsByUser.get(d.userId)!.add(d.tipo);
  }

  return rows.map((u) => {
    const dt = docsByUser.get(u.id) ?? new Set();
    const hasContrato = dt.has("contrato_social");
    const hasComprovante = dt.has("comprovante_endereco");
    const cadastroCompleto =
      u.role === "admin"
        ? true
        : u.role === "construtora"
          ? u.onboardingStatus === "aprovado"
          : hasContrato && hasComprovante;
    return {
      ...u,
      totalOperacoes: opMap.get(u.id) ?? 0,
      cadastroCompleto,
      docsFaltando:
        u.role === "corretor" || u.role === "imobiliaria"
          ? [
              !hasContrato && "Contrato social",
              !hasComprovante && "Comprovante de endereço",
            ].filter(Boolean) as string[]
          : [],
    };
  });
}

export async function listAllConstrutoras() {
  const rows = await db
    .select({
      id: construtoras.id,
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      cnpj: construtoras.cnpj,
      telefone: construtoras.telefone,
      email: construtoras.email,
      onboardingStatus: construtoras.onboardingStatus,
      isActive: construtoras.isActive,
      ownerUserId: construtoras.ownerUserId,
      createdAt: construtoras.createdAt,
    })
    .from(construtoras)
    .orderBy(desc(construtoras.createdAt));

  // Documentos por construtora (pra calcular cadastro completo)
  const docs = await db
    .select({
      construtoraId: documentos.construtoraId,
      tipo: documentos.tipo,
    })
    .from(documentos);
  const docsByConstrutora = new Map<string, Set<string>>();
  for (const d of docs) {
    if (!d.construtoraId) continue;
    if (!docsByConstrutora.has(d.construtoraId))
      docsByConstrutora.set(d.construtoraId, new Set());
    docsByConstrutora.get(d.construtoraId)!.add(d.tipo);
  }

  return rows.map((c) => {
    const dt = docsByConstrutora.get(c.id) ?? new Set();
    const hasContrato = dt.has("contrato_social");
    const hasComprovante = dt.has("comprovante_endereco");
    const cadastroCompleto =
      c.onboardingStatus === "aprovado" || (hasContrato && hasComprovante);
    return {
      ...c,
      cadastroCompleto,
      docsFaltando: [
        !hasContrato && "Contrato social",
        !hasComprovante && "Comprovante de endereço",
      ].filter(Boolean) as string[],
    };
  });
}

/** Stats mensais (12 meses) das operações de um corretor específico. */
export async function getUserMonthlyStats(userId: string) {
  const result = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COUNT(*)::int AS operacoes,
      COALESCE(SUM(valor_presente), 0)::float AS valor_antecipado,
      COALESCE(SUM(valor_comissao), 0)::float AS valor_comissao,
      COALESCE(SUM(desagio), 0)::float AS lucro
    FROM operacoes
    WHERE corretor_user_id = ${userId}
      AND created_at >= date_trunc('month', now()) - interval '11 months'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada')
    GROUP BY date_trunc('month', created_at)
  `);
  const rows = extractRows<{
    month: string;
    operacoes: number;
    valor_antecipado: number;
    valor_comissao: number;
    lucro: number;
  }>(result);
  return fillMonthlySeries(
    rows.map((r) => ({
      month: r.month,
      operacoes: Number(r.operacoes),
      lucro: Number(r.lucro),
      valorAntecipado: Number(r.valor_antecipado),
      valorComissao: Number(r.valor_comissao),
    })),
  );
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
      valorComissao: operacoes.valorComissao,
      desagio: operacoes.desagio,
      createdAt: operacoes.createdAt,
      construtoraId: operacoes.construtoraId,
      construtoraNome: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .where(eq(operacoes.corretorUserId, userId))
    .orderBy(desc(operacoes.createdAt));

  // Agrupa construtoras únicas com agregados (qtd operações + total antecipado)
  const construtorasMap = new Map<
    string,
    {
      id: string;
      nome: string;
      cnpj: string;
      operacoes: number;
      valorAntecipado: number;
    }
  >();
  for (const op of userOps) {
    if (!op.construtoraId) continue;
    const existing = construtorasMap.get(op.construtoraId);
    if (existing) {
      existing.operacoes += 1;
      existing.valorAntecipado += parseFloat(op.valorPresente);
    } else {
      construtorasMap.set(op.construtoraId, {
        id: op.construtoraId,
        nome: op.construtoraNome ?? "—",
        cnpj: op.construtoraCnpj ?? "",
        operacoes: 1,
        valorAntecipado: parseFloat(op.valorPresente),
      });
    }
  }
  const construtorasNegocio = Array.from(construtorasMap.values()).sort(
    (a, b) => b.valorAntecipado - a.valorAntecipado,
  );

  return {
    user: u,
    imobiliaria: imob,
    documentos: docs,
    operacoes: userOps,
    construtoras: construtorasNegocio,
  };
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
