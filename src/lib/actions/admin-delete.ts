"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  users,
  imobiliarias,
  construtoras,
  operacoes,
  parcelasComissao,
  contratos,
  documentos,
  notificacoes,
  tickets,
  ticketMessages,
  operacaoEvents,
  pendingOperacoes,
  muralMessages,
  systemSettings,
  auditLogs,
  repositorioFiles,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

/**
 * Deleta um usuário e TODOS os dados relacionados.
 * Operação irreversível — só admin pode chamar.
 *
 * Ordem de delete (FK constraints):
 * 1. cashback (zera referência em operacoes)
 * 2. parcelas, contratos, events, notificacoes (cascade de operacoes)
 * 3. operacoes do user (FK restrict)
 * 4. ticket_messages (cascade do user)
 * 5. tickets (cascade do user)
 * 6. documentos (cascade do user)
 * 7. repositorio (cascade do user)
 * 8. imobiliarias do user (cascade)
 * 9. construtoras com ownerUserId = user (set null)
 * 10. audit_logs userId set null (não deleta histórico)
 * 11. user
 * 12. clerk
 */
export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    throw new Error("Você não pode deletar a si mesmo.");
  }

  const [u] = await db
    .select({ nome: users.nome, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) throw new Error("Usuário não encontrado.");

  // 1. Pega todas as operações do user pra deletar dependências em cascata explicitamente
  const userOps = await db
    .select({ id: operacoes.id })
    .from(operacoes)
    .where(eq(operacoes.corretorUserId, userId));

  for (const op of userOps) {
    await db.delete(parcelasComissao).where(eq(parcelasComissao.operacaoId, op.id));
    await db.delete(contratos).where(eq(contratos.operacaoId, op.id));
    await db.delete(operacaoEvents).where(eq(operacaoEvents.operacaoId, op.id));
    await db.delete(notificacoes).where(eq(notificacoes.operacaoId, op.id));
  }
  // 2. Deleta as operações
  await db.delete(operacoes).where(eq(operacoes.corretorUserId, userId));

  // 3. Pending operações criadas pelo user
  await db
    .delete(pendingOperacoes)
    .where(eq(pendingOperacoes.createdByUserId, userId));

  // 4. Mural created_by — cascade null já configurado, mas remove os ativos do user
  // (mantém os recados pra histórico, só set null no created_by — já é o default)

  // 5. ticket_messages cascade do user
  await db.delete(ticketMessages).where(eq(ticketMessages.fromUserId, userId));
  // 6. tickets cascade
  await db.delete(tickets).where(eq(tickets.userId, userId));

  // 7. documentos cascade
  await db.delete(documentos).where(eq(documentos.userId, userId));

  // 8. repositorio (do user e de construtoras que ele possui — construtora delete cuida das suas)
  await db
    .delete(repositorioFiles)
    .where(eq(repositorioFiles.targetUserId, userId));

  // 9. imobiliarias do user (cascade)
  await db.delete(imobiliarias).where(eq(imobiliarias.ownerUserId, userId));

  // 10. construtoras: set null no ownerUserId já é o default — não deleta a construtora
  // (admin pode deletar separadamente se quiser)

  // 11. user
  await db.delete(users).where(eq(users.id, userId));

  // 12. Clerk
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);
  } catch (e) {
    // Não falha a action — user pode já estar deletado no Clerk ou ser admin promovido
    console.error("[delete-user] Erro ao deletar do Clerk:", e);
  }

  audit({
    action: "delete_user",
    targetType: "user",
    targetId: userId,
    targetLabel: u.nome ?? u.email ?? userId,
    metadata: { operacoesDeletadas: userOps.length },
  }).catch(() => undefined);

  revalidatePath("/admin/usuarios");
  redirect("/admin/usuarios");
}

/**
 * Deleta uma construtora e todos os dados relacionados.
 */
export async function deleteConstrutoraAction(construtoraId: string) {
  await requireAdmin();

  const [c] = await db
    .select({
      razaoSocial: construtoras.razaoSocial,
      ownerUserId: construtoras.ownerUserId,
    })
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
    .limit(1);
  if (!c) throw new Error("Construtora não encontrada.");

  // Operações dela
  const ops = await db
    .select({ id: operacoes.id })
    .from(operacoes)
    .where(eq(operacoes.construtoraId, construtoraId));

  for (const op of ops) {
    await db.delete(parcelasComissao).where(eq(parcelasComissao.operacaoId, op.id));
    await db.delete(contratos).where(eq(contratos.operacaoId, op.id));
    await db.delete(operacaoEvents).where(eq(operacaoEvents.operacaoId, op.id));
    await db.delete(notificacoes).where(eq(notificacoes.operacaoId, op.id));
  }
  await db.delete(operacoes).where(eq(operacoes.construtoraId, construtoraId));

  await db
    .delete(pendingOperacoes)
    .where(eq(pendingOperacoes.construtoraId, construtoraId));

  await db
    .delete(documentos)
    .where(eq(documentos.construtoraId, construtoraId));

  await db
    .delete(repositorioFiles)
    .where(eq(repositorioFiles.targetConstrutoraId, construtoraId));

  await db.delete(construtoras).where(eq(construtoras.id, construtoraId));

  audit({
    action: "delete_construtora",
    targetType: "construtora",
    targetId: construtoraId,
    targetLabel: c.razaoSocial,
    metadata: { operacoesDeletadas: ops.length },
  }).catch(() => undefined);

  revalidatePath("/admin/construtoras");
  redirect("/admin/construtoras");
}

/* Suppress unused warning — these tables are imported pra documentar
   o que NÃO é tocado por delete user/construtora. */
void muralMessages;
void systemSettings;
void auditLogs;
