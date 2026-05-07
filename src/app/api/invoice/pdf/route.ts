import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { getInvoiceData, type InvoiceFilters } from "@/lib/actions/invoice";
import { InvoicePdf } from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getLogoUrl() {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? "https://antecipaqui.vercel.app";
  return `${base}/brand/logo.png`;
}

function genInvoiceNumero() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `INV-${y}${m}${day}-${h}${min}`;
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

  let fundoUnico: {
    razaoSocial: string;
    cnpj: string;
    cidade: string | null;
    uf: string | null;
    endereco: string | null;
  } | null = null;
  if (filters.fundoId && filters.fundoId !== "_no_fundo_") {
    const [f] = await db
      .select()
      .from(fundos)
      .where(eq(fundos.id, filters.fundoId))
      .limit(1);
    if (f) {
      fundoUnico = {
        razaoSocial: f.razaoSocial,
        cnpj: f.cnpj,
        cidade: f.cidade,
        uf: f.uf,
        endereco: f.endereco,
      };
    }
  }

  const buffer = await renderToBuffer(
    React.createElement(InvoicePdf, {
      data: {
        numero: genInvoiceNumero(),
        emittedAt: new Date(),
        fundoUnico,
        payload,
        logoUrl: getLogoUrl(),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${payload.periodLabel.from}-${payload.periodLabel.to}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}