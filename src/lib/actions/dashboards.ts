"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { operacoes, auditLogs } from "@/db/schema";
import { requireAdmin, requireActiveUser } from "@/lib/auth-user";

/* ============================================================
   HELPERS
   ============================================================ */

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
   ADMIN — Action Center, Pipeline, Sourcing, Health resumido
   ============================================================ */

export type AdminActionItem = {
  key: string;
  label: string;
  count: number;
  amount?: number;
  href: string;
  tone: "info" | "warn" | "danger";
  hint?: string;
};

/** Lista priorizada de "o que admin precisa fazer agora". */
export async function getAdminActionCenter(): Promise<AdminActionItem[]> {
  await requireAdmin();

  const res = await db.execute(sql`
    WITH
    decidir AS (
      SELECT
        COUNT(*) FILTER (WHERE status IN ('aguardando_aprovacao','documentos_incompletos'))::int AS qtd,
        COALESCE(SUM(valor_presente) FILTER (WHERE status IN ('aguardando_aprovacao','documentos_incompletos'))::float, 0) AS valor
      FROM operacoes
    ),
    sem_fundo AS (
      SELECT
        COUNT(*) FILTER (WHERE fundo_id IS NULL AND status IN ('aguardando_aprovacao','pre_aprovada','analise_final'))::int AS qtd,
        COALESCE(SUM(valor_presente) FILTER (WHERE fundo_id IS NULL AND status IN ('aguardando_aprovacao','pre_aprovada','analise_final'))::float, 0) AS valor
      FROM operacoes
    ),
    contratos_travados AS (
      SELECT
        COUNT(*) FILTER (
          WHERE status IN ('enviado_assinatura','parcialmente_assinado')
            AND created_at < NOW() - INTERVAL '5 days'
        )::int AS qtd
      FROM contratos
    ),
    faturas_vencidas AS (
      SELECT
        COUNT(*) FILTER (WHERE status IN ('vencida'))::int AS qtd,
        COALESCE(SUM(valor_devido - valor_pago) FILTER (WHERE status IN ('vencida'))::float, 0) AS valor
      FROM faturas_fundo
    ),
    chats_sla AS (
      SELECT COUNT(*)::int AS qtd
      FROM tickets t
      WHERE t.status = 'aberto'
        AND t.arquivado_em IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM ticket_messages tm
          WHERE tm.ticket_id = t.id
            AND tm.kind = 'user'
            AND tm.created_at >= NOW() - INTERVAL '3 days'
        )
    ),
    docs_pendentes AS (
      SELECT COUNT(*) FILTER (WHERE status = 'pendente' AND created_at < NOW() - INTERVAL '7 days')::int AS qtd
      FROM documento_solicitacoes
    ),
    parcelas_vencidas AS (
      SELECT
        COUNT(*) FILTER (
          WHERE (status = 'vencida' OR (status = 'a_vencer' AND vencimento < CURRENT_DATE))
        )::int AS qtd,
        COALESCE(SUM(valor) FILTER (
          WHERE (status = 'vencida' OR (status = 'a_vencer' AND vencimento < CURRENT_DATE))
        )::float, 0) AS valor
      FROM parcelas_comissao
    ),
    antecipacoes_pendentes AS (
      SELECT COUNT(*) FILTER (WHERE status = 'pendente')::int AS qtd
      FROM parcela_antecipacoes
    ),
    renegociacoes_pendentes AS (
      SELECT COUNT(*) FILTER (WHERE status = 'pendente')::int AS qtd
      FROM parcela_renegociacoes
    ),
    comissoes_a_pagar AS (
      SELECT
        COUNT(*) FILTER (WHERE status = 'pendente')::int AS qtd,
        COALESCE(SUM(valor_devido - valor_pago) FILTER (WHERE status = 'pendente')::float, 0) AS valor
      FROM comissoes_comercial
    )
    SELECT
      (SELECT qtd FROM decidir) AS decidir_qtd,
      (SELECT valor FROM decidir) AS decidir_valor,
      (SELECT qtd FROM sem_fundo) AS sem_fundo_qtd,
      (SELECT valor FROM sem_fundo) AS sem_fundo_valor,
      (SELECT qtd FROM contratos_travados) AS contratos_travados_qtd,
      (SELECT qtd FROM faturas_vencidas) AS faturas_vencidas_qtd,
      (SELECT valor FROM faturas_vencidas) AS faturas_vencidas_valor,
      (SELECT qtd FROM chats_sla) AS chats_sla_qtd,
      (SELECT qtd FROM docs_pendentes) AS docs_pendentes_qtd,
      (SELECT qtd FROM parcelas_vencidas) AS parcelas_vencidas_qtd,
      (SELECT valor FROM parcelas_vencidas) AS parcelas_vencidas_valor,
      (SELECT qtd FROM antecipacoes_pendentes) AS antecipacoes_pendentes_qtd,
      (SELECT qtd FROM renegociacoes_pendentes) AS renegociacoes_pendentes_qtd,
      (SELECT qtd FROM comissoes_a_pagar) AS comissoes_qtd,
      (SELECT valor FROM comissoes_a_pagar) AS comissoes_valor
  `);

  const row =
    extractRows<Record<string, number>>(res)[0] ?? ({} as Record<string, number>);

  const items: AdminActionItem[] = [
    {
      key: "decidir",
      label: "Operações na mesa AQ",
      count: row.decidir_qtd ?? 0,
      amount: row.decidir_valor ?? 0,
      href: "/admin/decidir",
      tone: "info",
      hint: "Pré-aprovar e atribuir fundo",
    },
    {
      key: "sem_fundo",
      label: "Operações sem fundo atribuído",
      count: row.sem_fundo_qtd ?? 0,
      amount: row.sem_fundo_valor ?? 0,
      href: "/admin/decidir?filtro=sem_fundo",
      tone: "warn",
      hint: "Atribuir antes de mandar pra mesa do fundo",
    },
    {
      key: "contratos_travados",
      label: "Contratos travados 5d+",
      count: row.contratos_travados_qtd ?? 0,
      href: "/admin/operacoes?status=enviada_para_assinatura",
      tone: "warn",
      hint: "ZapSign sem assinatura há mais de 5 dias",
    },
    {
      key: "parcelas_vencidas",
      label: "Parcelas vencidas",
      count: row.parcelas_vencidas_qtd ?? 0,
      amount: row.parcelas_vencidas_valor ?? 0,
      href: "/admin/relatorios/inadimplentes",
      tone: "danger",
      hint: "Inadimplência a cobrar",
    },
    {
      key: "faturas_vencidas",
      label: "Faturas dos fundos vencidas",
      count: row.faturas_vencidas_qtd ?? 0,
      amount: row.faturas_vencidas_valor ?? 0,
      href: "/admin/faturas",
      tone: "danger",
      hint: "Repasse devido pelo fundo à AQ",
    },
    {
      key: "chats_sla",
      label: "Chats sem resposta 3d+",
      count: row.chats_sla_qtd ?? 0,
      href: "/admin/tickets",
      tone: "warn",
      hint: "SLA estourado, cliente esperando",
    },
    {
      key: "docs_pendentes",
      label: "Solicitações doc pendentes 7d+",
      count: row.docs_pendentes_qtd ?? 0,
      href: "/admin/pendencias",
      tone: "warn",
    },
    {
      key: "antecipacoes_pendentes",
      label: "Pedidos de antecipação",
      count: row.antecipacoes_pendentes_qtd ?? 0,
      href: "/admin/pendencias-decisao",
      tone: "info",
    },
    {
      key: "renegociacoes_pendentes",
      label: "Pedidos de renegociação",
      count: row.renegociacoes_pendentes_qtd ?? 0,
      href: "/admin/pendencias-decisao",
      tone: "info",
    },
    {
      key: "comissoes_a_pagar",
      label: "Comissões comerciais a pagar",
      count: row.comissoes_qtd ?? 0,
      amount: row.comissoes_valor ?? 0,
      href: "/admin/comerciais/comissoes",
      tone: "info",
      hint: "Lucro líquido x 10% por comercial responsável",
    },
  ];

  return items.filter((i) => i.count > 0);
}

