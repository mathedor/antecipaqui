"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoras, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";

/**
 * Bloqueia/desbloqueia usuário individual.
 * Usuário bloqueado vê /bloqueado quando tenta acessar área restrita.
 */
export async function blockUserAction(userId: string) {
  await requireAdmin();
  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
}

export async function unblockUserAction(userId: string) {
  await requireAdmin();
  await db
    .update(users)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
}

/**
 * Bloqueia uma construtora — bloqueia também o owner user (se houver),
 * pra que ele não consiga acessar o painel.
 */
export async function blockConstrutoraAction(construtoraId: string) {
  await requireAdmin();
  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
    .limit(1);
  if (!c) throw new Error("Construtora não encontrada");

  await db
    .update(construtoras)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(construtoras.id, construtoraId));

  if (c.ownerUserId) {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, c.ownerUserId));
  }

  revalidatePath("/admin/construtoras");
  revalidatePath(`/admin/construtoras/${construtoraId}`);
}

export async function unblockConstrutoraAction(construtoraId: string) {
  await requireAdmin();
  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
    .limit(1);
  if (!c) throw new Error("Construtora não encontrada");

  await db
    .update(construtoras)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(construtoras.id, construtoraId));

  if (c.ownerUserId) {
    await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, c.ownerUserId));
  }

  revalidatePath("/admin/construtoras");
  revalidatePath(`/admin/construtoras/${construtoraId}`);
}
