"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireActiveUser } from "@/lib/auth-user";

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
   META HISTÓRICA — meta automática (120% do mês anterior) vs realizado,
   últimos N meses (default 6). Inclui o mês corrente.
   ============================================================ */

export type MetaHistoricaPonto = {
  ym: string; // YYYY-MM
  label: string; // ex: "mai/26"
  realVolume: number;
  realComissao: number;
  metaVolume: number;
  metaComissao: number;
  bateu: boolean;
  pctComissao: number;
};

export async function getMetaHistorica(
  comercialId: string,
  meses = 6,
): Promise<MetaHistoricaPonto[]> {
  await requireActiveUser();

  // Pega volume + comissão por mês dos últimos (meses+1) — precisa do mês
  // anterior pra calcular a meta do mês seguinte.
  const res = await db.execute(sql`
    WITH meses AS (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE) - make_interval(months => ${meses}::int),
        date_trunc('month', CURRENT_DATE),
        '1 month'
      ) AS m
    ),
    agg AS (
      SELECT
        date_trunc('month', o.created_at) AS m,
        COALESCE(SUM(o.valor_presente)::float, 0) AS volume,
        COALESCE(SUM(cc.valor_devido)::float, 0) AS comissao
      FROM operacoes o
      LEFT JOIN comissoes_comercial cc ON cc.operacao_id = o.id
      WHERE o.comercial_id = ${comercialId}::uuid
        AND o.status NOT IN ('rascunho','recusada','cancelada')
        AND o.created_at >= date_trunc('month', CURRENT_DATE) - make_interval(months => ${meses}::int)
      GROUP BY date_trunc('month', o.created_at)
    )
    SELECT
      to_char(m.m, 'YYYY-MM') AS ym,
      COALESCE(a.volume, 0)::float AS volume,
      COALESCE(a.comissao, 0)::float AS comissao
    FROM meses m
    LEFT JOIN agg a ON a.m = m.m
    ORDER BY m.m
  `);

  const raw = extractRows<{ ym: string; volume: number; comissao: number }>(res);

  const LABELS = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];

  // Meta = 120% do mês anterior; se mês anterior = 0, fallback 50k/500
  return raw.map((r, i) => {
    const prev = raw[i - 1] ?? { volume: 0, comissao: 0 };
    const metaVolume = Math.max(prev.volume * 1.2, prev.volume > 0 ? 0 : 50000);
    const metaComissao = Math.max(
      prev.comissao * 1.2,
      prev.comissao > 0 ? 0 : 500,
    );
    const [y, m] = r.ym.split("-");
    const label = `${LABELS[parseInt(m, 10) - 1]}/${y.slice(2)}`;
    return {
      ym: r.ym,
      label,
      realVolume: r.volume,
      realComissao: r.comissao,
      metaVolume,
      metaComissao,
      bateu: r.comissao >= metaComissao,
      pctComissao: metaComissao > 0 ? r.comissao / metaComissao : 0,
    };
  });
}

/* ============================================================
   PROJEÇÃO FORWARD — comissão a receber por mês nos próximos 12 meses,
   baseada nas parcelas das operações ativas vinculadas ao comercial.
   ============================================================ */

export type ProjecaoForwardPonto = {
  ym: string;
  label: string;
  valorEsperado: number;
  qtdOps: number;
};

