import { NextResponse } from "next/server";
import { listMyChats } from "@/lib/actions/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await listMyChats();
    // Limita aos 20 mais recentes pra o drawer não inchar
    const chats = all.slice(0, 20).map((c) => ({
      id: c.id,
      assunto: c.assunto,
      status: c.status,
      categoria: c.categoria,
      updatedAt: c.updatedAt,
    }));
    return NextResponse.json({ chats });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, chats: [] },
      { status: 500 },
    );
  }
}