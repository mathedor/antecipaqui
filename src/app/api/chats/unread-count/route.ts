import { NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/actions/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await getUnreadCount();
    return NextResponse.json({ count });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message, count: 0 },
      { status: 500 },
    );
  }
}
