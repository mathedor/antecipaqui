"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";

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

/* =========================================
   ÍNDICES — métricas e charts diversificados
   ========================================= */

export async function getIndicesData() {
  await requireAdmin();

  // Valor médio das operações (média + mediana + p25/p75)
  const valorAvgRes = await db.execute(sql`
    SELECT
      COALESCE(AVG(valor_presente)::float, 0) AS media,
      COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY valor_presente)::float, 0) AS mediana,
      COALESCE(percentile_cont(0.25) WITHIN GROUP (ORDER BY valor_presente)::float, 0) AS p25,
      COALESCE(percentile_cont(0.75) WITHIN GROUP (ORDER BY valor_presente)::float, 0) AS p75,
      COUNT(*)::int AS total
    FROM operacoes
    WHERE status NOT IN ('rascunho', 'recusada', 'cancelada')
  `);
  const valorAvg = extractRows<{
    media: number;
    mediana: number;
    p25: number;
    p75: number;
    total: number;
  }>(valorAvgRes)[0] ?? { media: 0, mediana: 0, p25: 0, p75: 0, total: 0 };

  // Distribuição por faixa de valor (histograma)
  const distRes = await db.execute(sql`
    SELECT
      CASE
        WHEN valor_presente < 5000 THEN '< 5k'
        WHEN valor_presente < 10000 THEN '5k-10k'
        WHEN valor_presente < 20000 THEN '10k-20k'
        WHEN valor_presente < 50000 THEN '20k-50k'
        WHEN valor_presente < 100000 THEN '50k-100k'
        ELSE '100k+'
      END AS faixa,
      COUNT(*)::int AS qtd,
      COALESCE(SUM(valor_presente)::float, 0) AS soma
    FROM operacoes
    WHERE status NOT IN ('rascunho', 'recusada', 'cancelada')
    GROUP BY faixa
    ORDER BY MIN(valor_presente)
  `);
  const distribuicaoValor = extractRows<{
    faixa: string;
    qtd: number;
    soma: number;
  }>(distRes);

  // Médias por dia, semana, mês (últimos 90 dias)
  const mediaDiariaRes = await db.execute(sql`
    SELECT COUNT(*)::float / GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(created_at))))::float AS media
    FROM operacoes
    WHERE created_at >= NOW() - INTERVAL '90 days'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada')
  `);
  const mediaDiaria = extractRows<{ media: number }>(mediaDiariaRes)[0]?.media ?? 0;

  const mediaSemanalRes = await db.execute(sql`
    SELECT COUNT(*)::float / GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(created_at))) / 7)::float AS media
    FROM operacoes
    WHERE created_at >= NOW() - INTERVAL '90 days'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada')
  `);
  const mediaSemanal = extractRows<{ media: number }>(mediaSemanalRes)[0]?.media ?? 0;

  const mediaMensalRes = await db.execute(sql`
    SELECT COUNT(*)::float / GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(created_at))) / 30)::float AS media
    FROM operacoes
    WHERE created_at >= NOW() - INTERVAL '180 days'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada')
  `);
  const mediaMensal = extractRows<{ media: number }>(mediaMensalRes)[0]?.media ?? 0;

  // Operações por dia da semana (qtd média por seg/ter/qua/qui/sex/sab/dom)
  const porDiaSemanaRes = await db.execute(sql`
    SELECT
      EXTRACT(DOW FROM created_at)::int AS dia,
      COUNT(*)::int AS qtd
    FROM operacoes
    WHERE status NOT IN ('rascunho', 'recusada', 'cancelada')
      AND created_at >= NOW() - INTERVAL '180 days'
    GROUP BY dia
    ORDER BY dia
  `);
  const porDiaSemana = extractRows<{ dia: number; qtd: number }>(porDiaSemanaRes);

  // Operações recusadas/canceladas (qtd + valor + motivos top 5)
  const recusadasRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'recusada')::int AS recusadas,
      COUNT(*) FILTER (WHERE status = 'cancelada')::int AS canceladas,
      COUNT(*) FILTER (WHERE status IN ('recusada', 'cancelada'))::int AS total,
      COALESCE(SUM(valor_presente) FILTER (WHERE status = 'recusada')::float, 0) AS valor_recusado,
      COALESCE(SUM(valor_presente) FILTER (WHERE status = 'cancelada')::float, 0) AS valor_cancelado
    FROM operacoes
  `);
  const recusadas = extractRows<{
    recusadas: number;
    canceladas: number;
    total: number;
    valor_recusado: number;
    valor_cancelado: number;
  }>(recusadasRes)[0] ?? {
    recusadas: 0,
    canceladas: 0,
    total: 0,
    valor_recusado: 0,
    valor_cancelado: 0,
  };

  const motivosRecusaRes = await db.execute(sql`
    SELECT motivo_recusa AS motivo, COUNT(*)::int AS qtd
    FROM operacoes
    WHERE status = 'recusada' AND motivo_recusa IS NOT NULL AND motivo_recusa != ''
    GROUP BY motivo_recusa
    ORDER BY qtd DESC
    LIMIT 5
  `);
  const motivosRecusa = extractRows<{ motivo: string; qtd: number }>(
    motivosRecusaRes,
  );

  // Construtoras com documentos faltantes
  const construtorasMissingRes = await db.execute(sql`
    SELECT
      c.id, c.razao_social, c.cnpj, c.created_at,
      COUNT(DISTINCT d.tipo) AS docs_enviados,
      bool_or(d.tipo = 'contrato_social') AS tem_contrato,
      bool_or(d.tipo = 'comprovante_endereco') AS tem_comprovante
    FROM construtoras c
    LEFT JOIN documentos d ON d.construtora_id = c.id
    GROUP BY c.id, c.razao_social, c.cnpj, c.created_at
    HAVING NOT (
      bool_or(d.tipo = 'contrato_social') AND
      bool_or(d.tipo = 'comprovante_endereco')
    )
    ORDER BY c.created_at DESC
    LIMIT 50
  `);
  const construtorasMissing = extractRows<{
    id: string;
    razao_social: string;
    cnpj: string;
    created_at: string;
    tem_contrato: boolean;
    tem_comprovante: boolean;
  }>(construtorasMissingRes);

  // Operações com informações faltantes (status incompleto ou rascunho antigo)
  const opsIncompletasRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'documentos_incompletos')::int AS docs_incompletos,
      COUNT(*) FILTER (WHERE status = 'rascunho' AND created_at < NOW() - INTERVAL '7 days')::int AS rascunhos_antigos,
      COUNT(*) FILTER (WHERE motivo_pendencia IS NOT NULL AND motivo_pendencia != '')::int AS com_pendencia
    FROM operacoes
  `);
  const opsIncompletas = extractRows<{
    docs_incompletos: number;
    rascunhos_antigos: number;
    com_pendencia: number;
  }>(opsIncompletasRes)[0] ?? {
    docs_incompletos: 0,
    rascunhos_antigos: 0,
    com_pendencia: 0,
  };

  // Convites enviados (pending operacoes)
  const convitesRes = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'aguardando_cedente')::int AS aguardando,
      COUNT(*) FILTER (WHERE status = 'reivindicada')::int AS reivindicados,
      COUNT(*) FILTER (WHERE status = 'descartada')::int AS descartados
    FROM pending_operacoes
  `);
  const convites = extractRows<{
    total: number;
    aguardando: number;
    reivindicados: number;
    descartados: number;
  }>(convitesRes)[0] ?? {
    total: 0,
    aguardando: 0,
    reivindicados: 0,
    descartados: 0,
  };

  // Convites por mês (últimos 12 meses)
  const convitesMesRes = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COUNT(*)::int AS qtd,
      COUNT(*) FILTER (WHERE status = 'reivindicada')::int AS reivindicados
    FROM pending_operacoes
    WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY date_trunc('month', created_at)
  `);
  const convitesMes = extractRows<{
    month: string;
    qtd: number;
    reivindicados: number;
  }>(convitesMesRes);

  // Conversão funil (rascunho → aprovação → realizada)
  const funilRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status NOT IN ('rascunho'))::int AS submetidas,
      COUNT(*) FILTER (WHERE status NOT IN ('rascunho', 'recusada', 'cancelada'))::int AS aprovadas,
      COUNT(*) FILTER (WHERE status IN ('enviada_para_pagamento', 'realizada'))::int AS pagamento,
      COUNT(*) FILTER (WHERE status = 'realizada')::int AS realizadas
    FROM operacoes
  `);
  const funil = extractRows<{
    submetidas: number;
    aprovadas: number;
    pagamento: number;
    realizadas: number;
  }>(funilRes)[0] ?? {
    submetidas: 0,
    aprovadas: 0,
    pagamento: 0,
    realizadas: 0,
  };

  return {
    valorAvg,
    distribuicaoValor,
    mediaDiaria,
    mediaSemanal,
    mediaMensal,
    porDiaSemana,
    recusadas,
    motivosRecusa,
    construtorasMissing,
    opsIncompletas,
    convites,
    convitesMes,
    funil,
  };
}

/* =========================================
   AUDIT LOGS — viewer com filtros
   ========================================= */

export async function getAuditLogsForViewer(params: {
  action?: string;
  targetType?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  await requireAdmin();

  const conditions: string[] = [];
  const vals: unknown[] = [];

  if (params.action) {
    vals.push(params.action);
    conditions.push(`action = $${vals.length}`);
  }
  if (params.targetType) {
    vals.push(params.targetType);
    conditions.push(`target_type = $${vals.length}`);
  }
  if (params.userId) {
    vals.push(params.userId);
    conditions.push(`user_id = $${vals.length}`);
  }
  if (params.from) {
    vals.push(params.from);
    conditions.push(`created_at >= $${vals.length}::timestamptz`);
  }
  if (params.to) {
    vals.push(params.to);
    conditions.push(`created_at <= ($${vals.length}::date + interval '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(params.limit ?? 200, 500);

  const result = await db.execute(
    sql.raw(`
      SELECT
        id, user_id, user_role, user_email, action,
        target_type, target_id, target_label, metadata,
        created_at
      FROM audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `),
  );

  return extractRows<{
    id: string;
    user_id: string | null;
    user_role: string | null;
    user_email: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    target_label: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>(result);
}

/** Lista de ações distintas pra dropdown de filtro. */
export async function getDistinctAuditActions() {
  await requireAdmin();
  const result = await db.execute(sql`
    SELECT action, COUNT(*)::int AS qtd
    FROM audit_logs
    GROUP BY action
    ORDER BY qtd DESC
    LIMIT 50
  `);
  return extractRows<{ action: string; qtd: number }>(result);
}

/* =========================================
   SAÚDE DO SISTEMA
   ========================================= */

export async function getSystemHealth() {
  await requireAdmin();

  // Configuração de env (não vaza valores, só presença)
  const env = {
    blobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
    databaseUrl: !!process.env.DATABASE_URL,
    clerkSecretKey: !!process.env.CLERK_SECRET_KEY,
    resendApiKey: !!process.env.RESEND_API_KEY,
    twilioSid: !!process.env.TWILIO_ACCOUNT_SID,
    zapsignToken: !!process.env.ZAPSIGN_API_TOKEN,
    siteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
  };

  // Volume de logs por ação nas últimas 24h
  const last24hRes = await db.execute(sql`
    SELECT action, COUNT(*)::int AS qtd
    FROM audit_logs
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    GROUP BY action
    ORDER BY qtd DESC
    LIMIT 20
  `);
  const last24h = extractRows<{ action: string; qtd: number }>(last24hRes);

  // Logs de erro (action contendo 'error', 'failed', 'erro')
  const errorsRes = await db.execute(sql`
    SELECT id, action, target_label, user_email, metadata, created_at
    FROM audit_logs
    WHERE action ~* '(error|failed|erro|fail)'
       OR (metadata::text ~* '"error"')
    ORDER BY created_at DESC
    LIMIT 30
  `);
  const errors = extractRows<{
    id: string;
    action: string;
    target_label: string | null;
    user_email: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  }>(errorsRes);

  // Atividade hoje vs média 7 dias (anomalia detection simples)
  const todayActivityRes = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd
    FROM audit_logs
    WHERE created_at >= date_trunc('day', NOW())
  `);
  const todayQty = extractRows<{ qtd: number }>(todayActivityRes)[0]?.qtd ?? 0;

  const avg7dRes = await db.execute(sql`
    SELECT AVG(qtd)::float AS media
    FROM (
      SELECT COUNT(*)::int AS qtd
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND created_at < date_trunc('day', NOW())
      GROUP BY date_trunc('day', created_at)
    ) sub
  `);
  const avg7d = extractRows<{ media: number }>(avg7dRes)[0]?.media ?? 0;

  // Tabela: tamanho atual por linhas
  const tablesRes = await db.execute(sql`
    SELECT
      'users' AS nome, COUNT(*)::int AS qtd FROM users
    UNION ALL
    SELECT 'construtoras', COUNT(*)::int FROM construtoras
    UNION ALL
    SELECT 'operacoes', COUNT(*)::int FROM operacoes
    UNION ALL
    SELECT 'documentos', COUNT(*)::int FROM documentos
    UNION ALL
    SELECT 'tickets', COUNT(*)::int FROM tickets
    UNION ALL
    SELECT 'notificacoes', COUNT(*)::int FROM notificacoes
    UNION ALL
    SELECT 'audit_logs', COUNT(*)::int FROM audit_logs
    ORDER BY qtd DESC
  `);
  const tables = extractRows<{ nome: string; qtd: number }>(tablesRes);

  // Sessões ativas (últimas logins distintos nas últimas 24h)
  const sessoesRes = await db.execute(sql`
    SELECT COUNT(DISTINCT user_id)::int AS qtd
    FROM audit_logs
    WHERE action = 'login'
      AND created_at >= NOW() - INTERVAL '24 hours'
  `);
  const sessoes24h = extractRows<{ qtd: number }>(sessoesRes)[0]?.qtd ?? 0;

  return {
    env,
    last24h,
    errors,
    todayQty,
    avg7d,
    tables,
    sessoes24h,
  };
}
