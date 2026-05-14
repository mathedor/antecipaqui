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

export async function getIndicesData(filters?: {
  fundoId?: string;
  /** Janela de inadimplência por fundo: 30d, 90d, 180d, 365d (default 90d). */
  inadPeriodo?: "30d" | "90d" | "180d" | "365d";
}) {
  await requireAdmin();
  const fundoId = filters?.fundoId?.trim() || undefined;
  const inadPeriodo = filters?.inadPeriodo ?? "90d";

  // Filtro fundo (aplicado em todas as agregações)
  const fundoSql =
    fundoId === "_no_fundo_"
      ? sql` AND fundo_id IS NULL`
      : fundoId
        ? sql` AND fundo_id = ${fundoId}::uuid`
        : sql``;

  // Valor médio das operações (média + mediana + p25/p75)
  const valorAvgRes = await db.execute(sql`
    SELECT
      COALESCE(AVG(valor_presente)::float, 0) AS media,
      COALESCE(percentile_cont(0.5) WITHIN GROUP (ORDER BY valor_presente)::float, 0) AS mediana,
      COALESCE(percentile_cont(0.25) WITHIN GROUP (ORDER BY valor_presente)::float, 0) AS p25,
      COALESCE(percentile_cont(0.75) WITHIN GROUP (ORDER BY valor_presente)::float, 0) AS p75,
      COUNT(*)::int AS total
    FROM operacoes
    WHERE status NOT IN ('rascunho', 'recusada', 'cancelada') ${fundoSql}
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
    WHERE status NOT IN ('rascunho', 'recusada', 'cancelada') ${fundoSql}
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
      AND status NOT IN ('rascunho', 'recusada', 'cancelada') ${fundoSql}
  `);
  const mediaDiaria = extractRows<{ media: number }>(mediaDiariaRes)[0]?.media ?? 0;

  const mediaSemanalRes = await db.execute(sql`
    SELECT COUNT(*)::float / GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(created_at))) / 7)::float AS media
    FROM operacoes
    WHERE created_at >= NOW() - INTERVAL '90 days'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada') ${fundoSql}
  `);
  const mediaSemanal = extractRows<{ media: number }>(mediaSemanalRes)[0]?.media ?? 0;

  const mediaMensalRes = await db.execute(sql`
    SELECT COUNT(*)::float / GREATEST(1, EXTRACT(DAY FROM (NOW() - MIN(created_at))) / 30)::float AS media
    FROM operacoes
    WHERE created_at >= NOW() - INTERVAL '180 days'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada') ${fundoSql}
  `);
  const mediaMensal = extractRows<{ media: number }>(mediaMensalRes)[0]?.media ?? 0;

  // Operações por dia da semana (qtd média por seg/ter/qua/qui/sex/sab/dom)
  const porDiaSemanaRes = await db.execute(sql`
    SELECT
      EXTRACT(DOW FROM created_at)::int AS dia,
      COUNT(*)::int AS qtd
    FROM operacoes
    WHERE status NOT IN ('rascunho', 'recusada', 'cancelada')
      AND created_at >= NOW() - INTERVAL '180 days' ${fundoSql}
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

  // Média por fundo (qtd ops + valor médio + valor total + taxa-base)
  const porFundoRes = await db.execute(sql`
    SELECT
      f.id,
      COALESCE(f.nome_fantasia, f.razao_social) AS nome,
      f.taxa_mensal_base::float AS taxa_base,
      COUNT(o.id)::int AS qtd_operacoes,
      COALESCE(AVG(o.valor_presente)::float, 0) AS valor_medio,
      COALESCE(SUM(o.valor_presente)::float, 0) AS valor_total,
      COALESCE(AVG(o.valor_comissao)::float, 0) AS comissao_media
    FROM fundos f
    LEFT JOIN operacoes o
      ON o.fundo_id = f.id
      AND o.status NOT IN ('rascunho', 'recusada', 'cancelada')
    WHERE f.is_active = TRUE
    GROUP BY f.id, nome, f.taxa_mensal_base
    ORDER BY valor_total DESC
  `);
  const porFundo = extractRows<{
    id: string;
    nome: string;
    taxa_base: number;
    qtd_operacoes: number;
    valor_medio: number;
    valor_total: number;
    comissao_media: number;
  }>(porFundoRes);

  // Inadimplência por mês (últimos 12 meses) — parcelas em "vencida" OU
  // "a_vencer" com vencimento já passado
  const inadMesRes = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', p.vencimento), 'YYYY-MM') AS month,
      COUNT(*)::int AS qtd,
      COALESCE(SUM(p.valor)::float, 0) AS valor
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE (
      p.status = 'vencida'
      OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE)
    )
    AND p.vencimento >= date_trunc('month', NOW()) - INTERVAL '11 months'
    AND o.status NOT IN ('rascunho', 'recusada', 'cancelada') ${
      fundoId === "_no_fundo_"
        ? sql` AND o.fundo_id IS NULL`
        : fundoId
          ? sql` AND o.fundo_id = ${fundoId}::uuid`
          : sql``
    }
    GROUP BY date_trunc('month', p.vencimento)
    ORDER BY date_trunc('month', p.vencimento)
  `);
  const inadimplenciaMes = extractRows<{
    month: string;
    qtd: number;
    valor: number;
  }>(inadMesRes);

  // Inadimplência por fundo no período selecionado
  const dias =
    inadPeriodo === "30d"
      ? 30
      : inadPeriodo === "90d"
        ? 90
        : inadPeriodo === "180d"
          ? 180
          : 365;
  const inadFundoRes = await db.execute(sql`
    SELECT
      COALESCE(f.id::text, '_sem_fundo_') AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social, '— sem fundo —') AS nome,
      COUNT(p.id)::int AS qtd,
      COALESCE(SUM(p.valor)::float, 0) AS valor_inadimplente,
      COALESCE(SUM(p.valor) FILTER (
        WHERE (CURRENT_DATE - p.vencimento) > 30
      )::float, 0) AS valor_30d_atraso
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE (
      p.status = 'vencida'
      OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE)
    )
    AND p.vencimento >= CURRENT_DATE - make_interval(days => ${dias}::int)
    AND o.status NOT IN ('rascunho', 'recusada', 'cancelada')
    GROUP BY f.id, nome
    ORDER BY valor_inadimplente DESC
  `);
  const inadimplenciaFundo = extractRows<{
    fundo_id: string;
    nome: string;
    qtd: number;
    valor_inadimplente: number;
    valor_30d_atraso: number;
  }>(inadFundoRes);

  // Total de inadimplência (header KPI)
  const inadTotalRes = await db.execute(sql`
    SELECT
      COUNT(*)::int AS qtd,
      COALESCE(SUM(p.valor)::float, 0) AS valor
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE (
      p.status = 'vencida'
      OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE)
    )
    AND o.status NOT IN ('rascunho', 'recusada', 'cancelada') ${
      fundoId === "_no_fundo_"
        ? sql` AND o.fundo_id IS NULL`
        : fundoId
          ? sql` AND o.fundo_id = ${fundoId}::uuid`
          : sql``
    }
  `);
  const inadTotal = extractRows<{ qtd: number; valor: number }>(inadTotalRes)[0] ??
    { qtd: 0, valor: 0 };

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
    porFundo,
    inadimplenciaMes,
    inadimplenciaFundo,
    inadTotal,
    inadPeriodo,
  };
}

