/** TEMPORÁRIO: endpoint de diagnóstico pra capturar erro real do /admin/decidir.
 *  Remover depois que o bug for resolvido. */

import { NextResponse } from "next/server";
import {
  getAdminMesaStats,
  getOpsAguardandoAdmin,
} from "@/lib/actions/admin-mesa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {};
  try {
    const ops = await getOpsAguardandoAdmin();
    out.opsCount = ops.length;
    out.opsSample = ops.slice(0, 1);
  } catch (e) {
    out.opsError = (e as Error).message;
    out.opsStack = (e as Error).stack;
  }
  try {
    out.stats = await getAdminMesaStats();
  } catch (e) {
    out.statsError = (e as Error).message;
    out.statsStack = (e as Error).stack;
  }
  return NextResponse.json(out);
}
