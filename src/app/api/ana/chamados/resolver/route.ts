/** ANA — Baixa de chamado (Antecipaqui).
 *
 *  POST /api/ana/chamados/resolver  body: { "id": "<ticket uuid>" }
 *  Auth: Authorization: Bearer $ANA_PULSO_TOKEN
 *
 *  Resolver = finalizar o ticket (mesma semântica do closeTicketAction:
 *  status='finalizado' + finalizado_em). Idempotente: já finalizado →
 *  { ok: true, ja_estava: true }. Inexistente → 404.
 */

import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const expected = process.env.ANA_PULSO_TOKEN;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let id: unknown;
  try {
    ({ id } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, erro: "body inválido" }, { status: 400 });
  }
  if (typeof id !== "string" || !id.trim()) {
    return NextResponse.json({ ok: false, erro: "id obrigatório" }, { status: 400 });
  }
  if (!UUID_RE.test(id.trim())) {
    return NextResponse.json({ ok: false, erro: "não encontrado" }, { status: 404 });
  }

  try {
    const [t] = await db
      .select({ id: tickets.id, status: tickets.status })
      .from(tickets)
      .where(eq(tickets.id, id.trim()))
      .limit(1);
    if (!t) {
      return NextResponse.json({ ok: false, erro: "não encontrado" }, { status: 404 });
    }
    if (t.status === "finalizado") {
      return NextResponse.json({ ok: true, ja_estava: true });
    }
    await db
      .update(tickets)
      .set({
        status: "finalizado",
        finalizadoEm: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, t.id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, erro: "falha ao resolver" }, { status: 500 });
  }
}
