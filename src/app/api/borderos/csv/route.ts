import { NextResponse, type NextRequest } from "next/server";
import { getBorderosBatch } from "@/lib/borderos-batch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  documentos_incompletos: "Docs incompletos",
  pre_aprovada: "Pré-aprovada",
  analise_final: "Análise final",
  enviada_para_assinatura: "Em assinatura",
  enviada_para_pagamento: "Em pagamento",
  realizada: "Realizada",
  recusada: "Recusada",
  cancelada: "Cancelada",
};

function csvEscape(v: string | number | null | undefined) {
  if (v == null) return "";
  const s = String(v);
  if (/[";,\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function fmtNum(n: number) {
  return n.toFixed(2).replace(".", ",");
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  try {
    const batch = await getBorderosBatch({
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      fundoId: sp.get("fundoId") || undefined,
      construtoraId: sp.get("construtoraId") || undefined,
      imobiliariaId: sp.get("imobiliariaId") || undefined,
      comercialId: sp.get("comercialId") || undefined,
      status: sp.get("status") || undefined,
    });

    const headers = [
      "operacao",
      "data_venda",
      "taxa_mensal_pct",
      "valor_venda",
      "valor_comissao",
      "cedente",
      "construtora",
      "fundo",
      "comercial",
      "bruto",
      "desagio",
      "liquido",
      "custos",
      "liquido_cedente",
      "status",
    ];

    const lines = [headers.join(";")];
    for (const r of batch.rows) {
      lines.push(
        [
          csvEscape(r.numero),
          csvEscape(r.dataVenda),
          fmtNum(r.taxaMensal * 100),
          fmtNum(r.valorVenda),
          fmtNum(r.valorComissao),
          csvEscape(r.cedenteNome),
          csvEscape(r.construtoraNome),
          csvEscape(r.fundoNome ?? ""),
          csvEscape(r.comercialNome ?? ""),
          fmtNum(r.totaisBruto),
          fmtNum(r.totaisDesagio),
          fmtNum(r.totaisLiquido),
          fmtNum(r.custosTotal),
          fmtNum(r.valorLiquidoCedente),
          csvEscape(STATUS_LABEL[r.status] ?? r.status),
        ].join(";"),
      );
    }

    // Linha de totais agregados
    lines.push("");
    lines.push(
      [
        "TOTAL",
        "",
        "",
        fmtNum(batch.agregados.valorVendaTotal),
        fmtNum(batch.agregados.valorComissaoTotal),
        "",
        "",
        "",
        "",
        fmtNum(batch.agregados.bruto),
        fmtNum(batch.agregados.desagio),
        fmtNum(batch.agregados.liquido),
        fmtNum(batch.agregados.custos),
        fmtNum(batch.agregados.liquidoCedente),
        `${batch.agregados.qtdOperacoes} op(s)`,
      ].join(";"),
    );

    const csv = "﻿" + lines.join("\r\n"); // BOM pra Excel abrir UTF-8

    const filename = `borderos_${new Date().toISOString().slice(0, 10)}.csv`;

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
