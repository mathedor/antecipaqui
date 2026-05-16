"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin, getRealCurrentDbUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";
import {
  IMPERSONATE_COOKIE_MAX_HOURS,
  IMPERSONATE_COOKIE_NAME,
} from "@/lib/impersonate";

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/* ============================================================
   START — admin começa a impersonar um user
   ============================================================ */

export async function startImpersonation(input: {
  targetUserId: string;
}): Promise<{ ok: boolean; error?: string; redirectTo?: string }> {
  const admin = await requireAdmin();

  if (input.targetUserId === admin.id)
    return { ok: false, error: "Não pode impersonar a si mesmo" };

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.targetUserId))
    .limit(1);
  if (!target) return { ok: false, error: "Usuário não encontrado" };
  if (target.role === "admin")
    return { ok: false, error: "Não é possível impersonar outro admin" };
  if (!target.isActive)
    return { ok: false, error: "Usuário inativo — desbloqueie antes" };

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE_NAME, target.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: IMPERSONATE_COOKIE_MAX_HOURS * 60 * 60,
  });

  await audit({
    action: "impersonation_started",
    targetType: "user",
    targetId: target.id,
    targetLabel: target.email,
    metadata: {
      targetRole: target.role,
      targetNome: target.nome,
      adminId: admin.id,
      adminEmail: admin.email,
    },
  });

  return { ok: true, redirectTo: "/painel" };
}

/* ============================================================
   STOP — admin volta ao próprio
   ============================================================ */

export async function stopImpersonation(): Promise<void> {
  const real = await getRealCurrentDbUser();
  const cookieStore = await cookies();
  const targetId = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;

  cookieStore.delete(IMPERSONATE_COOKIE_NAME);

  if (real?.role === "admin" && targetId) {
    await audit({
      action: "impersonation_stopped",
      targetType: "user",
      targetId,
      metadata: { adminId: real.id, adminEmail: real.email },
    });
  }
  redirect("/admin/visao");
}

/* ============================================================
   LIST — usuários disponíveis pra impersonação
   ============================================================ */

export type ImpersonatableUser = {
  id: string;
  email: string;
  nome: string | null;
  role: string;
  telefone: string | null;
  contextLabel: string | null;
  ultimaAtividade: string | null;
  ticketsAbertos: number;
};

export async function listImpersonatableUsers(filters?: {
  search?: string;
  role?: string;
}): Promise<ImpersonatableUser[]> {
  await requireAdmin();

  const searchClause = filters?.search?.trim()
    ? sql` AND (
        LOWER(u.email) LIKE LOWER(${"%" + filters.search.trim() + "%"})
        OR LOWER(COALESCE(u.nome, '')) LIKE LOWER(${"%" + filters.search.trim() + "%"})
      )`
    : sql``;

  const roleClause =
    filters?.role && filters.role !== "_all_"
      ? sql` AND u.role = ${filters.role}`
      : sql``;

  const res = await db.execute(sql`
    SELECT
      u.id, u.email, u.nome, u.role, u.telefone,
      -- Contexto: nome da empresa vinculada
      COALESCE(
        (SELECT i.razao_social FROM imobiliarias i WHERE i.owner_user_id = u.id LIMIT 1),
        (SELECT c.razao_social FROM construtoras c WHERE c.owner_user_id = u.id LIMIT 1),
        (SELECT f.razao_social FROM fundos f WHERE f.owner_user_id = u.id LIMIT 1),
        (SELECT cm.nome_completo FROM comerciais cm WHERE cm.owner_user_id = u.id LIMIT 1)
      ) AS context_label,
      -- Última atividade: max(login OU ação)
      (SELECT MAX(al.created_at)::text FROM audit_logs al WHERE al.user_id = u.id) AS ultima_atividade,
      -- Tickets abertos
      (SELECT COUNT(*)::int FROM tickets t WHERE t.user_id = u.id AND t.status = 'aberto') AS tickets_abertos
    FROM users u
    WHERE u.is_active = TRUE
      AND u.role != 'admin'
      ${searchClause}
      ${roleClause}
    ORDER BY
      (SELECT COUNT(*)::int FROM tickets t WHERE t.user_id = u.id AND t.status = 'aberto') DESC,
      (SELECT MAX(al.created_at) FROM audit_logs al WHERE al.user_id = u.id) DESC NULLS LAST,
      u.nome ASC
    LIMIT 100
  `);

  return extractRows<{
    id: string;
    email: string;
    nome: string | null;
    role: string;
    telefone: string | null;
    context_label: string | null;
    ultima_atividade: string | null;
    tickets_abertos: number;
  }>(res).map((r) => ({
    id: r.id,
    email: r.email,
    nome: r.nome,
    role: r.role,
    telefone: r.telefone,
    contextLabel: r.context_label,
    ultimaAtividade: r.ultima_atividade,
    ticketsAbertos: r.tickets_abertos,
  }));
}

/** Últimos 5 users impersonados pelo admin atual — atalho rápido. */
export async function listRecentImpersonations(): Promise<
  ImpersonatableUser[]
> {
  const admin = await requireAdmin();

  const res = await db.execute(sql`
    SELECT DISTINCT ON (al.target_id)
      al.target_id AS id,
      al.target_label AS email,
      al.created_at AS at
    FROM audit_logs al
    WHERE al.user_id = ${admin.id}
      AND al.action = 'impersonation_started'
      AND al.target_id IS NOT NULL
      AND al.created_at >= NOW() - INTERVAL '30 days'
    ORDER BY al.target_id, al.created_at DESC
    LIMIT 5
  `);
  const targetIds = extractRows<{ id: string }>(res).map((r) => r.id);
  if (targetIds.length === 0) return [];

  // Carrega dados frescos
  const all = await listImpersonatableUsers();
  return targetIds
    .map((id) => all.find((u) => u.id === id))
    .filter((u): u is ImpersonatableUser => u !== undefined);
}

/* ============================================================
   STATUS — pra o banner descobrir se está em impersonation
   ============================================================ */

export type ImpersonationStatus = {
  active: boolean;
  targetEmail?: string;
  targetNome?: string | null;
  targetRole?: string;
  targetContext?: string | null;
  expiresInMin?: number;
};

export async function getImpersonationStatus(): Promise<ImpersonationStatus> {
  const real = await getRealCurrentDbUser();
  if (!real || real.role !== "admin") return { active: false };
  const cookieStore = await cookies();
  const targetId = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;
  if (!targetId) return { active: false };

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetId))
    .limit(1);
  if (!target) return { active: false };

  const ctxRes = await db.execute(sql`
    SELECT COALESCE(
      (SELECT razao_social FROM imobiliarias WHERE owner_user_id = ${targetId} LIMIT 1),
      (SELECT razao_social FROM construtoras WHERE owner_user_id = ${targetId} LIMIT 1),
      (SELECT razao_social FROM fundos WHERE owner_user_id = ${targetId} LIMIT 1),
      (SELECT nome_completo FROM comerciais WHERE owner_user_id = ${targetId} LIMIT 1)
    ) AS ctx
  `);
  const ctx =
    extractRows<{ ctx: string | null }>(ctxRes)[0]?.ctx ?? null;

  return {
    active: true,
    targetEmail: target.email,
    targetNome: target.nome,
    targetRole: target.role,
    targetContext: ctx,
  };
}

void desc; // pra evitar warning de import não usado caso refator futuro
