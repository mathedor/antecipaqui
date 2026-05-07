import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-user";
import { getInvoiceData, type InvoiceFilters } from "@/lib/actions/invoice";

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
function fmtPct(n: number) {
  return (n * 100).toFixed(2).replace(".", ",");
}

export async function GET(req: NextRequest) {
  await requireAdmin();
  const { searchParams } = req.nextUrl;
  const filters: InvoiceFilters = {
    periodo: (searchParams.get("periodo") as InvoiceFilters["periodo"]) ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    fundoId: searchParams.get("fundoId") ?? undefined,
    construtoraId: searchParams.get("construtoraId") ?? undefined,
    imobiliariaId: searchParams.get("imobiliariaId") ?? undefined,
    comercialId: searchParams.get("comercialId") ?? undefined,
  };

  const payload = await getInvoiceData(filters);

  const headers = [
    "Operação",
    "Fundo",
    "Construtora",
    "Imobiliária",
    "Comercial",
    "Data aprovação",
    "Data venda",
    "Valor operação (R$)",
    "Juros (R$)",
    "Custo financeiro (R$)",
    "% Rateio",
    "Impostos (R$)",
    "% Impostos",
    "Saldo de repasse (R$)",
  ];
  const lines = [
    headers.map(csvEscape).join(";"),
    ...payload.rows.map((r) =>
      [
        r.operacaoNumero,
        r.fundoNome ?? "",
        r.construtoraNome ?? "",
        r.imobiliariaNome ?? "",
        r.comercialNome ?? "",
        r.dataAprovacao ?? "",
        r.dataVenda ?? "",
        fmtBRL(r.valorOperacao),
        fmtBRL(r.juros),
        fmtBRL(r.custoFinanceiro),
        fmtPct(r.custoFinanceiroPct),
        fmtBRL(r.impostos),
        fmtPct(r.impostosPct),
        fmtBRL(r.saldoRepasse),
      ]
        .map(csvEscape)
        .join(";"),
    ),
    [
      "TOTAIS",
      "",
      "",
      "",
      "",
      "",
      "",
      fmtBRL(payload.totals.valorOperacao),
      fmtBRL(payload.totals.juros),
      fmtBRL(payload.totals.custoFinanceiro),
      "",
      fmtBRL(payload.totals.impostos),
      "",
      fmtBRL(payload.totals.saldoRepasse),
    ]
      .map(csvEscape)
      .join(";"),
  ];

  // BOM pra Excel reconhecer UTF-8
  const csv = "﻿" + lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoice-${payload.periodLabel.from}-${payload.periodLabel.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}