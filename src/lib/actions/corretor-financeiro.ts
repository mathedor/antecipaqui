"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/auth-user";

export type ForecastMesCorretor = {
  ym: string;
  label: string;
  /** Valor de parcelas a vencer no mês (do que o corretor ainda VAI receber
   *  porque NÃO antecipou aquela parcela). Considera a parcela inteira pq
   *  do POV do corretor, ele já recebeu o VP — o restante é "diferença". */
  valorAVencer: number;
  qtdParcelas: number;
};

export type CorretorFinanceiroPayload = {
  /** Quanto JÁ recebeu via antecipação (soma de VP de ops realizadas) */
  totalAntecipadoYTD: number;
  /** Quanto pagou em juros pra antecipar (soma de desagio) */
  custoTotalAntecipacaoYTD: number;
  /** Custo efetivo médio: desagio / valor_comissao */
  custoMedioPct: number;
  /** Forecast 6 meses: parcelas a vencer das ops ativas */
  forecast: ForecastMesCorretor[];
  /** Total forecast 6 meses (apenas pra somar o card) */
  totalForecast: number;
  /** Total acumulado pelos próximos 6 meses (saldo final ainda a receber via construtora) */
  totalAReceber: number;
  /** Construtoras com pelo menos 1 op vinculada ao corretor (resumo curto) */
  qtdConstrutorasParceiras: number;
};

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Visão financeira pessoal do corretor: forecast de recebimentos futuros
 *  via construtora, total antecipado YTD e custo pago em juros. */
export async function getCorretorFinanceiro(): Promise<CorretorFinanceiroPayload | null> {
  const user = await getCurrentDbUser();
  if (!user) return null;
  if (user.role !== "corretor" && user.role !== "imobiliaria") return null;

  // 1. Totais YTD (ano corrente)
  const ytdRes = await db.execute(sql`
    SELECT
      COALESCE(SUM(o.valor_presente) FILTER (WHERE o.status IN ('enviada_para_pagamento','realizada'))::float, 0) AS antecipado,
      COALESCE(SUM(o.desagio) FILTER (WHERE o.status IN ('enviada_para_pagamento','realizada'))::float, 0) AS custo_juros,
      COALESCE(SUM(o.valor_comissao) FILTER (WHERE o.status IN ('enviada_para_pagamento','realizada'))::float, 0) AS comissao_total,
      COUNT(DISTINCT o.construtora_id) FILTER (WHERE o.status NOT IN ('rascunho','recusada','cancelada'))::int AS qtd_construtoras
    FROM operacoes o
    WHERE o.corretor_user_id = ${user.id}
      AND date_part('year', o.created_at) = date_part('year', CURRENT_DATE)
  `);
  const ytd = (
    ytdRes as unknown as {
      rows: {
        antecipado: number;
        custo_juros: number;
        comissao_total: number;
        qtd_construtoras: number;
      }[];
    }
  ).rows[0] ?? {
    antecipado: 0,
    custo_juros: 0,
    comissao_total: 0,
    qtd_construtoras: 0,
  };
  const custoMedioPct =
    ytd.comissao_total > 0 ? ytd.custo_juros / ytd.comissao_total : 0;

  // 2. Forecast 6 meses — parcelas a vencer das ops do corretor
  const fcRes = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', p.vencimento), 'YYYY-MM') AS ym,
      COUNT(*)::int AS qtd,
      COALESCE(SUM(p.valor)::float, 0) AS valor
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.corretor_user_id = ${user.id}
      AND p.status IN ('a_vencer', 'vencida')
      AND p.vencimento >= date_trunc('month', CURRENT_DATE)
      AND p.vencimento < date_trunc('month', CURRENT_DATE) + interval '6 months'
    GROUP BY date_trunc('month', p.vencimento)
    ORDER BY date_trunc('month', p.vencimento)
  `);
  const rowsByYm = new Map<string, { qtd: number; valor: number }>();
  for (const r of (
    fcRes as unknown as { rows: { ym: string; qtd: number; valor: number }[] }
  ).rows ?? []) {
    rowsByYm.set(r.ym, { qtd: r.qtd, valor: r.valor });
  }

  const forecast: ForecastMesCorretor[] = [];
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const r = rowsByYm.get(ym);
    forecast.push({
      ym,
      label: `${MES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
      valorAVencer: r?.valor ?? 0,
      qtdParcelas: r?.qtd ?? 0,
    });
  }
  const totalForecast = forecast.reduce((s, m) => s + m.valorAVencer, 0);

  // 3. Total a receber (todas as parcelas a vencer/vencidas, não só 6m)
  const arRes = await db.execute(sql`
    SELECT COALESCE(SUM(p.valor)::float, 0) AS total
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.corretor_user_id = ${user.id}
      AND p.status IN ('a_vencer', 'vencida')
  `);
  const totalAReceber =
    (arRes as unknown as { rows: { total: number }[] }).rows[0]?.total ?? 0;

  return {
    totalAntecipadoYTD: ytd.antecipado,
    custoTotalAntecipacaoYTD: ytd.custo_juros,
    custoMedioPct,
    forecast,
    totalForecast,
    totalAReceber,
    qtdConstrutorasParceiras: ytd.qtd_construtoras,
  };
}

