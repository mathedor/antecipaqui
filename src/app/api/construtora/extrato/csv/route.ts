import { NextResponse, type NextRequest } from "next/server";
import { getExtratoConstrutora } from "@/lib/actions/construtora-operacional";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtNum(n: number) {
  return n.toFixed(2).replace(".", ",");
}

function csvEscape(v: string | number | null | undefined) {
  if (v == null) return "";
  const s = String(v);
  if (/[";,\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const TIPO_LABEL: Record<string, string> = {
  parcela_paga: "Paga",
  parcela_a_vencer: "A vencer",
  parcela_vencida: "Vencida",
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const data = await getExtratoConstrutora({
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
    });

    const headers = [
      "data",
      "status",
      "operacao",
      "parcela",
      "valor",
      "valor_pago",
    ];
    const lines = [headers.join(";")];
    for (const l of data.linhas) {
      lines.push(
        [
          csvEscape(l.data),
          csvEscape(TIPO_LABEL[l.tipo] ?? l.tipo),
          csvEscape(l.operacaoNumero),
          l.parcelaNumero,
          fmtNum(l.valor),
          l.valorPago !== null ? fmtNum(l.valorPago) : "",
        ].join(";"),
      );
    }
    lines.push("");
    lines.push(
      [
        "TOTAL PAGO",
        "",
        "",
        "",
        fmtNum(data.totais.pago),
        fmtNum(data.totais.pago),
      ].join(";"),
    );
    lines.push(
      ["TOTAL A VENCER", "", "", "", fmtNum(data.totais.aberto), ""].join(";"),
    );
    lines.push(
      ["TOTAL VENCIDO", "", "", "", fmtNum(data.totais.vencido), ""].join(";"),
    );

    const csv = "﻿" + lines.join("\r\n");
    const filename = `extrato_${new Date().toISOString().slice(0, 10)}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    );
  }
}
