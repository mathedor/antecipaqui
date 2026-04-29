/**
 * Sync entre Clerk e nossa tabela `users`.
 * Quando um usuário Clerk acessa uma página protegida pela primeira vez,
 * criamos a row equivalente no nosso DB.
 *
 * Pra MVP usamos sync on-demand (no webhook ainda). Quando ficar pesado,
 * migramos pra webhook do Clerk com `svix`.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export async function getCurrentDbUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing[0]) return existing[0];

  // Sync inicial: cria o user no nosso DB
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  const nome =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    null;

  const inserted = await db
    .insert(users)
    .values({
      id: userId,
      email,
      nome,
      role: "corretor", // default — usuário escolhe no onboarding
      onboardingStatus: "pendente",
    })
    .onConflictDoNothing()
    .returning();

  return inserted[0] ?? null;
}

/**
 * Atalho pra páginas que requerem autenticação. Joga 404/401 fora se não logado.
 */
export async function requireDbUser(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
