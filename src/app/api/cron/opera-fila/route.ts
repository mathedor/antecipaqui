/** Processa a fila de saída da integração com fundos (OPERA CAPITAL). */
import { NextResponse, type NextRequest } from "next/server";
import { processarFilaOpera } from "@/lib/opera/motor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const esperado = process.env.CRON_SECRET;
  if (esperado) {
    const auth = req.headers.get("authorization");
    const custom = req.headers.get("x-cron-secret");
    if (auth !== `Bearer ${esperado}` && custom !== esperado) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const r = await processarFilaOpera({ limit: 25 });
  return NextResponse.json({
    ok: true,
    ...r,
    timestamp: new Date().toISOString(),
  });
}
