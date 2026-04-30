"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoras, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

/**
 * Bloqueia/desbloqueia usuário individual.
 * Usuário bloqueado vê /bloqueado quando tenta acessar área restrita.
 */
export async function blockUserAction(userId: string) {
  await requireAdmin();
  const [u] = await db
    .select({ nome: users.nome, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await db
    .update(users)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(users.id, userId));
  audit({
    action: "block_user",
    targetType: "user",
    targetId: userId,
    targetLabel: u?.nome ?? u?.email ?? userId,
  }).catch(() => undefined);
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
}

export async function unblockUserAction(userId: string) {
  await requireAdmin();
  const [u] = await db
    .select({ nome: users.nome, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await db
    .update(users)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
  audit({
    action: "unblock_user",
    targetType: "user",
    targetId: userId,
    targetLabel: u?.nome ?? u?.email ?? userId,
  }).catch(() => undefined);
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

  audit({
    action: "block_construtora",
    targetType: "construtora",
    targetId: construtoraId,
    targetLabel: c.razaoSocial,
  }).catch(() => undefined);

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

  audit({
    action: "unblock_construtora",
    targetType: "construtora",
    targetId: construtoraId,
    targetLabel: c.razaoSocial,
  }).catch(() => undefined);

  revalidatePath("/admin/construtoras");
  revalidatePath(`/admin/construtoras/${construtoraId}`);
}
