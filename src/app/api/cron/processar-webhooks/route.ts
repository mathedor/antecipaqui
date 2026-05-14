/** Processa fila de webhooks pendentes/com retry. */
import { NextResponse, type NextRequest } from "next/server";
import { processarFilaWebhooks } from "@/lib/actions/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    const custom = req.headers.get("x-cron-secret");
    if (auth !== `Bearer ${expected}` && custom !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }
  const r = await processarFilaWebhooks({ limit: 100 });
  return NextResponse.json({ ok: true, ...r, timestamp: new Date().toISOString() });
}
