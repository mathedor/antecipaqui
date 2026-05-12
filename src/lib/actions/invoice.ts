"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";
import {
  calcCustoDinheiroFundo,
  calcRepasseInvoice,
  calcResultadoOperacao,
  calcSpread,
} from "@/lib/operacao-resultado";

export type InvoiceFilters = {
  periodo?: "atual" | "passado" | "proximo" | "custom";
  from?: string; // YYYY-MM-DD
  to?: string;
  fundoId?: string;
  construtoraId?: string;
  imobiliariaId?: string;
  comercialId?: string;
};

/** Uma linha do Invoice = uma operação com pelo menos 1 parcela paga no
 *  período selecionado. Saldo de repasse é proporcional ao valor pago. */
export type InvoiceRow = {
  operacaoId: string;
  operacaoNumero: string;
  fundoId: string | null;
  fundoNome: string | null;
  construtoraId: string | null;
  construtoraNome: string | null;
  imobiliariaId: string | null;
  imobiliariaNome: string | null;
  comercialId: string | null;
  comercialNome: string | null;
  dataAprovacao: string | null;
  dataVenda: string;
  /** valor_comissao da operação (total a ser pago pela construtora) */
  valorComissaoTotal: number;
  valorPresente: number;
  /** Quanto a construtora pagou DESSA OP dentro do período */
  pagoNoPeriodo: number;
  /** pagoNoPeriodo / valorComissaoTotal */
  pctPago: number;
  juros: number;
  custos: number;
  taxaMensalOp: number;
  taxaMensalFundo: number;
  prazoMeses: number;
  custoDinheiroFundo: number;
  spread: number; // max(0, juros − custoDinheiroFundo)
  /** Resultado AQ na op INTEIRA (potencial) = custos + spread/2 */
  resultadoOpAQ: number;
  /** Repasse devido no PERÍODO = resultadoOpAQ × pctPago */
  saldoRepasse: number;
};

export type InvoicePayload = {
  rows: InvoiceRow[];
  totals: {
    valorComissaoTotal: number;
    pagoNoPeriodo: number;
    juros: number;
    custos: number;
    custoDinheiroFundo: number;
    spread: number;
    resultadoOpAQ: number;
    saldoRepasse: number;
  };
  periodLabel: { from: string; to: string };
};

function resolvePeriodo(filters: InvoiceFilters): {
  from: string;
  to: string;
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0);

  if (filters.periodo === "passado") {
    const ref = new Date(today);
    ref.setMonth(ref.getMonth() - 1);
    return { from: ymd(startOfMonth(ref)), to: ymd(endOfMonth(ref)) };
  }
  if (filters.periodo === "proximo") {
    const ref = new Date(today);
    ref.setMonth(ref.getMonth() + 1);
    return { from: ymd(startOfMonth(ref)), to: ymd(endOfMonth(ref)) };
  }
  if (filters.periodo === "custom") {
    return {
      from: filters.from ?? ymd(startOfMonth(today)),
      to: filters.to ?? ymd(endOfMonth(today)),
    };
  }
  return { from: ymd(startOfMonth(today)), to: ymd(endOfMonth(today)) };
}