export async function getProjecaoForward(
  comercialId: string,
  meses = 12,
): Promise<ProjecaoForwardPonto[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH meses AS (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE),
        date_trunc('month', CURRENT_DATE) + make_interval(months => ${meses - 1}::int),
        '1 month'
      ) AS m
    ),
    -- Comissões pendentes proporcionais à parcela: estimamos que a comissão
    -- "se realiza" na proporção das parcelas pagas. Então projetamos
    -- somando o valor da comissão proporcional a cada vencimento de parcela.
    parcelas_forward AS (
      SELECT
        date_trunc('month', p.vencimento)::date AS m,
        cc.valor_devido::float AS comissao_total,
        o.valor_comissao::float AS comissao_op,
        p.valor::float AS valor_parcela,
        cc.operacao_id
      FROM parcelas_comissao p
      INNER JOIN operacoes o ON o.id = p.operacao_id
      INNER JOIN comissoes_comercial cc ON cc.operacao_id = o.id
      WHERE cc.comercial_id = ${comercialId}::uuid
        AND cc.status = 'pendente'
        AND p.status IN ('a_vencer','vencida')
        AND p.vencimento >= date_trunc('month', CURRENT_DATE)
        AND p.vencimento < date_trunc('month', CURRENT_DATE) + make_interval(months => ${meses}::int)
    ),
    agg AS (
      SELECT
        m,
        SUM(
          CASE WHEN comissao_op > 0
            THEN (valor_parcela / comissao_op) * comissao_total
            ELSE 0
          END
        )::float AS valor,
        COUNT(DISTINCT operacao_id)::int AS qtd
      FROM parcelas_forward
      GROUP BY m
    )
    SELECT
      to_char(m.m, 'YYYY-MM') AS ym,
      COALESCE(a.valor, 0)::float AS valor,
      COALESCE(a.qtd, 0)::int AS qtd
    FROM meses m
    LEFT JOIN agg a ON a.m = m.m
    ORDER BY m.m
  `);

  const LABELS = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];

  return extractRows<{ ym: string; valor: number; qtd: number }>(res).map(
    (r) => {
      const [y, m] = r.ym.split("-");
      return {
        ym: r.ym,
        label: `${LABELS[parseInt(m, 10) - 1]}/${y.slice(2)}`,
        valorEsperado: r.valor,
        qtdOps: r.qtd,
      };
    },
  );
}

/* ============================================================
   PERFORMANCE MENSAL — qtd ops + valor médio + comissão por mês
   ============================================================ */

export type PerformancePonto = {
  ym: string;
  label: string;
  qtdOps: number;
  valorTotal: number;
  ticketMedio: number;
  comissao: number;
  taxaAprovacao: number; // % aprovadas / cadastradas
};

export async function getPerformanceMensal(
  comercialId: string,
  meses = 12,
): Promise<PerformancePonto[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH meses AS (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE) - make_interval(months => ${meses - 1}::int),
        date_trunc('month', CURRENT_DATE),
        '1 month'
      ) AS m
    ),
    agg AS (
      SELECT
        date_trunc('month', o.created_at) AS m,
        COUNT(*)::int AS qtd_total,
        COUNT(*) FILTER (WHERE o.status NOT IN ('rascunho','recusada','cancelada'))::int AS qtd_aprovada,
        COALESCE(SUM(o.valor_presente) FILTER (WHERE o.status NOT IN ('rascunho','recusada','cancelada'))::float, 0) AS valor_total,
        COALESCE(AVG(o.valor_presente) FILTER (WHERE o.status NOT IN ('rascunho','recusada','cancelada'))::float, 0) AS ticket,
        COALESCE(SUM(cc.valor_devido)::float, 0) AS comissao
      FROM operacoes o
      LEFT JOIN comissoes_comercial cc ON cc.operacao_id = o.id
      WHERE o.comercial_id = ${comercialId}::uuid
        AND o.created_at >= date_trunc('month', CURRENT_DATE) - make_interval(months => ${meses - 1}::int)
      GROUP BY date_trunc('month', o.created_at)
    )
    SELECT
      to_char(m.m, 'YYYY-MM') AS ym,
      COALESCE(a.qtd_aprovada, 0)::int AS qtd_ops,
      COALESCE(a.valor_total, 0)::float AS valor_total,
      COALESCE(a.ticket, 0)::float AS ticket,
      COALESCE(a.comissao, 0)::float AS comissao,
      CASE WHEN COALESCE(a.qtd_total, 0) > 0
        THEN (a.qtd_aprovada::float / a.qtd_total::float)::float
        ELSE 0
      END AS taxa_aprov
    FROM meses m
    LEFT JOIN agg a ON a.m = m.m
    ORDER BY m.m
  `);

  const LABELS = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];

  return extractRows<{
    ym: string;
    qtd_ops: number;
    valor_total: number;
    ticket: number;
    comissao: number;
    taxa_aprov: number;
  }>(res).map((r) => {
    const [y, m] = r.ym.split("-");
    return {
      ym: r.ym,
      label: `${LABELS[parseInt(m, 10) - 1]}/${y.slice(2)}`,
      qtdOps: r.qtd_ops,
      valorTotal: r.valor_total,
      ticketMedio: r.ticket,
      comissao: r.comissao,
      taxaAprovacao: r.taxa_aprov,
    };
  });
}

/* ============================================================
   FUNIL COHORT — agrupar imobiliárias por mês de cadastro,
   ver quantas operaram em até 30/60/90d.
   ============================================================ */

export type CohortPonto = {
  ym: string;
  label: string;
  cadastradas: number;
  operaram30d: number;
  operaram60d: number;
  operaram90d: number;
  taxaConversao30d: number;
  taxaConversao90d: number;
};