/** Funil visual: rascunho → aguardando → na mesa fundo → contrato → ativa → liquidada. */
export type PipelineStage = {
  key: string;
  label: string;
  count: number;
  amount: number;
  tone: "info" | "warn" | "success" | "default";
};

export async function getAdminPipeline(): Promise<PipelineStage[]> {
  await requireAdmin();

  const res = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'rascunho')::int AS rascunho_qtd,
      COALESCE(SUM(valor_presente) FILTER (WHERE status = 'rascunho')::float, 0) AS rascunho_valor,
      COUNT(*) FILTER (WHERE status IN ('aguardando_aprovacao','documentos_incompletos'))::int AS aguardando_qtd,
      COALESCE(SUM(valor_presente) FILTER (WHERE status IN ('aguardando_aprovacao','documentos_incompletos'))::float, 0) AS aguardando_valor,
      COUNT(*) FILTER (WHERE status IN ('pre_aprovada','analise_final'))::int AS mesa_qtd,
      COALESCE(SUM(valor_presente) FILTER (WHERE status IN ('pre_aprovada','analise_final'))::float, 0) AS mesa_valor,
      COUNT(*) FILTER (WHERE status = 'enviada_para_assinatura')::int AS contrato_qtd,
      COALESCE(SUM(valor_presente) FILTER (WHERE status = 'enviada_para_assinatura')::float, 0) AS contrato_valor,
      COUNT(*) FILTER (WHERE status = 'enviada_para_pagamento')::int AS ativa_qtd,
      COALESCE(SUM(valor_presente) FILTER (WHERE status = 'enviada_para_pagamento')::float, 0) AS ativa_valor,
      COUNT(*) FILTER (WHERE status = 'realizada')::int AS realizada_qtd,
      COALESCE(SUM(valor_presente) FILTER (WHERE status = 'realizada')::float, 0) AS realizada_valor
    FROM operacoes
  `);
  const row = extractRows<Record<string, number>>(res)[0] ?? ({} as Record<string, number>);

  return [
    { key: "rascunho", label: "Rascunhos", count: row.rascunho_qtd ?? 0, amount: row.rascunho_valor ?? 0, tone: "default" },
    { key: "aguardando", label: "Mesa AQ", count: row.aguardando_qtd ?? 0, amount: row.aguardando_valor ?? 0, tone: "info" },
    { key: "mesa", label: "Mesa do fundo", count: row.mesa_qtd ?? 0, amount: row.mesa_valor ?? 0, tone: "info" },
    { key: "contrato", label: "Em contrato", count: row.contrato_qtd ?? 0, amount: row.contrato_valor ?? 0, tone: "warn" },
    { key: "ativa", label: "Ativas", count: row.ativa_qtd ?? 0, amount: row.ativa_valor ?? 0, tone: "success" },
    { key: "realizada", label: "Liquidadas", count: row.realizada_qtd ?? 0, amount: row.realizada_valor ?? 0, tone: "success" },
  ];
}

/* ============================================================
   SOURCING — direcionamento de operações pra fundos
   Match automático por heurística:
   - exclui fundos blacklistados da construtora
   - prioriza fundo com menor concentração da construtora
   - prioriza fundo com taxa compatível (próxima à da operação)
   - prioriza fundo com mais operações realizadas (histórico)
   ============================================================ */

export type SourcingOp = {
  id: string;
  numero: string;
  valorPresente: number;
  valorComissao: number;
  taxaMensal: number;
  numeroParcelas: number;
  construtoraId: string;
  construtoraNome: string | null;
  construtoraScore: number | null;
  corretorNome: string | null;
  criadaEm: string;
  diasAguardando: number;
  sugestoes: SourcingSugestao[];
};

export type SourcingSugestao = {
  fundoId: string;
  fundoNome: string;
  taxaBase: number;
  score: number;
  /** % do volume do fundo concentrado nesta construtora (0-1). */
  concentracaoConstrutora: number;
  /** Quantidade de ops já feitas com essa construtora. */
  qtdComConstrutora: number;
  /** Motivo principal pra essa sugestão estar no topo. */
  motivo: string;
  blacklist: boolean;
};

export async function getAdminSourcing(limit = 8): Promise<SourcingOp[]> {
  await requireAdmin();

  // Ops aguardando alocação: sem fundo OU com fundo mas ainda na mesa AQ
  const opsRes = await db.execute(sql`
    SELECT
      o.id, o.numero, o.valor_presente::float AS valor_presente,
      o.valor_comissao::float AS valor_comissao,
      o.taxa_mensal::float AS taxa_mensal,
      o.numero_parcelas, o.construtora_id, o.created_at,
      c.razao_social AS construtora_nome,
      (
        SELECT score FROM construtora_score_historico h
        WHERE h.construtora_id = c.id
        ORDER BY snapshot_at DESC LIMIT 1
      ) AS construtora_score,
      u.nome AS corretor_nome,
      EXTRACT(DAY FROM (NOW() - o.created_at))::int AS dias_aguardando
    FROM operacoes o
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN users u ON u.id = o.corretor_user_id
    WHERE o.fundo_id IS NULL
      AND o.status IN ('aguardando_aprovacao','pre_aprovada','analise_final','documentos_incompletos')
    ORDER BY o.created_at ASC
    LIMIT ${limit}
  `);
  const ops = extractRows<{
    id: string;
    numero: string;
    valor_presente: number;
    valor_comissao: number;
    taxa_mensal: number;
    numero_parcelas: number;
    construtora_id: string;
    construtora_nome: string | null;
    construtora_score: number | null;
    corretor_nome: string | null;
    created_at: string;
    dias_aguardando: number;
  }>(opsRes);

  if (ops.length === 0) return [];

  // Listar fundos ativos com agregações por construtora
  const fundosRes = await db.execute(sql`
    SELECT
      f.id, COALESCE(f.nome_fantasia, f.razao_social) AS nome,
      f.taxa_mensal_base::float AS taxa_base,
      (
        SELECT COUNT(*)::int FROM operacoes oo
        WHERE oo.fundo_id = f.id
          AND oo.status NOT IN ('rascunho','recusada','cancelada')
      ) AS total_ops,
      (
        SELECT COALESCE(SUM(oo.valor_presente)::float, 0) FROM operacoes oo
        WHERE oo.fundo_id = f.id
          AND oo.status NOT IN ('rascunho','recusada','cancelada')
      ) AS volume_total
    FROM fundos f
    WHERE f.is_active = TRUE
  `);
  const fundos = extractRows<{
    id: string;
    nome: string;
    taxa_base: number;
    total_ops: number;
    volume_total: number;
  }>(fundosRes);

  if (fundos.length === 0) {
    return ops.map((o) => ({
      id: o.id,
      numero: o.numero,
      valorPresente: o.valor_presente,
      valorComissao: o.valor_comissao,
      taxaMensal: o.taxa_mensal,
      numeroParcelas: o.numero_parcelas,
      construtoraId: o.construtora_id,
      construtoraNome: o.construtora_nome,
      construtoraScore: o.construtora_score,
      corretorNome: o.corretor_nome,
      criadaEm: o.created_at,
      diasAguardando: o.dias_aguardando,
      sugestoes: [],
    }));
  }

  // Agregação volume da construtora por fundo (todas as construtoras envolvidas)
  const construtoraIds = Array.from(new Set(ops.map((o) => o.construtora_id)));
  const idsPlaceholders = sql.join(
    construtoraIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const concRes = await db.execute(sql`
    SELECT
      o.construtora_id, o.fundo_id,
      COUNT(*)::int AS qtd,
      COALESCE(SUM(o.valor_presente)::float, 0) AS volume
    FROM operacoes o
    WHERE o.construtora_id IN (${idsPlaceholders})
      AND o.fundo_id IS NOT NULL
      AND o.status NOT IN ('rascunho','recusada','cancelada')
    GROUP BY o.construtora_id, o.fundo_id
  `);
  const concMap = new Map<string, { qtd: number; volume: number }>();
  for (const r of extractRows<{
    construtora_id: string;
    fundo_id: string;
    qtd: number;
    volume: number;
  }>(concRes)) {
    concMap.set(`${r.construtora_id}__${r.fundo_id}`, {
      qtd: r.qtd,
      volume: r.volume,
    });
  }

  // Blacklist do fundo x construtora
  const blRes = await db.execute(sql`
    SELECT fundo_id, construtora_id FROM fundo_blacklist
  `);
  const blacklistSet = new Set<string>(
    extractRows<{ fundo_id: string; construtora_id: string }>(blRes).map(
      (r) => `${r.fundo_id}__${r.construtora_id}`,
    ),
  );

  // Pra cada op, calcular sugestões
  const result: SourcingOp[] = ops.map((o) => {
    const sugestoes = fundos
      .map((f): SourcingSugestao => {
        const conc = concMap.get(`${o.construtora_id}__${f.id}`);
        const qtdComConstrutora = conc?.qtd ?? 0;
        const volumeConstrutoraNoFundo = conc?.volume ?? 0;
        const concentracao =
          f.volume_total > 0 ? volumeConstrutoraNoFundo / f.volume_total : 0;
        const blacklist = blacklistSet.has(`${f.id}__${o.construtora_id}`);

        // Score 0-100: comeca em 70, ajusta:
        // +20 se já fez ops com essa construtora (familiaridade)
        // -30 se concentração > 40%
        // -15 se concentração > 25%
        // +15 se taxa do fundo == taxa da op (sem ajuste)
        // -10 se taxa do fundo > taxa da op + 1pp
        // bonus +5 por cada 10 ops realizadas (até 15)
        let score = 70;
        let motivo = "Capacidade aberta";

        if (blacklist) {
          score = 0;
          motivo = "Blacklist da construtora";
        } else {
          if (qtdComConstrutora > 0) {
            score += 20;
            motivo = `Já tem ${qtdComConstrutora} op(s) com essa construtora`;
          }
          if (concentracao > 0.4) {
            score -= 30;
            motivo = `Concentração ${(concentracao * 100).toFixed(0)}% — alta`;
          } else if (concentracao > 0.25) {
            score -= 15;
          }
          const diffTaxa = f.taxa_base - o.taxa_mensal;
          if (Math.abs(diffTaxa) < 0.001) {
            score += 15;
            if (qtdComConstrutora === 0) motivo = "Taxa exatamente igual";
          } else if (diffTaxa > 0.01) {
            score -= 10;
          }
          score += Math.min(15, Math.floor(f.total_ops / 10) * 5);
        }

        return {
          fundoId: f.id,
          fundoNome: f.nome,
          taxaBase: f.taxa_base,
          score: Math.max(0, Math.min(100, score)),
          concentracaoConstrutora: concentracao,
          qtdComConstrutora,
          motivo,
          blacklist,
        };
      })
      .filter((s) => !s.blacklist)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      id: o.id,
      numero: o.numero,
      valorPresente: o.valor_presente,
      valorComissao: o.valor_comissao,
      taxaMensal: o.taxa_mensal,
      numeroParcelas: o.numero_parcelas,
      construtoraId: o.construtora_id,
      construtoraNome: o.construtora_nome,
      construtoraScore: o.construtora_score,
      corretorNome: o.corretor_nome,
      criadaEm: o.created_at,
      diasAguardando: o.dias_aguardando,
      sugestoes,
    };
  });

  return result;
}

/** Atribui um fundo a uma operação que está sem fundo. Aciona via sourcing. */
export async function assignFundoFromSourcing(input: {
  operacaoId: string;
  fundoId: string;
}) {
  const admin = await requireAdmin();

  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, input.operacaoId))
    .limit(1);
  if (!op) throw new Error("Operação não encontrada");
  if (op.fundoId)
    throw new Error("Esta operação já tem fundo. Use a tela de decisão pra trocar.");

  await db
    .update(operacoes)
    .set({ fundoId: input.fundoId, updatedAt: new Date() })
    .where(eq(operacoes.id, input.operacaoId));

  await db.insert(auditLogs).values({
    userId: admin.id,
    userRole: "admin",
    userEmail: admin.email,
    action: "operacao_fundo_atribuido_sourcing",
    targetType: "operacao",
    targetId: input.operacaoId,
    targetLabel: op.numero,
    metadata: { fundoId: input.fundoId },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/decidir");
  revalidatePath(`/admin/operacoes/${input.operacaoId}`);
  return { ok: true };
}

/* ============================================================
   FUNDO — capacidade, mesa metrics, calendário, score carteira
   ============================================================ */

export type FundoCapacidade = {
  comprometido: number;
  recebivelTotal: number;
  recebivel30d: number;
  recebivel60d: number;
  recebivel90d: number;
  faturadoMes: number;
  taxaMediaAtiva: number;
  ticketMedio: number;
};

export async function getFundoCapacidade(
  fundoId: string,
): Promise<FundoCapacidade> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH ativas AS (
      SELECT id, valor_presente::float AS vp, taxa_mensal::float AS tx
      FROM operacoes
      WHERE fundo_id = ${fundoId}::uuid
        AND status IN ('enviada_para_pagamento')
    ),
    parcelas AS (
      SELECT p.valor::float AS valor, p.vencimento, p.status, p.pago_em
      FROM parcelas_comissao p
      INNER JOIN operacoes o ON o.id = p.operacao_id
      WHERE o.fundo_id = ${fundoId}::uuid
        AND o.status NOT IN ('rascunho','recusada','cancelada')
    )
    SELECT
      (SELECT COALESCE(SUM(vp),0) FROM ativas) AS comprometido,
      (SELECT COALESCE(AVG(tx),0) FROM ativas) AS taxa_media,
      (SELECT COALESCE(AVG(vp),0) FROM ativas) AS ticket_medio,
      (SELECT COALESCE(SUM(valor),0) FROM parcelas WHERE status IN ('a_vencer','vencida')) AS recebivel_total,
      (SELECT COALESCE(SUM(valor),0) FROM parcelas WHERE status = 'a_vencer' AND vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS receb_30d,
      (SELECT COALESCE(SUM(valor),0) FROM parcelas WHERE status = 'a_vencer' AND vencimento BETWEEN CURRENT_DATE + 31 AND CURRENT_DATE + 60) AS receb_60d,
      (SELECT COALESCE(SUM(valor),0) FROM parcelas WHERE status = 'a_vencer' AND vencimento BETWEEN CURRENT_DATE + 61 AND CURRENT_DATE + 90) AS receb_90d,
      (SELECT COALESCE(SUM(valor),0) FROM parcelas WHERE status = 'paga' AND date_trunc('month', pago_em) = date_trunc('month', CURRENT_DATE)) AS faturado_mes
  `);
  const row =
    extractRows<{
      comprometido: number;
      taxa_media: number;
      ticket_medio: number;
      recebivel_total: number;
      receb_30d: number;
      receb_60d: number;
      receb_90d: number;
      faturado_mes: number;
    }>(res)[0] ?? {
      comprometido: 0,
      taxa_media: 0,
      ticket_medio: 0,
      recebivel_total: 0,
      receb_30d: 0,
      receb_60d: 0,
      receb_90d: 0,
      faturado_mes: 0,
    };

  return {
    comprometido: row.comprometido,
    recebivelTotal: row.recebivel_total,
    recebivel30d: row.receb_30d,
    recebivel60d: row.receb_60d,
    recebivel90d: row.receb_90d,
    faturadoMes: row.faturado_mes,
    taxaMediaAtiva: row.taxa_media,
    ticketMedio: row.ticket_medio,
  };
}