export async function getInvoiceData(
  filters: InvoiceFilters,
): Promise<InvoicePayload> {
  await requireAdmin();
  const { from, to } = resolvePeriodo(filters);

  const conds: ReturnType<typeof sql>[] = [];
  if (filters.fundoId) {
    if (filters.fundoId === "_no_fundo_")
      conds.push(sql`o.fundo_id IS NULL`);
    else conds.push(sql`o.fundo_id = ${filters.fundoId}::uuid`);
  }
  if (filters.construtoraId)
    conds.push(sql`o.construtora_id = ${filters.construtoraId}::uuid`);
  if (filters.imobiliariaId)
    conds.push(sql`o.imobiliaria_id = ${filters.imobiliariaId}::uuid`);
  if (filters.comercialId) {
    conds.push(
      sql`(o.comercial_id = ${filters.comercialId}::uuid
        OR c.comercial_id = ${filters.comercialId}::uuid
        OR im.comercial_id = ${filters.comercialId}::uuid)`,
    );
  }
  const extra = conds.length
    ? sql`AND ${sql.join(conds, sql` AND `)}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      o.id::text AS operacao_id,
      o.numero AS operacao_numero,
      o.fundo_id::text AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome,
      o.construtora_id::text AS construtora_id,
      c.razao_social AS construtora_nome,
      o.imobiliaria_id::text AS imobiliaria_id,
      im.razao_social AS imobiliaria_nome,
      o.comercial_id::text AS comercial_id,
      COALESCE(com.apelido, com.nome_completo) AS comercial_nome,
      o.aprovado_em::date::text AS data_aprovacao,
      o.data_venda::text AS data_venda,
      o.valor_comissao::float AS valor_comissao_total,
      o.valor_presente::float AS valor_presente,
      o.desagio::float AS juros,
      COALESCE(o.numero_parcelas, 0)::int AS prazo_meses,
      o.taxa_mensal::float AS taxa_mensal_op,
      COALESCE(f.taxa_mensal_base, 0)::float AS taxa_mensal_fundo,
      COALESCE(custos.total, 0)::float AS custos,
      pagos.total_pago_no_periodo::float AS pago_no_periodo
    FROM operacoes o
    LEFT JOIN fundos f ON f.id = o.fundo_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN comerciais com ON com.id = o.comercial_id
    LEFT JOIN (
      SELECT operacao_id, SUM(valor) AS total
      FROM custos_operacao
      GROUP BY operacao_id
    ) custos ON custos.operacao_id = o.id
    INNER JOIN (
      SELECT
        operacao_id,
        SUM(COALESCE(pago_valor, valor)) AS total_pago_no_periodo
      FROM parcelas_comissao
      WHERE status = 'paga'
        AND pago_em IS NOT NULL
        AND pago_em >= ${from}::date
        AND pago_em <= ${to}::date
      GROUP BY operacao_id
    ) pagos ON pagos.operacao_id = o.id
    WHERE o.status IN ('enviada_para_pagamento', 'realizada')
      ${extra}
    ORDER BY pagos.total_pago_no_periodo DESC
  `);

  type Raw = {
    operacao_id: string;
    operacao_numero: string;
    fundo_id: string | null;
    fundo_nome: string | null;
    construtora_id: string | null;
    construtora_nome: string | null;
    imobiliaria_id: string | null;
    imobiliaria_nome: string | null;
    comercial_id: string | null;
    comercial_nome: string | null;
    data_aprovacao: string | null;
    data_venda: string;
    valor_comissao_total: number;
    valor_presente: number;
    juros: number;
    prazo_meses: number;
    taxa_mensal_op: number;
    taxa_mensal_fundo: number;
    custos: number;
    pago_no_periodo: number;
  };

  const rows = (
    (result as unknown as { rows: Raw[] }).rows ?? []
  ).map((r): InvoiceRow => {
    const baseInputs = {
      juros: r.juros,
      taxaMensalOp: r.taxa_mensal_op,
      taxaMensalFundo: r.taxa_mensal_fundo,
    };
    const custoDinheiroFundo = calcCustoDinheiroFundo(baseInputs);
    const spread = calcSpread(baseInputs);
    const resultadoOpAQ = calcResultadoOperacao({
      ...baseInputs,
      custos: r.custos,
    });
    const saldoRepasse = calcRepasseInvoice({
      resultadoOpAQ,
      valorPagoNoPeriodo: r.pago_no_periodo,
      valorComissao: r.valor_comissao_total,
    });
    const pctPago =
      r.valor_comissao_total > 0
        ? r.pago_no_periodo / r.valor_comissao_total
        : 0;

    return {
      operacaoId: r.operacao_id,
      operacaoNumero: r.operacao_numero,
      fundoId: r.fundo_id,
      fundoNome: r.fundo_nome,
      construtoraId: r.construtora_id,
      construtoraNome: r.construtora_nome,
      imobiliariaId: r.imobiliaria_id,
      imobiliariaNome: r.imobiliaria_nome,
      comercialId: r.comercial_id,
      comercialNome: r.comercial_nome,
      dataAprovacao: r.data_aprovacao,
      dataVenda: r.data_venda,
      valorComissaoTotal: r.valor_comissao_total,
      valorPresente: r.valor_presente,
      pagoNoPeriodo: r.pago_no_periodo,
      pctPago,
      juros: r.juros,
      custos: r.custos,
      taxaMensalOp: r.taxa_mensal_op,
      taxaMensalFundo: r.taxa_mensal_fundo,
      prazoMeses: r.prazo_meses,
      custoDinheiroFundo,
      spread,
      resultadoOpAQ,
      saldoRepasse,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      valorComissaoTotal: acc.valorComissaoTotal + r.valorComissaoTotal,
      pagoNoPeriodo: acc.pagoNoPeriodo + r.pagoNoPeriodo,
      juros: acc.juros + r.juros,
      custos: acc.custos + r.custos,
      custoDinheiroFundo: acc.custoDinheiroFundo + r.custoDinheiroFundo,
      spread: acc.spread + r.spread,
      resultadoOpAQ: acc.resultadoOpAQ + r.resultadoOpAQ,
      saldoRepasse: acc.saldoRepasse + r.saldoRepasse,
    }),
    {
      valorComissaoTotal: 0,
      pagoNoPeriodo: 0,
      juros: 0,
      custos: 0,
      custoDinheiroFundo: 0,
      spread: 0,
      resultadoOpAQ: 0,
      saldoRepasse: 0,
    },
  );

  return { rows, totals, periodLabel: { from, to } };
}

