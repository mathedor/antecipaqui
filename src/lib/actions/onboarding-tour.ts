"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";

export type TourId =
  | "comercial"
  | "fundo"
  | "construtora"
  | "imobiliaria"
  | "corretor";

/** Marca o tour como completado pelo user atual. */
export async function markTourCompleted(tourId: TourId) {
  const user = await requireActiveUser();
  const now = new Date().toISOString();
  await db
    .update(users)
    .set({
      tutorialsCompleted: sql`COALESCE(${users.tutorialsCompleted}, '{}'::jsonb) || ${JSON.stringify(
        { [tourId]: now },
      )}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  revalidatePath("/painel");
  return { ok: true };
}

/** Reset — re-abrir o tour. Remove a entrada do JSON. */
export async function resetTour(tourId: TourId) {
  const user = await requireActiveUser();
  await db
    .update(users)
    .set({
      tutorialsCompleted: sql`COALESCE(${users.tutorialsCompleted}, '{}'::jsonb) - ${tourId}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  revalidatePath("/painel");
  return { ok: true };
}
