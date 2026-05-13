"use server";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { faturasFundo } from "@/db/schema";
import { getCurrentFundo } from "@/lib/actions/fundos";

export type ForecastMes = {
  ym: string;
  label: string;
  /** Parcelas a vencer no mês (bruto) — o que a construtora paga. */
  bruto: number;
  /** Parte do fundo nessa entrada (custo_dinheiro + spread/2)
   *  proporcional ao valor da parcela / valor_comissao. */
  parteFundo: number;
  /** Parte que será repassada pra Antecipaqui (custos + spread/2)
   *  proporcional. */
  parteAQ: number;
  /** Quantas parcelas vencem no mês */
  qtdParcelas: number;
  /** Quantas parcelas já estão vencidas (vencimento no passado, mas no mês). */
  vencidasNoMes: number;
};

export type FundoCaixaPayload = {
  meses: ForecastMes[];
  totalBruto: number;
  totalParteFundo: number;
  totalParteAQ: number;
  /** Recebido no mês corrente (parcelas com pago_em no mês atual) — pra
   *  conferir o forecast em movimento. */
  recebidoMesAtual: number;
};

const MES_CURTO = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** Forecast 6 meses pro fundo logado.
 *  Considera parcelas em status 'a_vencer' ou 'vencida' de ops ativas do
 *  fundo. Calcula parte_fundo proporcional usando taxa_fundo_snapshot. */