export type FundoMesaMetrics = {
  pendentesQtd: number;
  pendentesValor: number;
  pendentesMais3d: number;
  tmdHoras: number | null;
  pctAprovacao90d: number | null;
};

export async function getFundoMesaMetrics(
  fundoId: string,
): Promise<FundoMesaMetrics> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH pend AS (
      SELECT id, valor_presente::float AS vp, created_at
      FROM operacoes
      WHERE fundo_id = ${fundoId}::uuid
        AND status IN ('pre_aprovada','analise_final')
        AND (fundo_aprovacao IS NULL OR fundo_aprovacao = 'pendente')
    ),
    decididas90d AS (
      SELECT
        GREATEST(0, EXTRACT(EPOCH FROM (fundo_aprovado_em - created_at))/3600)::float AS horas,
        fundo_aprovacao
      FROM operacoes
      WHERE fundo_id = ${fundoId}::uuid
        AND fundo_aprovado_em IS NOT NULL
        AND fundo_aprovado_em >= NOW() - INTERVAL '90 days'
    )
    SELECT
      (SELECT COUNT(*) FROM pend)::int AS pend_qtd,
      (SELECT COALESCE(SUM(vp),0) FROM pend)::float AS pend_valor,
      (SELECT COUNT(*) FROM pend WHERE created_at < NOW() - INTERVAL '3 days')::int AS mais_3d,
      (SELECT AVG(horas)::float FROM decididas90d) AS tmd_horas,
      (SELECT
        CASE WHEN COUNT(*) > 0
          THEN (COUNT(*) FILTER (WHERE fundo_aprovacao = 'aprovada')::float / COUNT(*)::float)::float
          ELSE NULL END
       FROM decididas90d) AS pct_aprovacao
  `);
  const row =
    extractRows<{
      pend_qtd: number;
      pend_valor: number;
      mais_3d: number;
      tmd_horas: number | null;
      pct_aprovacao: number | null;
    }>(res)[0] ?? {
      pend_qtd: 0,
      pend_valor: 0,
      mais_3d: 0,
      tmd_horas: null,
      pct_aprovacao: null,
    };

  return {
    pendentesQtd: row.pend_qtd,
    pendentesValor: row.pend_valor,
    pendentesMais3d: row.mais_3d,
    tmdHoras: row.tmd_horas == null ? null : Number(row.tmd_horas),
    pctAprovacao90d:
      row.pct_aprovacao == null ? null : Number(row.pct_aprovacao),
  };
}

/* ============================================================
   CALENDÁRIOS — listas cronológicas agrupadas por dia
   ============================================================ */

export type CalendarioItem = {
  data: string; // YYYY-MM-DD
  valor: number;
  contrapartes: string[];
  qtd: number;
  href?: string;
  /** "vencer" | "vencido" | "pago" */
  tone: "vencer" | "vencido" | "pago";
};

/** Calendário do fundo: próximas parcelas a receber. */
export async function getFundoCalendario(
  fundoId: string,
  dias = 30,
): Promise<CalendarioItem[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    SELECT
      p.vencimento::text AS data,
      SUM(p.valor)::float AS valor,
      COUNT(*)::int AS qtd,
      ARRAY_AGG(DISTINCT COALESCE(c.razao_social, '—')) AS contrapartes,
      MAX(CASE WHEN p.status = 'vencida' OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE) THEN 1 ELSE 0 END) AS vencido
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    WHERE o.fundo_id = ${fundoId}::uuid
      AND o.status NOT IN ('rascunho','recusada','cancelada')
      AND p.status IN ('a_vencer','vencida')
      AND p.vencimento BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE + make_interval(days => ${dias}::int)
    GROUP BY p.vencimento
    ORDER BY p.vencimento ASC
    LIMIT 60
  `);
  return extractRows<{
    data: string;
    valor: number;
    qtd: number;
    contrapartes: string[];
    vencido: number;
  }>(res).map((r) => ({
    data: r.data,
    valor: r.valor,
    qtd: r.qtd,
    contrapartes: r.contrapartes ?? [],
    tone: r.vencido ? "vencido" : "vencer",
  }));
}

