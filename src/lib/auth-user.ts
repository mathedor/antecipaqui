/**
 * Sync entre Clerk e nossa tabela `users`.
 * Quando um usuário Clerk acessa uma página protegida pela primeira vez,
 * criamos a row equivalente no nosso DB.
 *
 * Pra MVP usamos sync on-demand (no webhook ainda). Quando ficar pesado,
 * migramos pra webhook do Clerk com `svix`.
 *
 * Auto-promove pra admin se o email estiver na variável `ADMIN_EMAILS`
 * (CSV separado por vírgula).
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { redirect } from "next/navigation";

const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email: string) {
  return adminEmails.includes(email.toLowerCase());
}

export async function getCurrentDbUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (existing[0]) {
    // Promove pra admin se email entrou na lista de admins
    if (
      existing[0].role !== "admin" &&
      isAdminEmail(existing[0].email)
    ) {
      const [updated] = await db
        .update(users)
        .set({
          role: "admin",
          onboardingStatus: "aprovado", // admin pula onboarding
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      return updated ?? existing[0];
    }
    return existing[0];
  }

  // Sync inicial: cria o user no nosso DB
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    "";

  const nome =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  const isAdmin = isAdminEmail(email);

  const inserted = await db
    .insert(users)
    .values({
      id: userId,
      email,
      nome,
      role: isAdmin ? "admin" : "corretor",
      onboardingStatus: isAdmin ? "aprovado" : "pendente",
    })
    .onConflictDoNothing()
    .returning();

  return inserted[0] ?? null;
}

export async function requireDbUser(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "admin") redirect("/painel");
  return user;
}