export async function getFundoCaixa(): Promise<FundoCaixaPayload | null> {
  const fundo = await getCurrentFundo();
  if (!fundo) return null;

  // Parcelas pendentes agrupadas por mês de vencimento, com cálculo
  // proporcional de parte_fundo e parte_aq:
  //   spread = max(0, juros × (1 − taxa_fundo/taxa_op))
  //   custo_dinheiro = juros × min(1, taxa_fundo/taxa_op)
  //   parte_fundo_op = custo_dinheiro + spread/2
  //   parte_aq_op    = custos + spread/2
  //   parte_fundo_parcela = parte_fundo_op × (parcela / valor_comissao)
  const result = await db.execute(sql`
    WITH ops AS (
      SELECT
        o.id,
        o.valor_comissao,
        o.desagio,
        COALESCE(o.taxa_fundo_snapshot, ${fundo.taxaMensalBase}, 0) AS taxa_fundo,
        o.taxa_mensal AS taxa_op,
        COALESCE(custos.total, 0) AS custos_op
      FROM operacoes o
      LEFT JOIN (
        SELECT operacao_id, SUM(valor) AS total
        FROM custos_operacao
        GROUP BY operacao_id
      ) custos ON custos.operacao_id = o.id
      WHERE o.fundo_id = ${fundo.id}::uuid
        AND o.status IN ('enviada_para_pagamento','realizada')
    )
    SELECT
      to_char(date_trunc('month', p.vencimento), 'YYYY-MM') AS ym,
      COUNT(*)::int AS qtd_parcelas,
      COUNT(*) FILTER (WHERE p.status = 'vencida')::int AS vencidas,
      COALESCE(SUM(p.valor)::float, 0) AS bruto,
      COALESCE(
        SUM(
          (
            -- custo_dinheiro
            ops.desagio * LEAST(1, ops.taxa_fundo / NULLIF(ops.taxa_op, 0))
            + GREATEST(
                0,
                ops.desagio * (1 - LEAST(1, ops.taxa_fundo / NULLIF(ops.taxa_op, 0)))
              ) / 2
          ) * p.valor / NULLIF(ops.valor_comissao, 0)
        )::float,
        0
      ) AS parte_fundo,
      COALESCE(
        SUM(
          (
            ops.custos_op
            + GREATEST(
                0,
                ops.desagio * (1 - LEAST(1, ops.taxa_fundo / NULLIF(ops.taxa_op, 0)))
              ) / 2
          ) * p.valor / NULLIF(ops.valor_comissao, 0)
        )::float,
        0
      ) AS parte_aq
    FROM parcelas_comissao p
    INNER JOIN ops ON ops.id = p.operacao_id
    WHERE p.status IN ('a_vencer', 'vencida')
      AND p.vencimento >= date_trunc('month', CURRENT_DATE)
      AND p.vencimento < date_trunc('month', CURRENT_DATE) + interval '6 months'
    GROUP BY date_trunc('month', p.vencimento)
    ORDER BY date_trunc('month', p.vencimento)
  `);

  type Raw = {
    ym: string;
    qtd_parcelas: number;
    vencidas: number;
    bruto: number;
    parte_fundo: number;
    parte_aq: number;
  };
  const rowsByYm = new Map<string, Raw>(
    ((result as unknown as { rows: Raw[] }).rows ?? []).map((r) => [r.ym, r]),
  );

  // Preenche os 6 meses (a partir do mês atual)
  const meses: ForecastMes[] = [];
  const base = new Date();
  base.setDate(1);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const r = rowsByYm.get(ym);
    meses.push({
      ym,
      label: `${MES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
      bruto: r?.bruto ?? 0,
      parteFundo: r?.parte_fundo ?? 0,
      parteAQ: r?.parte_aq ?? 0,
      qtdParcelas: r?.qtd_parcelas ?? 0,
      vencidasNoMes: r?.vencidas ?? 0,
    });
  }

  // Recebido no mês atual
  const recebidoRes = await db.execute(sql`
    SELECT COALESCE(SUM(COALESCE(p.pago_valor, p.valor))::float, 0) AS total
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND p.status = 'paga'
      AND p.pago_em >= date_trunc('month', CURRENT_DATE)
      AND p.pago_em < date_trunc('month', CURRENT_DATE) + interval '1 month'
  `);
  const recebidoMesAtual = (
    recebidoRes as unknown as { rows: { total: number }[] }
  ).rows[0]?.total ?? 0;

  const totalBruto = meses.reduce((s, m) => s + m.bruto, 0);
  const totalParteFundo = meses.reduce((s, m) => s + m.parteFundo, 0);
  const totalParteAQ = meses.reduce((s, m) => s + m.parteAQ, 0);

  return {
    meses,
    totalBruto,
    totalParteFundo,
    totalParteAQ,
    recebidoMesAtual,
  };
}

/* =========================================
   CONTA-CORRENTE FUNDO ↔ ANTECIPAQUI — espelho do /admin/faturas
   ========================================= */

export type FaturaItem = {
  id: string;
  refMes: string;
  valorDevido: number;
  valorPago: number;
  status: "pendente" | "parcial" | "paga" | "vencida" | "cancelada";
  emitidaEm: Date;
  vencimento: string | null;
  pagaEm: Date | null;
};

/** Faturas que o fundo logado precisa repassar pra Antecipaqui. */
export async function getFundoFaturas(): Promise<{
  fundoNome: string;
  faturas: FaturaItem[];
  totals: { devido: number; pago: number; aPagar: number };
} | null> {
  const fundo = await getCurrentFundo();
  if (!fundo) return null;

  const rows = await db
    .select({
      id: faturasFundo.id,
      refMes: faturasFundo.refMes,
      valorDevido: faturasFundo.valorDevido,
      valorPago: faturasFundo.valorPago,
      status: faturasFundo.status,
      emitidaEm: faturasFundo.emitidaEm,
      vencimento: faturasFundo.vencimento,
      pagaEm: faturasFundo.pagaEm,
    })
    .from(faturasFundo)
    .where(eq(faturasFundo.fundoId, fundo.id))
    .orderBy(desc(faturasFundo.refMes), desc(faturasFundo.emitidaEm));

  const faturas: FaturaItem[] = rows.map((r) => ({
    id: r.id,
    refMes: r.refMes,
    valorDevido: parseFloat(r.valorDevido),
    valorPago: parseFloat(r.valorPago),
    status: r.status,
    emitidaEm: r.emitidaEm,
    vencimento: r.vencimento,
    pagaEm: r.pagaEm,
  }));

  const totals = faturas.reduce(
    (acc, f) => ({
      devido: acc.devido + f.valorDevido,
      pago: acc.pago + f.valorPago,
      aPagar:
        acc.aPagar + (f.status === "paga" ? 0 : f.valorDevido - f.valorPago),
    }),
    { devido: 0, pago: 0, aPagar: 0 },
  );

  return {
    fundoNome: fundo.nomeFantasia ?? fundo.razaoSocial,
    faturas,
    totals,
  };
}
