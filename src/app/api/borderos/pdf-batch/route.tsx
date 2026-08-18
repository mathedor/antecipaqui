import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  comerciais,
  construtoras,
  fundos,
  imobiliarias,
} from "@/db/schema";
import { getBorderosBatch } from "@/lib/borderos-batch";
import { BorderoBatchPdf } from "@/lib/bordero-batch-pdf";
import { requireAdmin } from "@/lib/auth-user";
import { consumirDistribuido } from "@/lib/seguranca/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Era público — dado financeiro de borderô + renderização cara de PDF.
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
  }
  const lim = await consumirDistribuido(`pdfbatch:${admin.id}`, 6, 60_000);
  if (!lim.ok) {
    return NextResponse.json(
      { error: "Muitas gerações seguidas. Aguarde um instante." },
      { status: 429, headers: { "retry-after": String(lim.retryEmSeg) } },
    );
  }

  const sp = req.nextUrl.searchParams;

  const filters = {
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    fundoId: sp.get("fundoId") || undefined,
    construtoraId: sp.get("construtoraId") || undefined,
    imobiliariaId: sp.get("imobiliariaId") || undefined,
    comercialId: sp.get("comercialId") || undefined,
    status: sp.get("status") || undefined,
  };

  try {
    const batch = await getBorderosBatch(filters);

    // Resolve nomes dos filtros pra exibir no cabeçalho do PDF
    const lookupNames: {
      fundoNome?: string | null;
      construtoraNome?: string | null;
      imobiliariaNome?: string | null;
      comercialNome?: string | null;
    } = {};

    if (filters.fundoId) {
      const [f] = await db
        .select({ nome: fundos.razaoSocial })
        .from(fundos)
        .where(eq(fundos.id, filters.fundoId))
        .limit(1);
      lookupNames.fundoNome = f?.nome ?? null;
    }
    if (filters.construtoraId) {
      const [c] = await db
        .select({ nome: construtoras.razaoSocial })
        .from(construtoras)
        .where(eq(construtoras.id, filters.construtoraId))
        .limit(1);
      lookupNames.construtoraNome = c?.nome ?? null;
    }
    if (filters.imobiliariaId) {
      const [i] = await db
        .select({ nome: imobiliarias.razaoSocial })
        .from(imobiliarias)
        .where(eq(imobiliarias.id, filters.imobiliariaId))
        .limit(1);
      lookupNames.imobiliariaNome = i?.nome ?? null;
    }
    if (filters.comercialId) {
      const [c] = await db
        .select({ nome: comerciais.nomeCompleto })
        .from(comerciais)
        .where(eq(comerciais.id, filters.comercialId))
        .limit(1);
      lookupNames.comercialNome = c?.nome ?? null;
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const logoUrl = `${origin}/brand/logo.png`;

    const buffer = await renderToBuffer(
      <BorderoBatchPdf
        batch={batch}
        logoUrl={logoUrl}
        lookupNames={lookupNames}
      />,
    );

    const filename = `borderos_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    return new NextResponse(
      `Erro ao gerar PDF: ${(e as Error).message}`,
      { status: 500 },
    );
  }
}
