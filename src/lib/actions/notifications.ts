"use server";

import { revalidatePath } from "next/cache";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { requireDbUser } from "@/lib/auth-user";

export async function getMyNotifications(limit = 30) {
  const user = await requireDbUser();
  return db
    .select()
    .from(notificacoes)
    .where(eq(notificacoes.userId, user.id))
    .orderBy(desc(notificacoes.createdAt))
    .limit(limit);
}

export async function getMyUnreadCount() {
  const user = await requireDbUser();
  const [r] = await db
    .select({ count: count() })
    .from(notificacoes)
    .where(
      and(eq(notificacoes.userId, user.id), eq(notificacoes.read, false)),
    );
  return r?.count ?? 0;
}

export async function markNotificationReadAction(id: string) {
  const user = await requireDbUser();
  await db
    .update(notificacoes)
    .set({ read: true })
    .where(and(eq(notificacoes.id, id), eq(notificacoes.userId, user.id)));
  revalidatePath("/notificacoes");
  revalidatePath("/painel");
  revalidatePath("/admin");
}

export async function markAllNotificationsReadAction() {
  const user = await requireDbUser();
  await db
    .update(notificacoes)
    .set({ read: true })
    .where(and(eq(notificacoes.userId, user.id), eq(notificacoes.read, false)));
  revalidatePath("/notificacoes");
  revalidatePath("/painel");
  revalidatePath("/admin");
}