/** Calendário da construtora: próximas parcelas a pagar. */
export async function getConstrutoraCalendario(
  construtoraId: string,
  dias = 30,
): Promise<CalendarioItem[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    SELECT
      p.vencimento::text AS data,
      SUM(p.valor)::float AS valor,
      COUNT(*)::int AS qtd,
      ARRAY_AGG(DISTINCT COALESCE(f.nome_fantasia, f.razao_social, '— sem fundo —')) AS contrapartes,
      MAX(CASE WHEN p.status = 'vencida' OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE) THEN 1 ELSE 0 END) AS vencido
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE o.construtora_id = ${construtoraId}::uuid
      AND o.status NOT IN ('rascunho','recusada','cancelada')
      AND p.status IN ('a_vencer','vencida')
      AND p.vencimento BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE + make_interval(days => ${dias}::int)
    GROUP BY p.vencimento
    ORDER BY p.vencimento ASC
    LIMIT 60
  `);
  return extractRows<{
    data: string;
    valor: number;
    qtd: number;
    contrapartes: string[];
    vencido: number;
  }>(res).map((r) => ({
    data: r.data,
    valor: r.valor,
    qtd: r.qtd,
    contrapartes: r.contrapartes ?? [],
    tone: r.vencido ? "vencido" : "vencer",
  }));
}

/** Saldo da construtora agregado por fundo. */
export type ConstrutoraPorFundo = {
  fundoId: string | null;
  fundoNome: string;
  aVencer: number;
  vencido: number;
  total: number;
  qtdParcelas: number;
};

export async function getConstrutoraPorFundo(
  construtoraId: string,
): Promise<ConstrutoraPorFundo[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    SELECT
      o.fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social, '— sem fundo —') AS fundo_nome,
      COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'a_vencer' AND p.vencimento >= CURRENT_DATE)::float, 0) AS a_vencer,
      COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'vencida' OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE))::float, 0) AS vencido,
      COUNT(*) FILTER (WHERE p.status IN ('a_vencer','vencida'))::int AS qtd
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE o.construtora_id = ${construtoraId}::uuid
      AND o.status NOT IN ('rascunho','recusada','cancelada')
    GROUP BY o.fundo_id, fundo_nome
    HAVING COUNT(*) FILTER (WHERE p.status IN ('a_vencer','vencida')) > 0
    ORDER BY (
      COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'vencida' OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE)), 0)
      + COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'a_vencer' AND p.vencimento >= CURRENT_DATE), 0)
    ) DESC
  `);
  return extractRows<{
    fundo_id: string | null;
    fundo_nome: string;
    a_vencer: number;
    vencido: number;
    qtd: number;
  }>(res).map((r) => ({
    fundoId: r.fundo_id,
    fundoNome: r.fundo_nome,
    aVencer: r.a_vencer,
    vencido: r.vencido,
    total: r.a_vencer + r.vencido,
    qtdParcelas: r.qtd,
  }));
}

