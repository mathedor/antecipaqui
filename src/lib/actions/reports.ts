"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";

export type ReportFilters = {
  /** ISO date inicial (createdAt das operações) */
  from?: string;
  /** ISO date final */
  to?: string;
  /** "ativo" | "inativo" — refere-se a is_active da empresa */
  cadastroStatus?: string;
  /** valor do enum operacao_status (ex: "realizada"). Vazio = todos. */
  operacaoStatus?: string;
  /** Fundo selecionado. "_no_fundo_" = ops sem fundo. Vazio = todos. */
  fundoId?: string;
};

type RankingRow = {
  id: string;
  nome: string;
  documento: string; // CNPJ
  email: string | null;
  telefone: string | null;
  isActive: boolean;
  qtdOperacoes: number;
  valorOperado: number;
  valorPago: number;
  valorAberto: number;
  ownerUserId: string | null;
};

function buildOpFilters({
  from,
  to,
  operacaoStatus,
  fundoId,
}: Pick<ReportFilters, "from" | "to" | "operacaoStatus" | "fundoId">) {
  // Cláusulas que entram em cada agregação (referenciam alias `o`)
  const parts: ReturnType<typeof sql>[] = [];
  if (from)
    parts.push(sql`o.created_at >= ${from}::timestamptz`);
  if (to)
    parts.push(
      sql`o.created_at <= (${to}::date + interval '1 day')::timestamptz`,
    );
  if (operacaoStatus)
    parts.push(sql`o.status = ${operacaoStatus}::operacao_status`);
  if (fundoId === "_no_fundo_") parts.push(sql`o.fundo_id IS NULL`);
  else if (fundoId) parts.push(sql`o.fundo_id = ${fundoId}::uuid`);
  if (parts.length === 0) return sql`TRUE`;
  return sql.join(parts, sql` AND `);
}

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

/* ============================================================
   RANKING DE CONSTRUTORAS
   ============================================================ */
export async function getConstrutorasRanking(
  filters: ReportFilters = {},
): Promise<RankingRow[]> {
  await requireAdmin();
  const opFilter = buildOpFilters(filters);

  // is_active filter — aplica no SELECT da construtora
  const cadastroFilter =
    filters.cadastroStatus === "ativo"
      ? sql`AND c.is_active = TRUE`
      : filters.cadastroStatus === "inativo"
        ? sql`AND c.is_active = FALSE`
        : sql``;

  const result = await db.execute(sql`
    SELECT
      c.id,
      c.razao_social AS nome,
      c.cnpj AS documento,
      c.email,
      c.telefone,
      c.is_active,
      c.owner_user_id,
      COALESCE(COUNT(o.id) FILTER (
        WHERE ${opFilter}
          AND o.status NOT IN ('rascunho','recusada','cancelada')
      ), 0)::int AS qtd_operacoes,
      COALESCE(SUM(o.valor_comissao) FILTER (
        WHERE ${opFilter}
          AND o.status NOT IN ('rascunho','recusada','cancelada')
      ), 0)::float AS valor_operado,
      COALESCE(SUM(o.valor_presente) FILTER (
        WHERE ${opFilter}
          AND o.status = 'realizada'
      ), 0)::float AS valor_pago,
      COALESCE(SUM(o.valor_presente) FILTER (
        WHERE ${opFilter}
          AND o.status IN (
            'aguardando_aprovacao',
            'documentos_incompletos',
            'pre_aprovada',
            'analise_final',
            'enviada_para_assinatura',
            'enviada_para_pagamento'
          )
      ), 0)::float AS valor_aberto
    FROM construtoras c
    LEFT JOIN operacoes o ON o.construtora_id = c.id
    WHERE TRUE ${cadastroFilter}
    GROUP BY c.id
    ORDER BY valor_operado DESC NULLS LAST, qtd_operacoes DESC, c.razao_social
  `);

  return extractRows<{
    id: string;
    nome: string;
    documento: string;
    email: string | null;
    telefone: string | null;
    is_active: boolean;
    owner_user_id: string | null;
    qtd_operacoes: number;
    valor_operado: number;
    valor_pago: number;
    valor_aberto: number;
  }>(result).map((r) => ({
    id: r.id,
    nome: r.nome,
    documento: r.documento,
    email: r.email,
    telefone: r.telefone,
    isActive: r.is_active,
    ownerUserId: r.owner_user_id,
    qtdOperacoes: Number(r.qtd_operacoes),
    valorOperado: Number(r.valor_operado),
    valorPago: Number(r.valor_pago),
    valorAberto: Number(r.valor_aberto),
  }));
}

/* ============================================================
   RANKING DE IMOBILIÁRIAS / CORRETORES
   Agrupa por user (corretor) — pega imobiliária dele se existir.
   ============================================================ */