/* =========================================
   INADIMPLENTES — relatório de parcelas vencidas
   ========================================= */

export async function getInadimplentes(filters?: {
  fundoId?: string;
  from?: string;
  to?: string;
  q?: string;
  diasMin?: number;
}) {
  await requireAdmin();
  const fundoId = filters?.fundoId?.trim() || undefined;
  const conds: ReturnType<typeof sql>[] = [
    sql`(p.status = 'vencida' OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE))`,
    sql`o.status NOT IN ('rascunho', 'recusada', 'cancelada')`,
  ];
  if (fundoId === "_no_fundo_") conds.push(sql`o.fundo_id IS NULL`);
  else if (fundoId) conds.push(sql`o.fundo_id = ${fundoId}::uuid`);
  if (filters?.from) conds.push(sql`p.vencimento >= ${filters.from}::date`);
  if (filters?.to) conds.push(sql`p.vencimento <= ${filters.to}::date`);
  if (filters?.q) {
    const like = `%${filters.q}%`;
    conds.push(sql`(o.numero ILIKE ${like}
      OR c.razao_social ILIKE ${like}
      OR u.nome ILIKE ${like}
      OR u.email ILIKE ${like})`);
  }
  if (filters?.diasMin && filters.diasMin > 0) {
    conds.push(sql`(CURRENT_DATE - p.vencimento) >= ${filters.diasMin}`);
  }
  const where = sql.join(conds, sql` AND `);

  const result = await db.execute(sql`
    SELECT
      p.id AS parcela_id,
      p.numero,
      p.valor,
      p.vencimento,
      p.status AS parcela_status,
      (CURRENT_DATE - p.vencimento)::int AS dias_atraso,
      o.id AS operacao_id,
      o.numero AS operacao_numero,
      o.status AS operacao_status,
      o.valor_presente AS operacao_vp,
      o.taxa_mensal::float AS taxa_mensal,
      c.razao_social AS construtora_nome,
      c.id AS construtora_id,
      c.telefone AS construtora_telefone,
      c.email AS construtora_email,
      im.id AS imobiliaria_id,
      im.razao_social AS imobiliaria_nome,
      im.telefone AS imobiliaria_telefone,
      u.nome AS corretor_nome,
      u.email AS corretor_email,
      u.telefone AS corretor_telefone,
      u.id AS corretor_id,
      f.id AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN users u ON u.id = o.corretor_user_id
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE ${where}
    ORDER BY p.vencimento ASC
    LIMIT 500
  `);

  return extractRows<{
    parcela_id: string;
    numero: number;
    valor: string;
    vencimento: string;
    parcela_status: string;
    dias_atraso: number;
    operacao_id: string;
    operacao_numero: string;
    operacao_status: string;
    operacao_vp: string;
    taxa_mensal: number;
    construtora_nome: string | null;
    construtora_id: string | null;
    construtora_telefone: string | null;
    construtora_email: string | null;
    imobiliaria_id: string | null;
    imobiliaria_nome: string | null;
    imobiliaria_telefone: string | null;
    corretor_nome: string | null;
    corretor_email: string | null;
    corretor_telefone: string | null;
    corretor_id: string | null;
    fundo_id: string | null;
    fundo_nome: string | null;
  }>(result);
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
    cronSecret: !!process.env.CRON_SECRET,
    anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
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
    SELECT 'users' AS nome, COUNT(*)::int AS qtd FROM users
    UNION ALL SELECT 'construtoras', COUNT(*)::int FROM construtoras
    UNION ALL SELECT 'fundos', COUNT(*)::int FROM fundos
    UNION ALL SELECT 'operacoes', COUNT(*)::int FROM operacoes
    UNION ALL SELECT 'parcelas_comissao', COUNT(*)::int FROM parcelas_comissao
    UNION ALL SELECT 'documentos', COUNT(*)::int FROM documentos
    UNION ALL SELECT 'tickets', COUNT(*)::int FROM tickets
    UNION ALL SELECT 'notificacoes', COUNT(*)::int FROM notificacoes
    UNION ALL SELECT 'audit_logs', COUNT(*)::int FROM audit_logs
    UNION ALL SELECT 'webhooks_subscriptions', COUNT(*)::int FROM webhooks_subscriptions
    UNION ALL SELECT 'webhooks_eventos', COUNT(*)::int FROM webhooks_eventos
    UNION ALL SELECT 'construtora_score_historico', COUNT(*)::int FROM construtora_score_historico
    UNION ALL SELECT 'recaps_relatorio', COUNT(*)::int FROM recaps_relatorio
    UNION ALL SELECT 'parcela_antecipacoes', COUNT(*)::int FROM parcela_antecipacoes
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

  /* ===== CRONS: inferimos última execução pelo último efeito de cada job ===== */
  type CronProbe = {
    id: string;
    label: string;
    schedule: string;
    intervaloMaxHoras: number;
    descricao: string;
    lastAt: string | null;
  };

  const cobrancaProbe = await db.execute(sql`
    SELECT MAX(cobranca_atraso_em) AS at
    FROM parcelas_comissao
    WHERE cobranca_atraso_em IS NOT NULL
  `);
  const recapsProbe = await db.execute(sql`
    SELECT MAX(gerado_em) AS at FROM recaps_relatorio
  `);
  const webhooksProbe = await db.execute(sql`
    SELECT MAX(COALESCE(delivered_at, proxima_tentativa_em, created_at)) AS at
    FROM webhooks_eventos
    WHERE status IN ('entregue','falhou','desistido')
  `);
  const autoNudgeProbe = await db.execute(sql`
    SELECT MAX(tm.created_at) AS at
    FROM ticket_messages tm
    WHERE tm.from_role = 'fundo'
      AND tm.body ILIKE '%automaticamente pelo sistema%'
  `);
  const backupProbe = await db.execute(sql`
    SELECT MAX(created_at) AS at
    FROM audit_logs
    WHERE action ILIKE '%backup%'
  `);

  function pickAt(r: unknown): string | null {
    const rows = extractRows<{ at: string | null }>(r);
    return rows[0]?.at ?? null;
  }

  const cronProbes: CronProbe[] = [
    {
      id: "cobranca-parcelas",
      label: "Cobrança de parcelas",
      schedule: "0 12 * * *",
      intervaloMaxHoras: 30,
      descricao: "Lembretes pré-venc e atraso · tickets",
      lastAt: pickAt(cobrancaProbe),
    },
    {
      id: "auto-nudge-chats",
      label: "Auto-nudge chats",
      schedule: "30 12 * * *",
      intervaloMaxHoras: 30,
      descricao: "Mensagens automáticas em tickets sem resposta",
      lastAt: pickAt(autoNudgeProbe),
    },
    {
      id: "processar-webhooks",
      label: "Processar webhooks",
      schedule: "*/5 * * * *",
      intervaloMaxHoras: 1,
      descricao: "Entrega da fila de webhooks externos",
      lastAt: pickAt(webhooksProbe),
    },
    {
      id: "backup-diario",
      label: "Backup diário",
      schedule: "0 3 * * *",
      intervaloMaxHoras: 30,
      descricao: "Dump SQL via /api/cron/backup-diario",
      lastAt: pickAt(backupProbe),
    },
    {
      id: "recaps-diarios",
      label: "Recaps diários",
      schedule: "30 3 * * *",
      intervaloMaxHoras: 30,
      descricao: "Gera recap admin + por fundo (diário/semanal/mensal)",
      lastAt: pickAt(recapsProbe),
    },
  ];

  const crons = cronProbes.map((c) => {
    let status: "ok" | "late" | "never" = "never";
    if (c.lastAt) {
      const horas = (Date.now() - new Date(c.lastAt).getTime()) / 3_600_000;
      status = horas <= c.intervaloMaxHoras ? "ok" : "late";
    }
    return { ...c, status };
  });

  /* ===== WEBHOOKS — fila + taxa de entrega ===== */
  const whRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pendente')::int AS pendentes,
      COUNT(*) FILTER (WHERE status = 'falhou')::int AS falhou,
      COUNT(*) FILTER (WHERE status = 'desistido')::int AS desistido,
      COUNT(*) FILTER (WHERE status = 'entregue' AND delivered_at >= NOW() - INTERVAL '24 hours')::int AS entregues24h,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS criados24h
    FROM webhooks_eventos
  `);
  const whRow = extractRows<{
    pendentes: number;
    falhou: number;
    desistido: number;
    entregues24h: number;
    criados24h: number;
  }>(whRes)[0] ?? {
    pendentes: 0,
    falhou: 0,
    desistido: 0,
    entregues24h: 0,
    criados24h: 0,
  };

  const whSubsRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE is_active = true)::int AS ativas,
      COUNT(*) FILTER (WHERE is_active = false)::int AS inativas,
      COUNT(*)::int AS total
    FROM webhooks_subscriptions
  `);
  const whSubs = extractRows<{
    ativas: number;
    inativas: number;
    total: number;
  }>(whSubsRes)[0] ?? { ativas: 0, inativas: 0, total: 0 };

  const webhooks = {
    ...whRow,
    subscriptions: whSubs,
    taxa24h:
      whRow.criados24h > 0
        ? Math.round((whRow.entregues24h / whRow.criados24h) * 100)
        : null,
  };

  /* ===== RECAPS — últimos por (período, escopo) ===== */
  const recapsRes = await db.execute(sql`
    SELECT periodo, escopo, MAX(gerado_em) AS ultimo, COUNT(*)::int AS qtd
    FROM recaps_relatorio
    GROUP BY periodo, escopo
    ORDER BY periodo, escopo
  `);
  const recapsList = extractRows<{
    periodo: string;
    escopo: string;
    ultimo: string;
    qtd: number;
  }>(recapsRes);
  const recapsHojeRes = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd
    FROM recaps_relatorio
    WHERE gerado_em >= date_trunc('day', NOW())
  `);
  const recapsHoje =
    extractRows<{ qtd: number }>(recapsHojeRes)[0]?.qtd ?? 0;

  /* ===== SNAPSHOTS DE SCORE (últimas 24h) ===== */
  const snapRes = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd
    FROM construtora_score_historico
    WHERE snapshot_at >= NOW() - INTERVAL '24 hours'
  `);
  const snapshots24h = extractRows<{ qtd: number }>(snapRes)[0]?.qtd ?? 0;

  /* ===== NOTIFICAÇÕES (email/sms enviados vs falhados 24h) ===== */
  const notifRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE email_sent = true AND created_at >= NOW() - INTERVAL '24 hours')::int AS email_ok,
      COUNT(*) FILTER (WHERE sms_sent = true AND created_at >= NOW() - INTERVAL '24 hours')::int AS sms_ok,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS total24h
    FROM notificacoes
  `);
  const notif = extractRows<{
    email_ok: number;
    sms_ok: number;
    total24h: number;
  }>(notifRes)[0] ?? { email_ok: 0, sms_ok: 0, total24h: 0 };

  return {
    env,
    last24h,
    errors,
    todayQty,
    avg7d,
    tables,
    sessoes24h,
    crons,
    webhooks,
    recaps: { list: recapsList, hoje: recapsHoje },
    snapshots24h,
    notif,
  };
}
