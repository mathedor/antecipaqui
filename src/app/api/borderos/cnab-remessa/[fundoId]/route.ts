import { NextResponse, type NextRequest } from "next/server";
import { gerarRemessaCnabPorFundo } from "@/lib/actions/cobranca-boletos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fundoId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { fundoId } = await params;
  const r = await gerarRemessaCnabPorFundo(fundoId);
  if (!r.ok) {
    return new NextResponse(r.error, { status: 400 });
  }
  return new NextResponse(r.conteudo, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=us-ascii",
      "content-disposition": `attachment; filename="${r.filename}"`,
      "cache-control": "no-store",
      "x-remessa-qtd-parcelas": String(r.qtdParcelas),
    },
  });
}