/* =========================================================================
   HISTÓRICO MENSAL — pra gráficos (últimos 12 meses)
   ========================================================================= */

export type InvoiceMonthly = {
  ym: string;
  label: string;
  qtdOperacoes: number;
  /** soma de pago_valor (parcelas pagas no mês) */
  pagoNoPeriodo: number;
  /** repasse devido = SUM(resultado_op_aq × pago_no_op / valor_comissao_op) */
  saldoRepasse: number;
};

const MES_CURTO = [
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

export async function getInvoiceMonthly(
  filters: Pick<
    InvoiceFilters,
    "fundoId" | "construtoraId" | "imobiliariaId" | "comercialId"
  > = {},
): Promise<InvoiceMonthly[]> {
  await requireAdmin();

  const conds: ReturnType<typeof sql>[] = [];
  if (filters.fundoId) {
    if (filters.fundoId === "_no_fundo_")
      conds.push(sql`o.fundo_id IS NULL`);
    else conds.push(sql`o.fundo_id = ${filters.fundoId}::uuid`);
  }
  if (filters.construtoraId)
    conds.push(sql`o.construtora_id = ${filters.construtoraId}::uuid`);
  if (filters.imobiliariaId)
    conds.push(sql`o.imobiliaria_id = ${filters.imobiliariaId}::uuid`);
  if (filters.comercialId) {
    conds.push(
      sql`(o.comercial_id = ${filters.comercialId}::uuid
        OR c.comercial_id = ${filters.comercialId}::uuid
        OR im.comercial_id = ${filters.comercialId}::uuid)`,
    );
  }
  const extra = conds.length
    ? sql`AND ${sql.join(conds, sql` AND `)}`
    : sql``;

  // resultado_op_aq = custos + spread/2
  // spread = GREATEST(0, desagio − desagio × LEAST(1, taxa_fundo/taxa_op))
  //        = GREATEST(0, desagio × (1 − LEAST(1, taxa_fundo/taxa_op)))
  // saldo_repasse = SUM(resultado_op_aq × pago_no_op / valor_comissao_op)
  const result = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', p.pago_em), 'YYYY-MM') AS ym,
      COUNT(DISTINCT o.id)::int AS qtd_operacoes,
      COALESCE(SUM(COALESCE(p.pago_valor, p.valor))::float, 0) AS pago_no_periodo,
      COALESCE(
        SUM(
          GREATEST(
            0,
            COALESCE(custos.total, 0)
            + GREATEST(
                0,
                o.desagio * (
                  1 - LEAST(
                    1,
                    COALESCE(f.taxa_mensal_base, 0)
                      / NULLIF(o.taxa_mensal, 0)
                  )
                )
              ) / 2
          )
          * COALESCE(p.pago_valor, p.valor)
          / NULLIF(o.valor_comissao, 0)
        )::float,
        0
      ) AS saldo_repasse
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN fundos f ON f.id = o.fundo_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN (
      SELECT operacao_id, SUM(valor) AS total
      FROM custos_operacao
      GROUP BY operacao_id
    ) custos ON custos.operacao_id = o.id
    WHERE p.status = 'paga'
      AND p.pago_em IS NOT NULL
      AND p.pago_em >= (date_trunc('month', CURRENT_DATE) - interval '11 months')
      AND p.pago_em < (date_trunc('month', CURRENT_DATE) + interval '1 month')
      AND o.status IN ('enviada_para_pagamento', 'realizada')
      ${extra}
    GROUP BY date_trunc('month', p.pago_em)
    ORDER BY date_trunc('month', p.pago_em) ASC
  `);

  type Raw = {
    ym: string;
    qtd_operacoes: number;
    pago_no_periodo: number;
    saldo_repasse: number;
  };
  const rowsByYm = new Map<string, Raw>(
    ((result as unknown as { rows: Raw[] }).rows ?? []).map((r) => [r.ym, r]),
  );

  const out: InvoiceMonthly[] = [];
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const r = rowsByYm.get(ym);
    out.push({
      ym,
      label: `${MES_CURTO[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`,
      qtdOperacoes: r?.qtd_operacoes ?? 0,
      pagoNoPeriodo: r?.pago_no_periodo ?? 0,
      saldoRepasse: r?.saldo_repasse ?? 0,
    });
  }
  return out;
}
