import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DOC_UNLOCK_COOKIE, cookieValido } from "@/lib/seguranca/doc-unlock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Diz se a sessão atual já desbloqueou os documentos. */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ desbloqueado: false });
  const cookie = (await cookies()).get(DOC_UNLOCK_COOKIE)?.value;
  return NextResponse.json({ desbloqueado: cookieValido(cookie, userId) });
}
