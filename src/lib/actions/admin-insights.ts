"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";

export type AdminInsights = {
  /** Tempo médio entre created_at e aprovado_em em horas, últimas 90d */
  tempoMedioAprovacaoH: number | null;
  /** % de aprovações que vieram de auto-regra (vs manual do fundo) */
  pctAprovacaoAutomatica: number | null;
  /** % de docs validados com confiança alta (ok) vs revisão */
  pctDocsOk: number | null;
  /** Quantidade total de docs marcados pra revisão (admin precisa olhar) */
  qtdDocsRevisao: number;
  /** Spread efetivo médio (resultado_AQ / juros) nas ops dos últimos 90d */
  spreadMedio: number | null;
  /** Ops realizadas no mês atual vs mês anterior */
  opsRealizadasMesAtual: number;
  opsRealizadasMesPassado: number;
};

export async function getAdminInsights(): Promise<AdminInsights> {
  await requireAdmin();

  // Tempo médio aprovação (90 dias)
  const aprov = await db.execute(sql`
    SELECT
      AVG(EXTRACT(EPOCH FROM (aprovado_em - created_at)) / 3600)::float AS horas
    FROM operacoes
    WHERE aprovado_em IS NOT NULL
      AND created_at >= NOW() - INTERVAL '90 days'
  `);
  const tempoMedio = (
    aprov as unknown as { rows: { horas: number | null }[] }
  ).rows[0]?.horas;

  // % de aprovações automáticas (90 dias)
  const aut = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE fundo_aprovacao = 'aprovada' AND fundo_regra_auto_id IS NOT NULL)::float AS auto,
      COUNT(*) FILTER (WHERE fundo_aprovacao = 'aprovada')::float AS total
    FROM operacoes
    WHERE fundo_aprovado_em >= NOW() - INTERVAL '90 days'
  `);
  const a = (
    aut as unknown as { rows: { auto: number; total: number }[] }
  ).rows[0] ?? { auto: 0, total: 0 };
  const pctAuto = a.total > 0 ? a.auto / a.total : null;

  // % docs ok vs revisão (de todos os docs com validação IA)
  const docs = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE validacao_status = 'ok')::float AS ok,
      COUNT(*) FILTER (WHERE validacao_status = 'revisao')::float AS revisao,
      COUNT(*) FILTER (WHERE validacao_status IN ('ok','revisao'))::float AS total_val
    FROM documentos
  `);
  const d = (
    docs as unknown as { rows: { ok: number; revisao: number; total_val: number }[] }
  ).rows[0] ?? { ok: 0, revisao: 0, total_val: 0 };
  const pctDocsOk = d.total_val > 0 ? d.ok / d.total_val : null;

  // Spread médio = resultado_AQ / juros nas ops aprovadas 90d
  const spread = await db.execute(sql`
    SELECT
      AVG(
        GREATEST(
          0,
          COALESCE(custos.total, 0)
          + GREATEST(
              0,
              o.desagio * (
                1 - LEAST(
                  1,
                  COALESCE(o.taxa_fundo_snapshot, f.taxa_mensal_base, 0)
                    / NULLIF(o.taxa_mensal, 0)
                )
              )
            ) / 2
        ) / NULLIF(o.desagio, 0)
      )::float AS spread_medio
    FROM operacoes o
    LEFT JOIN fundos f ON f.id = o.fundo_id
    LEFT JOIN (
      SELECT operacao_id, SUM(valor) AS total
      FROM custos_operacao GROUP BY operacao_id
    ) custos ON custos.operacao_id = o.id
    WHERE o.aprovado_em IS NOT NULL
      AND o.aprovado_em >= NOW() - INTERVAL '90 days'
      AND o.status IN ('enviada_para_pagamento', 'realizada')
  `);
  const spreadMedio = (
    spread as unknown as { rows: { spread_medio: number | null }[] }
  ).rows[0]?.spread_medio;

  // Ops realizadas mês atual / passado
  const mes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE liquidado_em >= date_trunc('month', CURRENT_DATE)
      )::int AS atual,
      COUNT(*) FILTER (
        WHERE liquidado_em >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
          AND liquidado_em < date_trunc('month', CURRENT_DATE)
      )::int AS passado
    FROM operacoes
    WHERE liquidado_em IS NOT NULL
  `);
  const m = (
    mes as unknown as { rows: { atual: number; passado: number }[] }
  ).rows[0] ?? { atual: 0, passado: 0 };

  return {
    tempoMedioAprovacaoH: tempoMedio,
    pctAprovacaoAutomatica: pctAuto,
    pctDocsOk,
    qtdDocsRevisao: Math.round(d.revisao),
    spreadMedio,
    opsRealizadasMesAtual: m.atual,
    opsRealizadasMesPassado: m.passado,
  };
}
