import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Autorização das rotas de cron — FAIL-CLOSED.
 *
 * O Vercel Cron manda `Authorization: Bearer $CRON_SECRET` quando a env está
 * setada. Aceitamos isso ou o header `x-cron-secret`. Sem CRON_SECRET
 * configurado, RECUSAMOS: um cron aberto dispara cobrança, backup do banco,
 * reenvio de webhooks e e-mails em massa por chamada anônima.
 *
 * Retorna null quando autorizado; um NextResponse de erro quando não.
 */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  const esperado = (process.env.CRON_SECRET ?? "").trim();
  if (!esperado) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado — cron desabilitado por segurança" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const custom = req.headers.get("x-cron-secret") ?? "";
  const recebido = auth.startsWith("Bearer ") ? auth.slice(7) : custom;

  if (!seguroIgual(recebido, esperado)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}

/** Comparação em tempo constante — não vaza o segredo pelo relógio. */
function seguroIgual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
