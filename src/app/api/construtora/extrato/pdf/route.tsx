import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoras } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getExtratoConstrutora } from "@/lib/actions/construtora-operacional";
import { ExtratoConstrutoraPdf } from "@/lib/extrato-construtora-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentDbUser();
    if (!user || user.role !== "construtora") {
      return new NextResponse("Acesso negado", { status: 401 });
    }

    const [c] = await db
      .select()
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, user.id))
      .limit(1);
    if (!c) return new NextResponse("Construtora não vinculada", { status: 404 });

    const sp = req.nextUrl.searchParams;
    const from = sp.get("from") || undefined;
    const to = sp.get("to") || undefined;
    const data = await getExtratoConstrutora({ from, to });

    const buffer = await renderToBuffer(
      <ExtratoConstrutoraPdf
        construtoraNome={c.razaoSocial}
        periodo={{ from, to }}
        linhas={data.linhas}
        totais={data.totais}
      />,
    );

    const filename = `extrato_${new Date().toISOString().slice(0, 10)}.pdf`;
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    return new NextResponse(`Erro: ${(e as Error).message}`, { status: 500 });
  }
}
