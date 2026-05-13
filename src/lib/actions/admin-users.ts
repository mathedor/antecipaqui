"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth-user";
import { audit } from "@/lib/audit";
import {
  resolveAdminProfile,
  type AdminProfile,
} from "@/lib/admin-permissions";

const VALID_PROFILES: AdminProfile[] = [
  "super",
  "financeiro",
  "operacoes",
  "suporte",
];

/* =========================================================================
   QUERIES
   ========================================================================= */

export async function listAdmins() {
  await requireSuperAdmin();
  return db
    .select({
      id: users.id,
      email: users.email,
      nome: users.nome,
      telefone: users.telefone,
      adminProfile: users.adminProfile,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(users.email);
}

/* =========================================================================
   ACTIONS — convidar / promover admin
   ========================================================================= */

export type AdminUserState =
  | { ok: false; error: string }
  | { ok: true; userId: string; created: boolean }
  | null;

/**
 * Promove um user existente (por email) pra admin com perfil X.
 * Se o user não existir ainda no DB (não fez login), cria placeholder com id
 * "pending_<email>" pra ser sincronizado quando o cara logar pela 1ª vez via
 * Clerk. Mas como hoje a row de user só é criada no primeiro login (Clerk
 * userId), se o cara nunca logou, simplesmente confirmamos que ele será
 * promovido AUTOMATICAMENTE quando o sistema detectar o login pela primeira
 * vez (lookup por email).
 *
 * Pra simplificar: aqui exigimos que o user JÁ exista (já fez login uma vez).
 * Caso contrário, pede pra pessoa fazer login antes.
 */
export async function inviteAdminAction(
  _prev: AdminUserState,
  formData: FormData,
): Promise<AdminUserState> {
  const me = await requireSuperAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const nome = String(formData.get("nome") || "").trim() || null;
  const profileRaw = String(formData.get("adminProfile") || "").trim();

  if (!email || !email.includes("@"))
    return { ok: false, error: "Email inválido" };
  if (!VALID_PROFILES.includes(profileRaw as AdminProfile))
    return { ok: false, error: "Perfil de admin inválido" };
  const adminProfile = profileRaw as AdminProfile;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!existing) {
    return {
      ok: false,
      error:
        "Esse email ainda não tem cadastro. Peça pra a pessoa criar a conta em /entrar primeiro — assim que ela fizer login a 1ª vez, volte aqui pra promover.",
    };
  }

  if (existing.id === me.id)
    return { ok: false, error: "Você não pode editar seu próprio perfil aqui" };

  await db
    .update(users)
    .set({
      role: "admin",
      adminProfile,
      nome: nome ?? existing.nome,
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, existing.id));

  await audit({
    action: "promote_admin",
    targetType: "user",
    targetId: existing.id,
    targetLabel: email,
    metadata: { adminProfile, prevRole: existing.role },
  }).catch(() => undefined);

  revalidatePath("/admin/usuarios/admins");
  return {
    ok: true,
    userId: existing.id,
    created: existing.role !== "admin",
  };
}

/** Atualiza apenas o perfil de um admin existente. */
export async function updateAdminProfileAction(
  _prev: AdminUserState,
  formData: FormData,
): Promise<AdminUserState> {
  const me = await requireSuperAdmin();

  const userId = String(formData.get("userId") || "").trim();
  const profileRaw = String(formData.get("adminProfile") || "").trim();
  if (!userId) return { ok: false, error: "userId obrigatório" };
  if (!VALID_PROFILES.includes(profileRaw as AdminProfile))
    return { ok: false, error: "Perfil inválido" };

  if (userId === me.id)
    return {
      ok: false,
      error:
        "Você não pode mudar seu próprio perfil. Peça pra outro super-admin.",
    };

  const [existing] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "admin")))
    .limit(1);
  if (!existing)
    return { ok: false, error: "Admin não encontrado" };

  // Se está rebaixando o último super-admin ativo → bloqueia
  if (
    resolveAdminProfile(existing.adminProfile) === "super" &&
    profileRaw !== "super"
  ) {
    const adminsAtivos = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
    const outrosSupers = adminsAtivos.filter(
      (u) =>
        u.id !== userId && resolveAdminProfile(u.adminProfile) === "super",
    );
    if (outrosSupers.length === 0) {
      return {
        ok: false,
        error:
          "Não dá pra rebaixar o último super-admin. Promova outro pra super primeiro.",
      };
    }
  }

  await db
    .update(users)
    .set({ adminProfile: profileRaw, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await audit({
    action: "update_admin_profile",
    targetType: "user",
    targetId: userId,
    targetLabel: existing.email,
    metadata: { from: existing.adminProfile, to: profileRaw },
  }).catch(() => undefined);

  revalidatePath("/admin/usuarios/admins");
  return { ok: true, userId, created: false };
}

/** Remove privilégio de admin (volta pra role anterior — usamos 'corretor'
 *  como default, mas o user pode ser editado depois). */
export async function revokeAdminAction(targetUserId: string) {
  const me = await requireSuperAdmin();
  if (targetUserId === me.id)
    throw new Error("Você não pode revogar seu próprio acesso.");

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (!existing) throw new Error("User não encontrado");
  if (existing.role !== "admin")
    throw new Error("Esse user não é admin");

  // Bloqueia revogar último super
  if (resolveAdminProfile(existing.adminProfile) === "super") {
    const supers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
    const outros = supers.filter(
      (u) =>
        u.id !== targetUserId &&
        resolveAdminProfile(u.adminProfile) === "super",
    );
    if (outros.length === 0)
      throw new Error(
        "Não dá pra revogar o último super-admin. Promova outro primeiro.",
      );
  }

  await db
    .update(users)
    .set({ role: "corretor", adminProfile: null, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  await audit({
    action: "revoke_admin",
    targetType: "user",
    targetId: targetUserId,
    targetLabel: existing.email,
  }).catch(() => undefined);

  revalidatePath("/admin/usuarios/admins");
}

/** Bloqueia / desbloqueia um admin. */
export async function toggleAdminActiveAction(targetUserId: string) {
  const me = await requireSuperAdmin();
  if (targetUserId === me.id)
    throw new Error("Você não pode bloquear sua própria conta.");

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);
  if (!existing) throw new Error("User não encontrado");

  await db
    .update(users)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(users.id, targetUserId));

  await audit({
    action: existing.isActive ? "block_admin" : "unblock_admin",
    targetType: "user",
    targetId: targetUserId,
    targetLabel: existing.email,
  }).catch(() => undefined);

  revalidatePath("/admin/usuarios/admins");
}