/* ============================================================
   CORRETOR — a receber, action items, funil pessoal
   ============================================================ */

export type CorretorAReceber = {
  esteMes: number;
  proxMes: number;
  proximos90d: number;
  qtdAtivas: number;
  proximaParcela: {
    valor: number;
    vencimento: string;
    operacaoId: string;
    operacaoNumero: string;
    construtoraNome: string | null;
  } | null;
};

export async function getCorretorAReceber(
  userId: string,
): Promise<CorretorAReceber> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH parcelas_ativas AS (
      SELECT p.id, p.valor::float AS valor, p.vencimento, p.status,
        o.id AS op_id, o.numero AS op_numero, c.razao_social AS construtora_nome
      FROM parcelas_comissao p
      INNER JOIN operacoes o ON o.id = p.operacao_id
      LEFT JOIN construtoras c ON c.id = o.construtora_id
      WHERE o.corretor_user_id = ${userId}
        AND o.status NOT IN ('rascunho','recusada','cancelada')
        AND p.status IN ('a_vencer')
    )
    SELECT
      COALESCE(SUM(valor) FILTER (WHERE date_trunc('month', vencimento) = date_trunc('month', CURRENT_DATE)), 0)::float AS este_mes,
      COALESCE(SUM(valor) FILTER (WHERE date_trunc('month', vencimento) = date_trunc('month', CURRENT_DATE + INTERVAL '1 month')), 0)::float AS prox_mes,
      COALESCE(SUM(valor) FILTER (WHERE vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 90), 0)::float AS prox_90d,
      COUNT(DISTINCT op_id)::int AS qtd_ops
    FROM parcelas_ativas
  `);
  const row =
    extractRows<{
      este_mes: number;
      prox_mes: number;
      prox_90d: number;
      qtd_ops: number;
    }>(res)[0] ?? { este_mes: 0, prox_mes: 0, prox_90d: 0, qtd_ops: 0 };

  const nextRes = await db.execute(sql`
    SELECT p.valor::float AS valor, p.vencimento::text AS venc,
      o.id AS op_id, o.numero AS op_numero, c.razao_social AS construtora_nome
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    WHERE o.corretor_user_id = ${userId}
      AND p.status = 'a_vencer'
      AND p.vencimento >= CURRENT_DATE
    ORDER BY p.vencimento ASC
    LIMIT 1
  `);
  const next = extractRows<{
    valor: number;
    venc: string;
    op_id: string;
    op_numero: string;
    construtora_nome: string | null;
  }>(nextRes)[0];

  return {
    esteMes: row.este_mes,
    proxMes: row.prox_mes,
    proximos90d: row.prox_90d,
    qtdAtivas: row.qtd_ops,
    proximaParcela: next
      ? {
          valor: next.valor,
          vencimento: next.venc,
          operacaoId: next.op_id,
          operacaoNumero: next.op_numero,
          construtoraNome: next.construtora_nome,
        }
      : null,
  };
}

export type CorretorActionItem = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: "info" | "warn" | "danger";
};

export async function getCorretorActions(
  userId: string,
  email: string,
): Promise<CorretorActionItem[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH rascunho AS (
      SELECT COUNT(*)::int AS qtd FROM operacoes
      WHERE corretor_user_id = ${userId} AND status = 'rascunho'
    ),
    pendencias AS (
      SELECT COUNT(*)::int AS qtd FROM operacoes
      WHERE corretor_user_id = ${userId} AND status = 'documentos_incompletos'
    ),
    convites AS (
      SELECT COUNT(*)::int AS qtd FROM pending_operacoes po
      WHERE LOWER(po.corretor_email) = LOWER(${email})
        AND po.status = 'aguardando_cedente'
    ),
    docs AS (
      SELECT COUNT(*)::int AS qtd FROM documento_solicitacoes
      WHERE dest_user_id = ${userId} AND status = 'pendente'
    )
    SELECT
      (SELECT qtd FROM rascunho) AS rascunho,
      (SELECT qtd FROM pendencias) AS pendencias,
      (SELECT qtd FROM convites) AS convites,
      (SELECT qtd FROM docs) AS docs
  `);
  const row =
    extractRows<{
      rascunho: number;
      pendencias: number;
      convites: number;
      docs: number;
    }>(res)[0] ?? { rascunho: 0, pendencias: 0, convites: 0, docs: 0 };

  const all: CorretorActionItem[] = [
    {
      key: "convites",
      label: "Convites de operação pra você",
      count: row.convites,
      href: "/painel/convites",
      tone: "info",
    },
    {
      key: "pendencias",
      label: "Operações com documentos incompletos",
      count: row.pendencias,
      href: "/painel/pendencias",
      tone: "warn",
    },
    {
      key: "rascunho",
      label: "Rascunhos não enviados",
      count: row.rascunho,
      href: "/painel/operacoes",
      tone: "info",
    },
    {
      key: "docs",
      label: "Documentos solicitados pra você",
      count: row.docs,
      href: "/painel/documentos",
      tone: "warn",
    },
  ];
  return all.filter((i) => i.count > 0);
}

