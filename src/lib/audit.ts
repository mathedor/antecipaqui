/**
 * Helper pra registrar ações de qualquer user no audit_logs.
 *
 * Uso:
 *   await audit({ action: "view_user", targetType: "user", targetId: id })
 *
 * Recebe user atual via getCurrentDbUser (não precisa passar user).
 * Falha silenciosamente — log é best-effort, não pode quebrar o fluxo
 * principal.
 */

import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users, type AuditLog } from "@/db/schema";
import { getCurrentDbUser, getRealCurrentDbUser } from "@/lib/auth-user";

type AuditArgs = {
  action: string;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  metadata?: Record<string, unknown>;
};

/** Loga uma ação do usuário atual. Best-effort.
 *  Se estiver em modo impersonation (admin agindo como X), grava a ação
 *  como se fosse de X mas adiciona impersonatedBy no metadata pra
 *  rastreabilidade total. */
export async function audit(args: AuditArgs): Promise<void> {
  try {
    const user = await getCurrentDbUser();
    if (!user) return;

    // Detecta impersonation: real != effective
    const real = await getRealCurrentDbUser();
    const isImpersonating =
      real && real.id !== user.id && real.role === "admin";

    const metadata: Record<string, unknown> = {
      ...(args.metadata ?? {}),
    };
    if (isImpersonating && real) {
      metadata.impersonatedBy = real.id;
      metadata.impersonatedByEmail = real.email;
    }

    await db.insert(auditLogs).values({
      userId: user.id,
      userRole: user.role,
      userEmail: user.email,
      action: args.action,
      targetType: args.targetType ?? null,
      targetId: args.targetId ?? null,
      targetLabel: args.targetLabel ?? null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}

/**
 * Loga login do user. Chamado dentro de getCurrentDbUser quando detecta
 * que é a primeira request da sessão (usa janela de 30min: se não houver
 * registro de "login" pra esse user nos últimos 30 minutos, registra um).
 */
export async function maybeLogLoginFor(user: {
  id: string;
  role: string;
  email: string;
}) {
  try {
    const since = new Date(Date.now() - 30 * 60 * 1000);
    const [recent] = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(eq(auditLogs.userId, user.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);
    // Se a última ação dele foi há mais de 30min, considera nova sessão
    // → log de "login"
    if (!recent) {
      await db.insert(auditLogs).values({
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        action: "login",
        metadata: { firstAccess: true },
      });
      return;
    }

    const [last] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, user.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(1);
    if (!last || last.createdAt < since) {
      await db.insert(auditLogs).values({
        userId: user.id,
        userRole: user.role,
        userEmail: user.email,
        action: "login",
      });
    }
  } catch (e) {
    console.error("[audit] login log failed:", e);
  }
}

/* ============================================================
   Queries pra exibição (admin)
   ============================================================ */

export type AuditLogWithUser = AuditLog & {
  userNome: string | null;
};

/** Logs do usuário (ações que ELE fez). */
export async function getAuditLogsByUser(
  userId: string,
  limit = 100,
): Promise<AuditLogWithUser[]> {
  const rows = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userRole: auditLogs.userRole,
      userEmail: auditLogs.userEmail,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      targetLabel: auditLogs.targetLabel,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      userNome: users.nome,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return rows;
}

/** Logs sobre um target específico (ex: ações relacionadas a uma construtora). */
export async function getAuditLogsByTarget(
  targetType: string,
  targetId: string,
  limit = 100,
): Promise<AuditLogWithUser[]> {
  const rows = await db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userRole: auditLogs.userRole,
      userEmail: auditLogs.userEmail,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      targetLabel: auditLogs.targetLabel,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      userNome: users.nome,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.userId))
    .where(eq(auditLogs.targetType, targetType))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return rows.filter((r) => r.targetId === targetId);
}

/** Labels amigáveis pras ações */
export const ACTION_LABEL: Record<string, string> = {
  login: "Fez login",
  view_user: "Visualizou cadastro de usuário",
  view_construtora: "Visualizou cadastro de construtora",
  view_operacao: "Visualizou operação",
  create_operacao: "Criou operação",
  edit_operacao: "Editou operação",
  change_status: "Mudou status",
  approve_user: "Aprovou cadastro",
  reject_user: "Recusou cadastro",
  block_user: "Bloqueou usuário",
  unblock_user: "Desbloqueou usuário",
  block_construtora: "Bloqueou construtora",
  unblock_construtora: "Desbloqueou construtora",
  create_pending_lote: "Cadastrou operações em lote",
  claim_pending: "Reivindicou operação",
  request_documents: "Solicitou documentação",
  set_cashback: "Concedeu cashback",
  confirm_cashback_payment: "Confirmou pagamento de cashback",
  request_cashback_withdrawal: "Solicitou saque de cashback",
  create_ticket: "Abriu ticket",
  reply_ticket: "Respondeu ticket",
  close_ticket: "Finalizou ticket",
  create_mural: "Publicou recado no mural",
  edit_mural: "Editou recado no mural",
  delete_mural: "Excluiu recado do mural",
  update_taxa: "Alterou taxa do sistema",
  edit_user: "Editou cadastro de usuário",
  edit_construtora: "Editou cadastro de construtora",
};
