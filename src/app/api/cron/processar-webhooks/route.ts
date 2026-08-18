/** Processa fila de webhooks pendentes/com retry. */
import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/seguranca/cron-auth";
import { processarFilaWebhooks } from "@/lib/actions/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const naoAutorizado = requireCronAuth(req);
  if (naoAutorizado) return naoAutorizado;
  const r = await processarFilaWebhooks({ limit: 100 });
  return NextResponse.json({ ok: true, ...r, timestamp: new Date().toISOString() });
}