/* ============================================================
   CONSTRUTORA — ações pendentes
   ============================================================ */

export type ConstrutoraActionItem = {
  key: string;
  label: string;
  count: number;
  href: string;
  tone: "info" | "warn" | "danger";
};

export async function getConstrutoraActions(
  construtoraId: string,
  userId: string,
): Promise<ConstrutoraActionItem[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH assinar AS (
      SELECT COUNT(*)::int AS qtd FROM operacoes
      WHERE construtora_id = ${construtoraId}::uuid
        AND status IN ('enviada_para_assinatura','enviada_para_pagamento')
        AND construtora_assinada_em IS NULL
        AND construtora_recusou_assinatura_em IS NULL
    ),
    docs AS (
      SELECT COUNT(*)::int AS qtd FROM documento_solicitacoes
      WHERE (dest_construtora_id = ${construtoraId}::uuid OR dest_user_id = ${userId})
        AND status = 'pendente'
    ),
    chats AS (
      SELECT COUNT(*)::int AS qtd
      FROM ticket_participants tp
      INNER JOIN tickets t ON t.id = tp.ticket_id
      WHERE tp.user_id = ${userId}
        AND tp.left_at IS NULL
        AND t.status = 'aberto'
        AND t.arquivado_em IS NULL
        AND EXISTS (
          SELECT 1 FROM ticket_messages tm
          WHERE tm.ticket_id = t.id
            AND tm.from_user_id != ${userId}
            AND (tp.last_read_at IS NULL OR tm.created_at > tp.last_read_at)
        )
    ),
    parcelas_hoje AS (
      SELECT COUNT(*)::int AS qtd, COALESCE(SUM(p.valor)::float, 0) AS valor
      FROM parcelas_comissao p
      INNER JOIN operacoes o ON o.id = p.operacao_id
      WHERE o.construtora_id = ${construtoraId}::uuid
        AND p.status = 'a_vencer'
        AND p.vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
    )
    SELECT
      (SELECT qtd FROM assinar) AS assinar,
      (SELECT qtd FROM docs) AS docs,
      (SELECT qtd FROM chats) AS chats,
      (SELECT qtd FROM parcelas_hoje) AS parcelas_7d
  `);
  const row =
    extractRows<{
      assinar: number;
      docs: number;
      chats: number;
      parcelas_7d: number;
    }>(res)[0] ?? { assinar: 0, docs: 0, chats: 0, parcelas_7d: 0 };

  const all: ConstrutoraActionItem[] = [
    {
      key: "assinar",
      label: "Operações pra assinar",
      count: row.assinar,
      href: "/painel/operacoes?filtro=assinar",
      tone: "warn",
    },
    {
      key: "docs",
      label: "Documentos solicitados",
      count: row.docs,
      href: "/painel/documentos",
      tone: "warn",
    },
    {
      key: "chats",
      label: "Mensagens não lidas",
      count: row.chats,
      href: "/painel/suporte",
      tone: "info",
    },
    {
      key: "parcelas_7d",
      label: "Parcelas vencendo em 7 dias",
      count: row.parcelas_7d,
      href: "/painel/duplicatas",
      tone: "info",
    },
  ];
  return all.filter((i) => i.count > 0);
}

/* ============================================================
   COMERCIAL — calendário comissão, funil carteira, ranking
   ============================================================ */

export type ComercialCalendarioItem = {
  data: string;
  valor: number;
  operacoes: string[];
};

export async function getComercialCalendario(
  comercialId: string,
  dias = 90,
): Promise<ComercialCalendarioItem[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    SELECT
      date_trunc('day', cc.gerada_em)::text AS data,
      SUM(cc.valor_devido - cc.valor_pago)::float AS valor,
      ARRAY_AGG(o.numero) AS operacoes
    FROM comissoes_comercial cc
    INNER JOIN operacoes o ON o.id = cc.operacao_id
    WHERE cc.comercial_id = ${comercialId}::uuid
      AND cc.status = 'pendente'
      AND cc.gerada_em <= NOW() + make_interval(days => ${dias}::int)
    GROUP BY date_trunc('day', cc.gerada_em)
    ORDER BY date_trunc('day', cc.gerada_em) ASC
    LIMIT 60
  `);
  return extractRows<{ data: string; valor: number; operacoes: string[] }>(res).map(
    (r) => ({
      data: r.data,
      valor: r.valor,
      operacoes: r.operacoes ?? [],
    }),
  );
}

