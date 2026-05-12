"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";

export type FinanceiroMetrics = {
  /** Margem efetiva = spread / juros nas ops aprovadas dos últimos 90 dias.
   *  Decimal 0–1. 0 quando não há ops. */
  margemEfetiva: number;
  /** Juros total dos últimos 90 dias (R$) — denominador da margem */
  jurosUltimos90d: number;
  /** Spread total dos últimos 90 dias (R$) — numerador */
  spreadUltimos90d: number;
  /** Forecast: receita AQ esperada por mês de vencimento (próximos 6 meses)
   *  baseado nas parcelas A VENCER de ops ativas. */
  forecast: Array<{ ym: string; label: string; valor: number }>;
};

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

export async function getFinanceiroMetrics(): Promise<FinanceiroMetrics> {
  await requireAdmin();

  // 1. Margem efetiva — últimos 90 dias por aprovado_em
  const margemRow = await db.execute(sql`
    SELECT
      COALESCE(SUM(o.desagio), 0)::float AS juros_total,
      COALESCE(
        SUM(
          GREATEST(
            0,
            o.desagio * (
              1 - LEAST(
                1,
                COALESCE(o.taxa_fundo_snapshot, f.taxa_mensal_base, 0)
                  / NULLIF(o.taxa_mensal, 0)
              )
            )
          )
        )::float,
        0
      ) AS spread_total
    FROM operacoes o
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE o.aprovado_em IS NOT NULL
      AND o.aprovado_em >= NOW() - INTERVAL '90 days'
      AND o.status IN ('enviada_para_pagamento', 'realizada',
                       'pre_aprovada', 'analise_final',
                       'enviada_para_assinatura')
  `);
  const m = (margemRow as unknown as {
    rows: { juros_total: number; spread_total: number }[];
  }).rows[0];
  const juros = m?.juros_total ?? 0;
  const spread = m?.spread_total ?? 0;
  const margemEfetiva = juros > 0 ? spread / juros : 0;

  // 2. Forecast — soma da receita_op_AQ × (valor da parcela / valor_comissao)
  //    pra parcelas com status='a_vencer' ou 'vencida' nos próximos 6 meses
  //    agrupadas por mês de vencimento.
  const forecastRows = await db.execute(sql`
    WITH ops AS (
      SELECT
        o.id,
        o.valor_comissao,
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
        ) AS resultado_op_aq
      FROM operacoes o
      LEFT JOIN fundos f ON f.id = o.fundo_id
      LEFT JOIN (
        SELECT operacao_id, SUM(valor) AS total
        FROM custos_operacao
        GROUP BY operacao_id
      ) custos ON custos.operacao_id = o.id
      WHERE o.status IN ('enviada_para_pagamento', 'realizada')
    )
    SELECT
      to_char(date_trunc('month', p.vencimento), 'YYYY-MM') AS ym,
      COALESCE(
        SUM(
          ops.resultado_op_aq
          * p.valor / NULLIF(ops.valor_comissao, 0)
        )::float,
        0
      ) AS valor
    FROM parcelas_comissao p
    INNER JOIN ops ON ops.id = p.operacao_id
    WHERE p.status IN ('a_vencer', 'vencida')
      AND p.vencimento >= date_trunc('month', CURRENT_DATE)
      AND p.vencimento < date_trunc('month', CURRENT_DATE) + interval '6 months'
    GROUP BY date_trunc('month', p.vencimento)
    ORDER BY date_trunc('month', p.vencimento)
  `);
  const forecastMap = new Map<string, number>(
    (
      (forecastRows as unknown as { rows: { ym: string; valor: number }[] })
        .rows ?? []
    ).map((r) => [r.ym, r.valor]),
  );

  // Preenche os 6 meses, mesmo zerados
  const forecast: FinanceiroMetrics["forecast"] = [];
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    forecast.push({
      ym,
      label: `${MES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
      valor: forecastMap.get(ym) ?? 0,
    });
  }

  return {
    margemEfetiva,
    jurosUltimos90d: juros,
    spreadUltimos90d: spread,
    forecast,
  };
}
