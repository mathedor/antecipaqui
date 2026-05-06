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
 *
 * Fluxo de bloqueio:
 *  - getCurrentDbUser: retorna user normalmente (pra páginas server saberem
 *    quem é). Caller decide o que fazer com isActive=false.
 *  - requireActiveUser: se não logado → /entrar; se !isActive → notifica
 *    admin (1x por hora) + redirect /bloqueado.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { notificacoes, users, type User } from "@/db/schema";
import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";
import { maybeLogLoginFor } from "@/lib/audit";

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
      const ret = updated ?? existing[0];
      // Detecção de login (debounced) — não bloqueia
      maybeLogLoginFor({
        id: ret.id,
        role: ret.role,
        email: ret.email,
      }).catch(() => undefined);
      return ret;
    }
    maybeLogLoginFor({
      id: existing[0].id,
      role: existing[0].role,
      email: existing[0].email,
    }).catch(() => undefined);
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

  // Detecta convite de fundo via Clerk publicMetadata (vem da invitation)
  const meta = clerkUser.publicMetadata as Record<string, unknown> | null;
  const fundoIdFromInvite =
    meta && typeof meta.fundoId === "string" ? meta.fundoId : null;
  const roleFromInvite =
    meta && typeof meta.role === "string" ? meta.role : null;

  const role = isAdmin
    ? "admin"
    : roleFromInvite === "fundo" && fundoIdFromInvite
      ? "fundo"
      : roleFromInvite === "comercial"
        ? "comercial"
        : roleFromInvite === "corretor" || roleFromInvite === "imobiliaria"
          ? roleFromInvite
          : "corretor";

  const inserted = await db
    .insert(users)
    .values({
      id: userId,
      email,
      nome,
      role: role as never,
      onboardingStatus:
        isAdmin || role === "fundo" || role === "comercial"
          ? "aprovado"
          : "pendente",
    })
    .onConflictDoNothing()
    .returning();

  // Se for primeiro login de fundo via convite, vincula o user ao fundo
  if (inserted[0] && role === "fundo" && fundoIdFromInvite) {
    const { fundos } = await import("@/db/schema");
    await db
      .update(fundos)
      .set({ ownerUserId: userId, updatedAt: new Date() })
      .where(eq(fundos.id, fundoIdFromInvite))
      .catch((e) => console.error("[auth] erro vinculando fundo", e));
  }

  // Se for comercial via convite, vincula pelo email (já existe row criada
  // pelo admin com user placeholder; substitui ownerUserId pelo userId real)
  if (inserted[0] && role === "comercial") {
    const { comerciais } = await import("@/db/schema");
    await db
      .update(comerciais)
      .set({ ownerUserId: userId, updatedAt: new Date() })
      .where(eq(comerciais.email, email))
      .catch((e) => console.error("[auth] erro vinculando comercial", e));
  }

  if (inserted[0]) return inserted[0];

  // Conflict (id ou email único já existia) — busca a row atual.
  // Cobre race entre 2 requests simultâneos da mesma sessão E o caso
  // do email já existir vinculado a outro userId.
  const fallback = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (fallback[0]) return fallback[0];

  // Última tentativa: pelo email (caso o ID tenha mudado no Clerk).
  if (email) {
    const byEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (byEmail[0]) {
      console.warn(
        "[auth] user com email existente já tem outro Clerk id; retornando o existente",
        { email, oldId: byEmail[0].id, newId: userId },
      );
      return byEmail[0];
    }
  }

  console.error("[auth] não conseguiu obter/criar user no DB", {
    userId,
    email,
  });
  return null;
}

export async function requireDbUser(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Pra páginas autenticadas: garante que existe user E que ele não está
 * bloqueado. Se estiver bloqueado, notifica admins (debounce 1h) e
 * redireciona pra /bloqueado.
 */
export async function requireActiveUser(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (!user.isActive) {
    // Dispara notif pra admins (debounced — 1x por hora pelo mesmo user)
    await notifyAdminsAboutBlockedAttempt(user).catch((e) => {
      console.error("[block] notify admins failed:", e);
    });
    redirect("/bloqueado");
  }
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (!user.isActive) redirect("/bloqueado");
  if (user.role !== "admin") redirect("/painel");
  return user;
}

/**
 * Permite admin OU fundo. Pra ações compartilhadas (aprovação final, cadastro
 * de operação, cadastro de custos). Dispara erro (não redirect) — caller
 * decide o que fazer.
 */
export async function requireAdminOrFundo(): Promise<User> {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Unauthorized");
  if (!user.isActive) throw new Error("Conta bloqueada");
  if (user.role !== "admin" && user.role !== "fundo") {
    throw new Error("Apenas admin ou fundo");
  }
  return user;
}

async function notifyAdminsAboutBlockedAttempt(blockedUser: User) {
  // Busca todos os admins do DB (via lista ADMIN_EMAILS)
  if (adminEmails.length === 0) return;

  // Verifica se já notificou pelo mesmo user nas últimas 1h (debounce)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db
    .select({ id: notificacoes.id })
    .from(notificacoes)
    .where(
      and(
        eq(notificacoes.type, "blocked_login_attempt"),
        eq(notificacoes.title, blockedTitle(blockedUser)),
        gt(notificacoes.createdAt, oneHourAgo),
      ),
    )
    .limit(1);
  if (recent.length > 0) return;

  // Pega cada admin existente no DB
  const adminUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"));

  const title = blockedTitle(blockedUser);
  const body = `${blockedUser.nome ?? blockedUser.email} (${blockedUser.email}) tentou acessar o painel mas o cadastro está bloqueado.`;

  for (const admin of adminUsers) {
    await db.insert(notificacoes).values({
      userId: admin.id,
      type: "blocked_login_attempt",
      title,
      body,
      link: `/admin/usuarios/${blockedUser.id}`,
    });
    // Email best-effort — fallback log se RESEND_API_KEY ausente
    await sendEmail({
      to: admin.email,
      subject: `Antecipaqui · Tentativa de acesso bloqueado`,
      body: `${body}\n\nAcesse /admin/usuarios/${blockedUser.id} pra revisar.`,
    }).catch((e) => console.error("[block/email] failed:", e));
  }
}

function blockedTitle(u: User) {
  return `Tentativa de acesso bloqueado · ${u.email}`;
}