export async function getImobiliariasRanking(
  filters: ReportFilters = {},
): Promise<RankingRow[]> {
  await requireAdmin();
  const opFilter = buildOpFilters(filters);

  const cadastroFilter =
    filters.cadastroStatus === "ativo"
      ? sql`AND u.is_active = TRUE`
      : filters.cadastroStatus === "inativo"
        ? sql`AND u.is_active = FALSE`
        : sql``;

  const result = await db.execute(sql`
    SELECT
      u.id AS user_id,
      COALESCE(im.razao_social, u.nome, u.email) AS nome,
      COALESCE(im.cnpj, '') AS documento,
      u.email,
      u.telefone,
      u.is_active,
      COALESCE(COUNT(o.id) FILTER (
        WHERE ${opFilter}
          AND o.status NOT IN ('rascunho','recusada','cancelada')
      ), 0)::int AS qtd_operacoes,
      COALESCE(SUM(o.valor_comissao) FILTER (
        WHERE ${opFilter}
          AND o.status NOT IN ('rascunho','recusada','cancelada')
      ), 0)::float AS valor_operado,
      COALESCE(SUM(o.valor_presente) FILTER (
        WHERE ${opFilter}
          AND o.status = 'realizada'
      ), 0)::float AS valor_pago,
      COALESCE(SUM(o.valor_presente) FILTER (
        WHERE ${opFilter}
          AND o.status IN (
            'aguardando_aprovacao',
            'documentos_incompletos',
            'pre_aprovada',
            'analise_final',
            'enviada_para_assinatura',
            'enviada_para_pagamento'
          )
      ), 0)::float AS valor_aberto
    FROM users u
    LEFT JOIN imobiliarias im ON im.owner_user_id = u.id
    LEFT JOIN operacoes o ON o.corretor_user_id = u.id
    WHERE u.role IN ('corretor','imobiliaria') ${cadastroFilter}
    GROUP BY u.id, im.razao_social, im.cnpj
    ORDER BY valor_operado DESC NULLS LAST, qtd_operacoes DESC, nome
  `);

  return extractRows<{
    user_id: string;
    nome: string;
    documento: string;
    email: string;
    telefone: string | null;
    is_active: boolean;
    qtd_operacoes: number;
    valor_operado: number;
    valor_pago: number;
    valor_aberto: number;
  }>(result).map((r) => ({
    id: r.user_id,
    nome: r.nome,
    documento: r.documento,
    email: r.email,
    telefone: r.telefone,
    isActive: r.is_active,
    ownerUserId: r.user_id,
    qtdOperacoes: Number(r.qtd_operacoes),
    valorOperado: Number(r.valor_operado),
    valorPago: Number(r.valor_pago),
    valorAberto: Number(r.valor_aberto),
  }));
}

/* ============================================================
   RANKING DE FUNDOS
   Mesmo formato dos demais — agrega operações por fundo_id.
   ============================================================ */
export async function getFundosRanking(
  filters: ReportFilters = {},
): Promise<RankingRow[]> {
  await requireAdmin();
  const opFilter = buildOpFilters(filters);

  const cadastroFilter =
    filters.cadastroStatus === "ativo"
      ? sql`AND f.is_active = TRUE`
      : filters.cadastroStatus === "inativo"
        ? sql`AND f.is_active = FALSE`
        : sql``;

  const result = await db.execute(sql`
    SELECT
      f.id,
      f.razao_social AS nome,
      f.cnpj AS documento,
      f.email_comercial AS email,
      f.telefone,
      f.is_active,
      f.owner_user_id,
      COALESCE(COUNT(o.id) FILTER (
        WHERE ${opFilter}
          AND o.status NOT IN ('rascunho','recusada','cancelada')
      ), 0)::int AS qtd_operacoes,
      COALESCE(SUM(o.valor_comissao) FILTER (
        WHERE ${opFilter}
          AND o.status NOT IN ('rascunho','recusada','cancelada')
      ), 0)::float AS valor_operado,
      COALESCE(SUM(o.valor_presente) FILTER (
        WHERE ${opFilter}
          AND o.status = 'realizada'
      ), 0)::float AS valor_pago,
      COALESCE(SUM(o.valor_presente) FILTER (
        WHERE ${opFilter}
          AND o.status IN (
            'aguardando_aprovacao',
            'documentos_incompletos',
            'pre_aprovada',
            'analise_final',
            'enviada_para_assinatura',
            'enviada_para_pagamento'
          )
      ), 0)::float AS valor_aberto
    FROM fundos f
    LEFT JOIN operacoes o ON o.fundo_id = f.id
    WHERE TRUE ${cadastroFilter}
    GROUP BY f.id
    ORDER BY valor_operado DESC NULLS LAST, qtd_operacoes DESC, f.razao_social
  `);

  return extractRows<{
    id: string;
    nome: string;
    documento: string;
    email: string | null;
    telefone: string | null;
    is_active: boolean;
    owner_user_id: string | null;
    qtd_operacoes: number;
    valor_operado: number;
    valor_pago: number;
    valor_aberto: number;
  }>(result).map((r) => ({
    id: r.id,
    nome: r.nome,
    documento: r.documento,
    email: r.email,
    telefone: r.telefone,
    isActive: r.is_active,
    ownerUserId: r.owner_user_id,
    qtdOperacoes: Number(r.qtd_operacoes),
    valorOperado: Number(r.valor_operado),
    valorPago: Number(r.valor_pago),
    valorAberto: Number(r.valor_aberto),
  }));
}
