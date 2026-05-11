"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";
import {
  calcCustoDinheiroFundo,
  calcResultadoOperacao,
  calcSaldoInvoice,
} from "@/lib/operacao-resultado";

export type InvoiceFilters = {
  /** "atual" | "passado" | "proximo" | "custom" — calculados em from/to */
  periodo?: "atual" | "passado" | "proximo" | "custom";
  from?: string; // YYYY-MM-DD
  to?: string;
  fundoId?: string;
  construtoraId?: string;
  imobiliariaId?: string;
  comercialId?: string;
};

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
  /** Data de aprovação final (envio pra pagamento). */
  dataAprovacao: string | null;
  /** Data da venda — informativo. */
  dataVenda: string;
  valorOperacao: number; // valor_presente
  juros: number; // = desagio
  custos: number; // R$ = SUM(custos_operacao.valor)
  resultado: number; // R$ = juros − custos
  taxaMensalFundo: number; // decimal 0..1 ao mês
  prazoMeses: number; // = numero_parcelas
  custoDinheiroFundo: number; // R$ = valor_presente × taxa_mensal × prazo
  saldoRepasse: number; // R$ = (resultado − custoDinheiroFundo) / 2
};

export type InvoicePayload = {
  rows: InvoiceRow[];
  totals: {
    valorOperacao: number;
    juros: number;
    custos: number;
    resultado: number;
    custoDinheiroFundo: number;
    saldoRepasse: number;
  };
  periodLabel: { from: string; to: string };
};

/** Retorna o intervalo [from, to] (datas YYYY-MM-DD) baseado no periodo. */
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
  // default = mês atual
  return { from: ymd(startOfMonth(today)), to: ymd(endOfMonth(today)) };
}

export async function getInvoiceData(
  filters: InvoiceFilters,
): Promise<InvoicePayload> {
  await requireAdmin();
  const { from, to } = resolvePeriodo(filters);

  // Considera operações com aprovação final (status >= enviada_para_pagamento)
  // dentro do período — usando aprovado_em como timestamp do "cash event".
  const conds: ReturnType<typeof sql>[] = [
    sql`o.status IN ('enviada_para_pagamento', 'realizada')`,
    sql`o.aprovado_em IS NOT NULL`,
    sql`o.aprovado_em::date >= ${from}::date`,
    sql`o.aprovado_em::date <= ${to}::date`,
  ];
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

  const where = sql.join(conds, sql` AND `);

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
      o.valor_presente::float AS valor_operacao,
      o.desagio::float AS juros,
      COALESCE(o.numero_parcelas, 0)::int AS prazo_meses,
      COALESCE(f.taxa_mensal_base, 0)::float AS taxa_mensal_fundo,
      COALESCE(custos.total, 0)::float AS custos
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
    WHERE ${where}
    ORDER BY o.aprovado_em DESC
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
    valor_operacao: number;
    juros: number;
    prazo_meses: number;
    taxa_mensal_fundo: number;
    custos: number;
  };
  const rows = (
    (result as unknown as { rows: Raw[] }).rows ?? []
  ).map((r): InvoiceRow => {
    const resultado = calcResultadoOperacao({
      juros: r.juros,
      custos: r.custos,
    });
    const custoDinheiroFundo = calcCustoDinheiroFundo(
      r.valor_operacao,
      r.taxa_mensal_fundo,
      r.prazo_meses,
    );
    const saldoRepasse = calcSaldoInvoice({
      juros: r.juros,
      custos: r.custos,
      valorPresente: r.valor_operacao,
      taxaMensalFundo: r.taxa_mensal_fundo,
      prazoMeses: r.prazo_meses,
    });
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
      valorOperacao: r.valor_operacao,
      juros: r.juros,
      custos: r.custos,
      resultado,
      taxaMensalFundo: r.taxa_mensal_fundo,
      prazoMeses: r.prazo_meses,
      custoDinheiroFundo,
      saldoRepasse,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      valorOperacao: acc.valorOperacao + r.valorOperacao,
      juros: acc.juros + r.juros,
      custos: acc.custos + r.custos,
      resultado: acc.resultado + r.resultado,
      custoDinheiroFundo: acc.custoDinheiroFundo + r.custoDinheiroFundo,
      saldoRepasse: acc.saldoRepasse + r.saldoRepasse,
    }),
    {
      valorOperacao: 0,
      juros: 0,
      custos: 0,
      resultado: 0,
      custoDinheiroFundo: 0,
      saldoRepasse: 0,
    },
  );

  return { rows, totals, periodLabel: { from, to } };
}

