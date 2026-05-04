"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { muralMessages } from "@/db/schema";
import { getCurrentDbUser, requireAdmin } from "@/lib/auth-user";

/**
 * Recados ativos pro user atual baseado em role.
 * - corretor / imobiliaria → audience IN (imobiliaria, both)
 * - construtora → audience IN (construtora, both)
 * - admin → vê tudo (mas geralmente não usa essa query)
 *
 * Filtra também expires_at: só retorna se ainda não expirou (ou null).
 */
export async function getMuralForCurrentUser() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  const audiences: string[] =
    user.role === "construtora"
      ? ["construtora", "both"]
      : user.role === "corretor" || user.role === "imobiliaria"
        ? ["imobiliaria", "both"]
        : user.role === "comercial"
          ? ["comercial"]
          : ["imobiliaria", "construtora", "comercial", "both"];

  const now = new Date();
  return db
    .select()
    .from(muralMessages)
    .where(
      and(
        eq(muralMessages.active, true),
        inArray(muralMessages.audience, audiences as never[]),
        or(
          isNull(muralMessages.expiresAt),
          gt(muralMessages.expiresAt, now),
        ),
      ),
    )
    .orderBy(desc(muralMessages.createdAt));
}

/* ============================================================
   ADMIN — CRUD
   ============================================================ */

export async function listAllMuralMessages() {
  await requireAdmin();
  return db
    .select()
    .from(muralMessages)
    .orderBy(desc(muralMessages.createdAt));
}

export type MuralFormState =
  | { ok: false; error: string }
  | { ok: true; messageId: string }
  | null;

function parseAudience(s: string): "imobiliaria" | "construtora" | "both" {
  if (s === "imobiliaria" || s === "construtora" || s === "both") return s;
  return "both";
}

export async function createMuralMessageAction(
  _prev: MuralFormState,
  formData: FormData,
): Promise<MuralFormState> {
  const admin = await requireAdmin();
  const titulo = String(formData.get("titulo") || "").trim() || null;
  const body = String(formData.get("body") || "").trim();
  const audience = parseAudience(String(formData.get("audience") || "both"));
  const expiresAtRaw = String(formData.get("expiresAt") || "").trim();
  const active = formData.get("active") !== "off";

  if (!body) return { ok: false, error: "O corpo do recado é obrigatório" };

  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime()))
    return { ok: false, error: "Data de expiração inválida" };

  const [created] = await db
    .insert(muralMessages)
    .values({
      titulo,
      body: body.slice(0, 1000),
      audience,
      active,
      expiresAt,
      createdBy: admin.id,
    })
    .returning({ id: muralMessages.id });

  revalidatePath("/admin/mural");
  revalidatePath("/painel");
  return { ok: true, messageId: created.id };
}

export async function updateMuralMessageAction(
  _prev: MuralFormState,
  formData: FormData,
): Promise<MuralFormState> {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false, error: "ID obrigatório" };
  const titulo = String(formData.get("titulo") || "").trim() || null;
  const body = String(formData.get("body") || "").trim();
  const audience = parseAudience(String(formData.get("audience") || "both"));
  const expiresAtRaw = String(formData.get("expiresAt") || "").trim();
  const active = formData.get("active") !== "off";

  if (!body) return { ok: false, error: "O corpo do recado é obrigatório" };
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime()))
    return { ok: false, error: "Data de expiração inválida" };

  await db
    .update(muralMessages)
    .set({
      titulo,
      body: body.slice(0, 1000),
      audience,
      active,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(muralMessages.id, id));

  revalidatePath("/admin/mural");
  revalidatePath("/painel");
  return { ok: true, messageId: id };
}

export async function deleteMuralMessageAction(id: string) {
  await requireAdmin();
  await db.delete(muralMessages).where(eq(muralMessages.id, id));
  revalidatePath("/admin/mural");
  revalidatePath("/painel");
}

export async function toggleMuralMessageActiveAction(
  id: string,
  active: boolean,
) {
  await requireAdmin();
  await db
    .update(muralMessages)
    .set({ active, updatedAt: new Date() })
    .where(eq(muralMessages.id, id));
  revalidatePath("/admin/mural");
  revalidatePath("/painel");
}