/* =========================================
   RELATÓRIO: ranking de construtoras + custo histórico
   ========================================= */

export type RankingConstrutoraCorretor = {
  construtoraId: string;
  construtoraNome: string;
  qtdOps: number;
  valorComissaoTotal: number;
  jurosTotalPago: number; // soma do desagio nas ops com essa construtora
  parcelasPagas: number;
  parcelasVencidas: number;
  diasMedioAtraso: number;
  /** % de parcelas pagas em dia (≤ 3 dias após vencimento) */
  pctEmDia: number;
};

export async function getCorretorRankingConstrutoras(): Promise<
  RankingConstrutoraCorretor[] | null
> {
  const user = await getCurrentDbUser();
  if (!user) return null;
  if (user.role !== "corretor" && user.role !== "imobiliaria") return null;

  const result = await db.execute(sql`
    SELECT
      c.id::text AS construtora_id,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      COUNT(DISTINCT o.id)::int AS qtd_ops,
      COALESCE(SUM(o.valor_comissao)::float, 0) AS valor_comissao,
      COALESCE(SUM(o.desagio)::float, 0) AS juros_pago,
      COUNT(p.id) FILTER (WHERE p.status = 'paga')::int AS parcelas_pagas,
      COUNT(p.id) FILTER (WHERE p.status = 'vencida')::int AS parcelas_vencidas,
      COALESCE(
        AVG((p.pago_em - p.vencimento)::int) FILTER (
          WHERE p.status = 'paga' AND p.pago_em IS NOT NULL
        )::float,
        0
      ) AS dias_medio_atraso,
      COUNT(p.id) FILTER (
        WHERE p.status = 'paga'
          AND p.pago_em IS NOT NULL
          AND (p.pago_em - p.vencimento) <= 3
      )::int AS pagas_em_dia,
      COUNT(p.id) FILTER (WHERE p.status = 'paga')::int AS pagas_total_div
    FROM operacoes o
    INNER JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN parcelas_comissao p ON p.operacao_id = o.id
    WHERE o.corretor_user_id = ${user.id}
      AND o.status NOT IN ('rascunho','recusada','cancelada')
    GROUP BY c.id, c.nome_fantasia, c.razao_social
    HAVING COUNT(DISTINCT o.id) > 0
    ORDER BY valor_comissao DESC
  `);
  type Raw = {
    construtora_id: string;
    construtora_nome: string;
    qtd_ops: number;
    valor_comissao: number;
    juros_pago: number;
    parcelas_pagas: number;
    parcelas_vencidas: number;
    dias_medio_atraso: number;
    pagas_em_dia: number;
    pagas_total_div: number;
  };
  const rows = (result as unknown as { rows: Raw[] }).rows ?? [];

  return rows.map((r) => ({
    construtoraId: r.construtora_id,
    construtoraNome: r.construtora_nome,
    qtdOps: r.qtd_ops,
    valorComissaoTotal: r.valor_comissao,
    jurosTotalPago: r.juros_pago,
    parcelasPagas: r.parcelas_pagas,
    parcelasVencidas: r.parcelas_vencidas,
    diasMedioAtraso: Math.round(r.dias_medio_atraso),
    pctEmDia:
      r.pagas_total_div > 0 ? r.pagas_em_dia / r.pagas_total_div : 0,
  }));
}