/* =========================================================================
   HISTÓRICO MENSAL — pra gráficos (últimos 12 meses)
   ========================================================================= */

export type InvoiceMonthly = {
  /** YYYY-MM */
  ym: string;
  /** Label "mai/26" pra exibir no eixo. */
  label: string;
  qtdOperacoes: number;
  valorOperacao: number;
  juros: number;
  custos: number;
  resultado: number;
  custoDinheiroFundo: number;
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

/** Retorna saldo de repasse e qtd de ops por mês — últimos 12 meses (incluindo
 *  o atual). Aceita os mesmos filtros do invoice (fundo, construtora, etc.)
 *  pra contextualizar os gráficos. */
export async function getInvoiceMonthly(
  filters: Pick<
    InvoiceFilters,
    "fundoId" | "construtoraId" | "imobiliariaId" | "comercialId"
  > = {},
): Promise<InvoiceMonthly[]> {
  await requireAdmin();

  const conds: ReturnType<typeof sql>[] = [
    sql`o.status IN ('enviada_para_pagamento', 'realizada')`,
    sql`o.aprovado_em IS NOT NULL`,
    sql`o.aprovado_em >= (date_trunc('month', CURRENT_DATE) - interval '11 months')`,
    sql`o.aprovado_em < (date_trunc('month', CURRENT_DATE) + interval '1 month')`,
  ];
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
  const where = sql.join(conds, sql` AND `);

  const result = await db.execute(sql`
    WITH ops AS (
      SELECT
        o.id,
        o.aprovado_em,
        o.valor_presente,
        o.desagio,
        COALESCE(o.numero_parcelas, 0) AS prazo_meses,
        COALESCE(f.taxa_mensal_base, 0) AS taxa_mensal_fundo,
        COALESCE(custos.total, 0) AS custos
      FROM operacoes o
      LEFT JOIN fundos f ON f.id = o.fundo_id
      LEFT JOIN construtoras c ON c.id = o.construtora_id
      LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
      LEFT JOIN (
        SELECT operacao_id, SUM(valor) AS total
        FROM custos_operacao
        GROUP BY operacao_id
      ) custos ON custos.operacao_id = o.id
      WHERE ${where}
    )
    SELECT
      to_char(date_trunc('month', aprovado_em), 'YYYY-MM') AS ym,
      EXTRACT(YEAR FROM aprovado_em)::int AS ano,
      EXTRACT(MONTH FROM aprovado_em)::int AS mes,
      COUNT(*)::int AS qtd_operacoes,
      COALESCE(SUM(valor_presente), 0)::float AS valor_operacao,
      COALESCE(SUM(desagio), 0)::float AS juros_total,
      COALESCE(SUM(custos), 0)::float AS custos_total,
      COALESCE(SUM(desagio - custos), 0)::float AS resultado_total,
      COALESCE(SUM(valor_presente * taxa_mensal_fundo * prazo_meses), 0)::float
        AS custo_dinheiro_fundo,
      COALESCE(
        SUM(
          ((desagio - custos)
           - valor_presente * taxa_mensal_fundo * prazo_meses) / 2
        ),
        0
      )::float AS saldo_repasse
    FROM ops
    GROUP BY date_trunc('month', aprovado_em),
             EXTRACT(YEAR FROM aprovado_em),
             EXTRACT(MONTH FROM aprovado_em)
    ORDER BY date_trunc('month', aprovado_em) ASC
  `);

  type Raw = {
    ym: string;
    ano: number;
    mes: number;
    qtd_operacoes: number;
    valor_operacao: number;
    juros_total: number;
    custos_total: number;
    resultado_total: number;
    custo_dinheiro_fundo: number;
    saldo_repasse: number;
  };
  const rowsByYm = new Map<string, Raw>(
    ((result as unknown as { rows: Raw[] }).rows ?? []).map((r) => [r.ym, r]),
  );

  // Preenche os 12 meses, mesmo que sem dados (zero)
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
      valorOperacao: r?.valor_operacao ?? 0,
      juros: r?.juros_total ?? 0,
      custos: r?.custos_total ?? 0,
      resultado: r?.resultado_total ?? 0,
      custoDinheiroFundo: r?.custo_dinheiro_fundo ?? 0,
      saldoRepasse: r?.saldo_repasse ?? 0,
    });
  }
  return out;
}