export type ComercialFunil = {
  imobiliariasCadastradas: number;
  imobiliariasComOp: number;
  imobiliariasAtivas90d: number;
  ticketMedio: number;
  taxaConversao: number; // % imobs cadastradas que operaram
  tempoMedioPrimeiraOpDias: number | null;
};

export async function getComercialFunil(
  comercialId: string,
): Promise<ComercialFunil> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH imobs AS (
      SELECT i.id, i.created_at
      FROM imobiliarias i
      WHERE i.comercial_id = ${comercialId}::uuid
    ),
    imobs_com_op AS (
      SELECT DISTINCT o.imobiliaria_id
      FROM operacoes o
      INNER JOIN imobs i ON i.id = o.imobiliaria_id
      WHERE o.status NOT IN ('rascunho','recusada','cancelada')
    ),
    imobs_ativas AS (
      SELECT DISTINCT o.imobiliaria_id
      FROM operacoes o
      INNER JOIN imobs i ON i.id = o.imobiliaria_id
      WHERE o.status NOT IN ('rascunho','recusada','cancelada')
        AND o.created_at >= NOW() - INTERVAL '90 days'
    ),
    primeira_op AS (
      SELECT
        i.id,
        EXTRACT(DAY FROM (MIN(o.created_at) - i.created_at))::float AS dias_primeira
      FROM imobs i
      INNER JOIN operacoes o ON o.imobiliaria_id = i.id
      WHERE o.status NOT IN ('rascunho','recusada','cancelada')
      GROUP BY i.id, i.created_at
    )
    SELECT
      (SELECT COUNT(*) FROM imobs)::int AS cadastradas,
      (SELECT COUNT(*) FROM imobs_com_op)::int AS com_op,
      (SELECT COUNT(*) FROM imobs_ativas)::int AS ativas,
      (SELECT COALESCE(AVG(o.valor_presente)::float, 0) FROM operacoes o
        WHERE o.comercial_id = ${comercialId}::uuid
          AND o.status NOT IN ('rascunho','recusada','cancelada')) AS ticket_medio,
      (SELECT AVG(dias_primeira) FROM primeira_op) AS dias_primeira
  `);
  const row =
    extractRows<{
      cadastradas: number;
      com_op: number;
      ativas: number;
      ticket_medio: number;
      dias_primeira: number | null;
    }>(res)[0] ?? {
      cadastradas: 0,
      com_op: 0,
      ativas: 0,
      ticket_medio: 0,
      dias_primeira: null,
    };

  return {
    imobiliariasCadastradas: row.cadastradas,
    imobiliariasComOp: row.com_op,
    imobiliariasAtivas90d: row.ativas,
    ticketMedio: row.ticket_medio,
    taxaConversao:
      row.cadastradas > 0 ? row.com_op / row.cadastradas : 0,
    tempoMedioPrimeiraOpDias: row.dias_primeira,
  };
}

export type ComercialRankingEntry = {
  comercialId: string;
  nome: string;
  volume: number;
  qtdOps: number;
  posicao: number;
  isYou: boolean;
};

export async function getComercialRanking(
  comercialId: string,
): Promise<ComercialRankingEntry[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    SELECT
      cm.id AS comercial_id,
      COALESCE(cm.apelido, cm.nome_completo) AS nome,
      COALESCE(SUM(o.valor_presente)::float, 0) AS volume,
      COUNT(o.id)::int AS qtd_ops
    FROM comerciais cm
    LEFT JOIN operacoes o
      ON o.comercial_id = cm.id
      AND o.status NOT IN ('rascunho','recusada','cancelada')
      AND o.created_at >= NOW() - INTERVAL '90 days'
    WHERE cm.is_active = TRUE
    GROUP BY cm.id, nome
    ORDER BY volume DESC
    LIMIT 10
  `);
  const rows = extractRows<{
    comercial_id: string;
    nome: string;
    volume: number;
    qtd_ops: number;
  }>(res);
  return rows.map((r, i) => ({
    comercialId: r.comercial_id,
    nome: r.nome,
    volume: r.volume,
    qtdOps: r.qtd_ops,
    posicao: i + 1,
    isYou: r.comercial_id === comercialId,
  }));
}
