/** Extrato contábil mensal do fundo logado.
 *
 *  Linha por parcela paga no mês de referência. Inclui decomposição em
 *  capital_aplicado, juros_proporcional, parte_fundo, parte_aq — pronto pra
 *  conciliar com extrato bancário e mandar pro contador.
 *
 *  Query: ?ano=2026&mes=05
 */

import { NextResponse, type NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentFundo } from "@/lib/actions/fundos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  const v = String(s);
  if (/[",;\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function fmtBRL(n: number) {
  return n.toFixed(2).replace(".", ",");
}

export async function GET(req: NextRequest) {
  const fundo = await getCurrentFundo();
  if (!fundo) {
    return NextResponse.json(
      { error: "Apenas usuários com role=fundo podem acessar." },
      { status: 403 },
    );
  }

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const anoStr = searchParams.get("ano") ?? String(now.getFullYear());
  const mesStr =
    searchParams.get("mes") ?? String(now.getMonth() + 1).padStart(2, "0");
  const ano = parseInt(anoStr, 10);
  const mes = parseInt(mesStr, 10);
  if (
    !Number.isFinite(ano) ||
    !Number.isFinite(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    return NextResponse.json(
      { error: "Parâmetros inválidos. Use ?ano=YYYY&mes=MM" },
      { status: 400 },
    );
  }

  const refMes = `${ano}-${String(mes).padStart(2, "0")}`;
  const fromDate = `${refMes}-01`;
  const lastDay = new Date(ano, mes, 0).getDate();
  const toDate = `${refMes}-${String(lastDay).padStart(2, "0")}`;

  // Calcula tudo no SQL pra evitar drift de cálculo
  const result = await db.execute(sql`
    SELECT
      p.id::text AS parcela_id,
      o.numero AS op_numero,
      o.id::text AS operacao_id,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora,
      c.cnpj AS construtora_cnpj,
      COALESCE(im.nome_fantasia, im.razao_social) AS imobiliaria,
      p.numero AS parcela_numero,
      p.vencimento::text AS vencimento,
      p.pago_em::text AS pago_em,
      COALESCE(p.pago_valor, p.valor)::float AS pago_valor,
      o.valor_comissao::float AS valor_comissao_op,
      o.valor_presente::float AS valor_presente_op,
      o.desagio::float AS juros_op,
      COALESCE(o.numero_parcelas, 0) AS prazo,
      o.taxa_mensal::float AS taxa_op,
      COALESCE(o.taxa_fundo_snapshot, ${fundo.taxaMensalBase}, 0)::float AS taxa_fundo,
      COALESCE(custos.total, 0)::float AS custos_op
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN (
      SELECT operacao_id, SUM(valor) AS total
      FROM custos_operacao GROUP BY operacao_id
    ) custos ON custos.operacao_id = o.id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND p.status = 'paga'
      AND p.pago_em >= ${fromDate}::date
      AND p.pago_em <= ${toDate}::date
    ORDER BY p.pago_em ASC, o.numero ASC, p.numero ASC
  `);

  type Raw = {
    parcela_id: string;
    op_numero: string;
    operacao_id: string;
    construtora: string | null;
    construtora_cnpj: string | null;
    imobiliaria: string | null;
    parcela_numero: number;
    vencimento: string;
    pago_em: string;
    pago_valor: number;
    valor_comissao_op: number;
    valor_presente_op: number;
    juros_op: number;
    prazo: number;
    taxa_op: number;
    taxa_fundo: number;
    custos_op: number;
  };
  const rows = (result as unknown as { rows: Raw[] }).rows ?? [];

  const headers = [
    "Data pgto",
    "Operação",
    "Construtora",
    "CNPJ",
    "Imobiliária",
    "Parcela",
    "Vencimento",
    "Valor recebido (bruto)",
    "% da op",
    "Capital aplicado proporcional",
    "Juros proporcional",
    "Custo do dinheiro proporcional",
    "Spread proporcional",
    "Parte do fundo (sua)",
    "Parte AQ (a repassar)",
    "Custos AQ proporcional",
  ];

  // Decomposição por parcela
  const csvLines = [headers.map(csvEscape).join(";")];
  let totalBruto = 0;
  let totalCapital = 0;
  let totalParteFundo = 0;
  let totalParteAQ = 0;

  for (const r of rows) {
    const pctOp =
      r.valor_comissao_op > 0 ? r.pago_valor / r.valor_comissao_op : 0;
    const capitalProporcional = r.valor_presente_op * pctOp;
    const jurosProp = r.juros_op * pctOp;
    const razao =
      r.taxa_op > 0 ? Math.min(1, r.taxa_fundo / r.taxa_op) : 0;
    const custoDinheiroOp = r.juros_op * razao;
    const spreadOp = Math.max(0, r.juros_op - custoDinheiroOp);
    const custoDinheiroProp = custoDinheiroOp * pctOp;
    const spreadProp = spreadOp * pctOp;
    const parteFundoProp = custoDinheiroProp + spreadProp / 2;
    const custosOpProp = r.custos_op * pctOp;
    const parteAQProp = custosOpProp + spreadProp / 2;

    totalBruto += r.pago_valor;
    totalCapital += capitalProporcional;
    totalParteFundo += parteFundoProp;
    totalParteAQ += parteAQProp;

    csvLines.push(
      [
        r.pago_em,
        r.op_numero,
        r.construtora ?? "",
        r.construtora_cnpj ?? "",
        r.imobiliaria ?? "",
        String(r.parcela_numero),
        r.vencimento,
        fmtBRL(r.pago_valor),
        (pctOp * 100).toFixed(2).replace(".", ",") + "%",
        fmtBRL(capitalProporcional),
        fmtBRL(jurosProp),
        fmtBRL(custoDinheiroProp),
        fmtBRL(spreadProp),
        fmtBRL(parteFundoProp),
        fmtBRL(parteAQProp),
        fmtBRL(custosOpProp),
      ]
        .map(csvEscape)
        .join(";"),
    );
  }

  // Linha de totais
  csvLines.push(
    [
      "TOTAIS",
      "",
      "",
      "",
      "",
      "",
      "",
      fmtBRL(totalBruto),
      "",
      fmtBRL(totalCapital),
      "",
      "",
      "",
      fmtBRL(totalParteFundo),
      fmtBRL(totalParteAQ),
      "",
    ]
      .map(csvEscape)
      .join(";"),
  );

  const csv = "﻿" + csvLines.join("\n"); // BOM pra Excel

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="extrato-fundo-${refMes}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
