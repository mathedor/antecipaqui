"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/db";
import { tickets, ticketMessages, users } from "@/db/schema";
import { getCurrentDbUser, requireAdmin } from "@/lib/auth-user";
import { notify } from "@/lib/notify";

/* =============================================================
   QUERIES
   ============================================================= */

export async function getMyTickets() {
  const user = await getCurrentDbUser();
  if (!user) return [];
  return db
    .select()
    .from(tickets)
    .where(eq(tickets.userId, user.id))
    .orderBy(desc(tickets.updatedAt));
}

export async function getTicketDetail(ticketId: string) {
  const user = await getCurrentDbUser();
  if (!user) return null;

  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) return null;

  // Acesso: dono do ticket OU admin
  if (t.userId !== user.id && user.role !== "admin") return null;

  const [opener] = await db
    .select()
    .from(users)
    .where(eq(users.id, t.userId))
    .limit(1);

  const messages = await db
    .select({
      id: ticketMessages.id,
      ticketId: ticketMessages.ticketId,
      fromUserId: ticketMessages.fromUserId,
      fromRole: ticketMessages.fromRole,
      body: ticketMessages.body,
      createdAt: ticketMessages.createdAt,
      fromNome: users.nome,
      fromEmail: users.email,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(users.id, ticketMessages.fromUserId))
    .where(eq(ticketMessages.ticketId, ticketId))
    .orderBy(ticketMessages.createdAt);

  return { ticket: t, opener, messages, viewerRole: user.role };
}

export async function getAllTicketsForAdmin(filterStatus?: string) {
  await requireAdmin();
  const base = db
    .select({
      id: tickets.id,
      assunto: tickets.assunto,
      status: tickets.status,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      userId: tickets.userId,
      userNome: users.nome,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(tickets)
    .leftJoin(users, eq(users.id, tickets.userId));

  return filterStatus
    ? base
        .where(eq(tickets.status, filterStatus as never))
        .orderBy(desc(tickets.updatedAt))
    : base.orderBy(desc(tickets.updatedAt));
}

export async function getOpenTicketsCountForAdmin() {
  await requireAdmin();
  const rows = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.status, "aberto"));
  return rows.length;
}

/* =============================================================
   ACTIONS — usuário
   ============================================================= */

export type CreateTicketState =
  | { ok: false; error: string }
  | { ok: true; ticketId: string }
  | null;

export async function createTicketAction(
  _prev: CreateTicketState,
  formData: FormData,
): Promise<CreateTicketState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const assunto = String(formData.get("assunto") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!assunto) return { ok: false, error: "Informe o assunto" };
  if (!body) return { ok: false, error: "Escreva a mensagem inicial" };

  const [created] = await db
    .insert(tickets)
    .values({
      userId: user.id,
      assunto: assunto.slice(0, 200),
      status: "aberto",
    })
    .returning();

  await db.insert(ticketMessages).values({
    ticketId: created.id,
    fromUserId: user.id,
    fromRole: user.role,
    body,
  });

  // Notifica admins
  await notifyAdminsNewTicket(created.id, assunto, user.email, user.nome);

  revalidatePath("/painel/suporte");
  revalidatePath("/admin/tickets");
  return { ok: true, ticketId: created.id };
}

export type ReplyTicketState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function replyTicketAction(
  _prev: ReplyTicketState,
  formData: FormData,
): Promise<ReplyTicketState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const ticketId = String(formData.get("ticketId") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!ticketId) return { ok: false, error: "ticketId obrigatório" };
  if (!body) return { ok: false, error: "Escreva a resposta" };

  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) return { ok: false, error: "Ticket não encontrado" };

  // Acesso: dono OU admin
  const isOwner = t.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin)
    return { ok: false, error: "Sem permissão" };
  if (t.status === "finalizado")
    return { ok: false, error: "Ticket já finalizado" };

  await db.insert(ticketMessages).values({
    ticketId: t.id,
    fromUserId: user.id,
    fromRole: user.role,
    body,
  });

  // Atualiza status: se admin respondeu → aguardando_resposta (do user);
  // se user respondeu → aberto (admin precisa ver de novo)
  const newStatus: "aberto" | "aguardando_resposta" = isAdmin
    ? "aguardando_resposta"
    : "aberto";

  await db
    .update(tickets)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(tickets.id, t.id));

  // Notifica a outra parte
  if (isAdmin) {
    await notify({
      userId: t.userId,
      type: "ticket_reply_admin",
      title: `Resposta no ticket "${t.assunto}"`,
      body: body.slice(0, 200),
      link: `/painel/suporte/${t.id}`,
    });
    // email + push básicos
    const [owner] = await db
      .select()
      .from(users)
      .where(eq(users.id, t.userId))
      .limit(1);
    if (owner) {
      // já contemplado no notify
    }
  } else {
    await notifyAdminsNewMessage(t.id, t.assunto, user.email, user.nome);
  }

  revalidatePath("/painel/suporte");
  revalidatePath(`/painel/suporte/${t.id}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${t.id}`);
  return { ok: true };
}

export async function closeTicketAction(ticketId: string) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");

  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) throw new Error("Ticket não encontrado");

  // Dono ou admin pode fechar
  if (t.userId !== user.id && user.role !== "admin")
    throw new Error("Sem permissão");

  await db
    .update(tickets)
    .set({
      status: "finalizado",
      finalizadoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));

  // Notifica a outra parte do encerramento
  if (user.role === "admin") {
    await notify({
      userId: t.userId,
      type: "ticket_closed",
      title: `Ticket "${t.assunto}" finalizado`,
      body: "O ticket foi marcado como finalizado pela Antecipaqui.",
      link: `/painel/suporte/${t.id}`,
    });
  }

  revalidatePath("/painel/suporte");
  revalidatePath(`/painel/suporte/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
}

/* =============================================================
   helpers
   ============================================================= */

async function notifyAdminsNewTicket(
  ticketId: string,
  assunto: string,
  fromEmail: string,
  fromNome: string | null,
) {
  const adminUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"));

  const link = `/admin/tickets/${ticketId}`;
  for (const admin of adminUsers) {
    await notify({
      userId: admin.id,
      type: "ticket_novo",
      title: `Novo ticket · ${assunto}`,
      body: `${fromNome ?? fromEmail} abriu um ticket. Assunto: ${assunto}.`,
      link,
      email: {
        to: admin.email,
        subject: `Antecipaqui · Novo ticket de suporte`,
        body: `${fromNome ?? fromEmail} (${fromEmail}) abriu um ticket.\n\nAssunto: ${assunto}\n\nResponda em ${link}.`,
      },
    });
  }
}

async function notifyAdminsNewMessage(
  ticketId: string,
  assunto: string,
  fromEmail: string,
  fromNome: string | null,
) {
  const adminUsers = await db
    .select()
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));

  const link = `/admin/tickets/${ticketId}`;
  for (const admin of adminUsers) {
    await notify({
      userId: admin.id,
      type: "ticket_reply_user",
      title: `Resposta no ticket "${assunto}"`,
      body: `${fromNome ?? fromEmail} respondeu. Veja em ${link}.`,
      link,
    });
  }
}
