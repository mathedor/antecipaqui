import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  conferirSenhaClerk,
  emitirCookie,
} from "@/lib/seguranca/doc-unlock";
import { consumirDistribuido } from "@/lib/seguranca/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Confirma a senha do usuário e libera o acesso a documentos por 8h. */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "não autenticado" }, { status: 401 });
  }

  // Anti força-bruta: poucas tentativas por usuário por minuto.
  const lim = await consumirDistribuido(`docunlock:${userId}`, 5, 60_000);
  if (!lim.ok) {
    return NextResponse.json(
      { ok: false, error: "muitas tentativas, aguarde um instante" },
      { status: 429, headers: { "retry-after": String(lim.retryEmSeg) } },
    );
  }

  let senha = "";
  try {
    const body = (await req.json()) as { senha?: string };
    senha = String(body.senha ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "payload inválido" }, { status: 400 });
  }

  const ok = await conferirSenhaClerk(userId, senha);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "senha incorreta" }, { status: 401 });
  }

  const cookie = emitirCookie(userId);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.nome, cookie.valor, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAgeSeg,
  });
  return res;
}
