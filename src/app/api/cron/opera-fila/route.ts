/** Processa a fila de saída da integração com fundos (OPERA CAPITAL). */
import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/seguranca/cron-auth";
import { processarFilaOpera } from "@/lib/opera/motor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const naoAutorizado = requireCronAuth(req);
  if (naoAutorizado) return naoAutorizado;

  const r = await processarFilaOpera({ limit: 25 });
  return NextResponse.json({
    ok: true,
    ...r,
    timestamp: new Date().toISOString(),
  });
}
