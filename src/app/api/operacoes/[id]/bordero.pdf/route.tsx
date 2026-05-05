import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { getBorderoData } from "@/lib/bordero";
import { BorderoPdf } from "@/lib/bordero-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const data = await getBorderoData(id);
  if (!data) {
    return new NextResponse("Operação não encontrada ou sem acesso", {
      status: 404,
    });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const logoUrl = `${origin}/brand/logo.png`;

  const buffer = await renderToBuffer(<BorderoPdf data={data} logoUrl={logoUrl} />);

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="bordero-${data.numero}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