export async function getCohortConversao(
  comercialId: string,
  meses = 6,
): Promise<CohortPonto[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH imobs AS (
      SELECT
        i.id,
        date_trunc('month', i.created_at) AS mes_cadastro,
        i.created_at
      FROM imobiliarias i
      WHERE i.comercial_id = ${comercialId}::uuid
        AND i.created_at >= date_trunc('month', CURRENT_DATE) - make_interval(months => ${meses - 1}::int)
    ),
    primeiras_ops AS (
      SELECT
        o.imobiliaria_id,
        MIN(o.created_at) AS primeira_op
      FROM operacoes o
      WHERE o.imobiliaria_id IN (SELECT id FROM imobs)
        AND o.status NOT IN ('rascunho','recusada','cancelada')
      GROUP BY o.imobiliaria_id
    )
    SELECT
      to_char(i.mes_cadastro, 'YYYY-MM') AS ym,
      COUNT(*)::int AS cadastradas,
      COUNT(po.imobiliaria_id) FILTER (
        WHERE EXTRACT(DAY FROM (po.primeira_op - i.created_at)) <= 30
      )::int AS op_30d,
      COUNT(po.imobiliaria_id) FILTER (
        WHERE EXTRACT(DAY FROM (po.primeira_op - i.created_at)) <= 60
      )::int AS op_60d,
      COUNT(po.imobiliaria_id) FILTER (
        WHERE EXTRACT(DAY FROM (po.primeira_op - i.created_at)) <= 90
      )::int AS op_90d
    FROM imobs i
    LEFT JOIN primeiras_ops po ON po.imobiliaria_id = i.id
    GROUP BY i.mes_cadastro
    ORDER BY i.mes_cadastro
  `);

  const LABELS = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];

  return extractRows<{
    ym: string;
    cadastradas: number;
    op_30d: number;
    op_60d: number;
    op_90d: number;
  }>(res).map((r) => {
    const [y, m] = r.ym.split("-");
    return {
      ym: r.ym,
      label: `${LABELS[parseInt(m, 10) - 1]}/${y.slice(2)}`,
      cadastradas: r.cadastradas,
      operaram30d: r.op_30d,
      operaram60d: r.op_60d,
      operaram90d: r.op_90d,
      taxaConversao30d:
        r.cadastradas > 0 ? r.op_30d / r.cadastradas : 0,
      taxaConversao90d:
        r.cadastradas > 0 ? r.op_90d / r.cadastradas : 0,
    };
  });
}

/* ============================================================
   ATIVIDADE CRM — interações registradas por semana (8 semanas)
   ============================================================ */

export type AtividadeSemana = {
  semana: string; // YYYY-WW
  label: string; // "Sem 19" ou "12-18 mai"
  visitas: number;
  ligacoes: number;
  whatsapps: number;
  outras: number;
  total: number;
};

export async function getAtividadeCrm(
  comercialId: string,
  semanas = 8,
): Promise<AtividadeSemana[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH semanas AS (
      SELECT generate_series(
        date_trunc('week', CURRENT_DATE) - make_interval(weeks => ${semanas - 1}::int),
        date_trunc('week', CURRENT_DATE),
        '1 week'
      ) AS s
    ),
    agg AS (
      SELECT
        date_trunc('week', created_at) AS s,
        COUNT(*) FILTER (WHERE tipo = 'visita')::int AS visitas,
        COUNT(*) FILTER (WHERE tipo = 'ligacao')::int AS ligacoes,
        COUNT(*) FILTER (WHERE tipo = 'whatsapp')::int AS whatsapps,
        COUNT(*) FILTER (WHERE tipo NOT IN ('visita','ligacao','whatsapp'))::int AS outras
      FROM comercial_interacoes
      WHERE comercial_id = ${comercialId}::uuid
        AND created_at >= date_trunc('week', CURRENT_DATE) - make_interval(weeks => ${semanas - 1}::int)
      GROUP BY date_trunc('week', created_at)
    )
    SELECT
      to_char(s.s, 'YYYY-IW') AS semana,
      to_char(s.s, 'DD/MM') AS label,
      COALESCE(a.visitas, 0)::int AS visitas,
      COALESCE(a.ligacoes, 0)::int AS ligacoes,
      COALESCE(a.whatsapps, 0)::int AS whatsapps,
      COALESCE(a.outras, 0)::int AS outras
    FROM semanas s
    LEFT JOIN agg a ON a.s = s.s
    ORDER BY s.s
  `);

  return extractRows<{
    semana: string;
    label: string;
    visitas: number;
    ligacoes: number;
    whatsapps: number;
    outras: number;
  }>(res).map((r) => ({
    semana: r.semana,
    label: r.label,
    visitas: r.visitas,
    ligacoes: r.ligacoes,
    whatsapps: r.whatsapps,
    outras: r.outras,
    total: r.visitas + r.ligacoes + r.whatsapps + r.outras,
  }));
}
