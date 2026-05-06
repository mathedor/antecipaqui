"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  fundos,
  operacoes,
  ticketMessages,
  ticketParticipants,
  tickets,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { notify } from "@/lib/notify";
import {
  categoriaPrecisaOperacao,
  chatCategoriaLabel,
  getCategoriasForRole,
  type ChatCategoria,
} from "@/lib/chat-helpers";

/* =========================================================================
   ROUTING — quem entra em cada chat baseado em categoria + operação
   ========================================================================= */

/** Resolve userIds que devem entrar como participantes além do criador. */
async function resolveDestinatarios(
  categoria: ChatCategoria,
  operacaoId: string | null,
): Promise<{ userIds: string[]; warnings: string[] }> {
  const warnings: string[] = [];

  // Suporte → todos os admins ativos
  if (categoria === "suporte") {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
    return { userIds: admins.map((a) => a.id), warnings };
  }

  if (!operacaoId)
    throw new Error(`Categoria "${categoria}" exige operação`);

  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) throw new Error("Operação não encontrada");

  // operacoes / negociacoes → owner do fundo da operação
  if (categoria === "operacoes" || categoria === "negociacoes") {
    if (!op.fundoId) {
      warnings.push(
        "Operação ainda não tem fundo definido. Mensagens ficam aguardando.",
      );
      return { userIds: [], warnings };
    }
    const [f] = await db
      .select({ ownerUserId: fundos.ownerUserId })
      .from(fundos)
      .where(eq(fundos.id, op.fundoId))
      .limit(1);
    if (f?.ownerUserId) return { userIds: [f.ownerUserId], warnings };
    warnings.push("Fundo da operação ainda sem usuário vinculado.");
    return { userIds: [], warnings };
  }

  // confirmacao → owner da construtora
  if (categoria === "confirmacao") {
    const [c] = await db
      .select({ ownerUserId: construtoras.ownerUserId })
      .from(construtoras)
      .where(eq(construtoras.id, op.construtoraId))
      .limit(1);
    if (c?.ownerUserId) return { userIds: [c.ownerUserId], warnings };
    warnings.push("Construtora ainda sem usuário vinculado.");
    return { userIds: [], warnings };
  }

  // documentos → corretor da operação (cedente)
  if (categoria === "documentos") {
    return { userIds: [op.corretorUserId], warnings };
  }

  return { userIds: [], warnings };
}

/* =========================================================================
   QUERIES — operações disponíveis pra usar como contexto do chat
   ========================================================================= */

/** Lista operações que o user pode usar como contexto de chat:
 *  - corretor/imob: operações que ele cadastrou
 *  - construtora: operações da sua construtora
 *  - comercial: operações sob sua responsabilidade
 *  - fundo: operações vinculadas ao seu fundo
 */
export async function listOperacoesParaChat() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  const baseSelect = {
    id: operacoes.id,
    numero: operacoes.numero,
    construtoraNome: construtoras.razaoSocial,
    fundoId: operacoes.fundoId,
  };

  if (user.role === "corretor" || user.role === "imobiliaria") {
    return db
      .select(baseSelect)
      .from(operacoes)
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .where(eq(operacoes.corretorUserId, user.id))
      .orderBy(desc(operacoes.createdAt));
  }
  if (user.role === "construtora") {
    const [c] = await db
      .select({ id: construtoras.id })
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, user.id))
      .limit(1);
    if (!c) return [];
    return db
      .select(baseSelect)
      .from(operacoes)
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .where(eq(operacoes.construtoraId, c.id))
      .orderBy(desc(operacoes.createdAt));
  }
  if (user.role === "fundo") {
    const [f] = await db
      .select({ id: fundos.id })
      .from(fundos)
      .where(eq(fundos.ownerUserId, user.id))
      .limit(1);
    if (!f) return [];
    return db
      .select(baseSelect)
      .from(operacoes)
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .where(eq(operacoes.fundoId, f.id))
      .orderBy(desc(operacoes.createdAt));
  }
  if (user.role === "comercial") {
    return db
      .select(baseSelect)
      .from(operacoes)
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .where(eq(operacoes.comercialId, user.id))
      .orderBy(desc(operacoes.createdAt));
  }
  return [];
}

/* =========================================================================
   ACTIONS
   ========================================================================= */

export type OpenChatState =
  | { ok: false; error: string }
  | { ok: true; ticketId: string; warnings: string[] }
  | null;

export async function openChatAction(
  _prev: OpenChatState,
  formData: FormData,
): Promise<OpenChatState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (!user.isActive) return { ok: false, error: "Conta bloqueada" };

  const categoria = String(formData.get("categoria") || "") as ChatCategoria;
  const operacaoIdRaw = String(formData.get("operacaoId") || "").trim();
  const operacaoId = operacaoIdRaw || null;
  const assunto = String(formData.get("assunto") || "").trim();
  const body = String(formData.get("body") || "").trim();

  const allowed = getCategoriasForRole(user.role);
  if (!allowed.includes(categoria))
    return { ok: false, error: "Categoria inválida pra seu perfil" };
  if (!assunto) return { ok: false, error: "Informe o assunto" };
  if (!body) return { ok: false, error: "Escreva a mensagem inicial" };
  if (categoriaPrecisaOperacao(categoria) && !operacaoId)
    return { ok: false, error: "Selecione a operação" };

  let resolved: { userIds: string[]; warnings: string[] };
  try {
    resolved = await resolveDestinatarios(categoria, operacaoId);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const [created] = await db
    .insert(tickets)
    .values({
      userId: user.id,
      assunto: assunto.slice(0, 200),
      status: "aberto",
      categoria,
      operacaoId,
    })
    .returning();

  // Adiciona participantes (criador + destinatários)
  const allParticipantIds = Array.from(
    new Set([user.id, ...resolved.userIds]),
  );
  const participantRows = await Promise.all(
    allParticipantIds.map(async (uid) => {
      const [u] = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);
      return {
        ticketId: created.id,
        userId: uid,
        role: u?.role ?? "unknown",
        lastReadAt: uid === user.id ? new Date() : null,
      };
    }),
  );
  if (participantRows.length > 0) {
    await db.insert(ticketParticipants).values(participantRows);
  }

  await db.insert(ticketMessages).values({
    ticketId: created.id,
    fromUserId: user.id,
    fromRole: user.role,
    body,
  });

  // Notifica destinatários
  for (const uid of resolved.userIds) {
    await notify({
      userId: uid,
      type: "chat_novo",
      title: `Novo chat · ${chatCategoriaLabel(categoria)} · ${assunto}`,
      body: body.slice(0, 200),
      link: `/painel/suporte/${created.id}`,
    }).catch(() => undefined);
  }

  revalidatePath("/painel/suporte");
  revalidatePath("/admin/tickets");
  return { ok: true, ticketId: created.id, warnings: resolved.warnings };
}

export type ReplyChatState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function replyChatAction(
  _prev: ReplyChatState,
  formData: FormData,
): Promise<ReplyChatState> {
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
  if (t.status === "finalizado")
    return { ok: false, error: "Ticket finalizado" };

  // Authz: precisa ser participante OU admin OU dono
  const allowed = await isAllowedInTicket(t, user);
  if (!allowed) return { ok: false, error: "Sem permissão" };

  await db.insert(ticketMessages).values({
    ticketId,
    fromUserId: user.id,
    fromRole: user.role,
    body,
  });

  await db
    .update(tickets)
    .set({ updatedAt: new Date(), status: "aberto" })
    .where(eq(tickets.id, ticketId));

  // Marca como lida pra quem enviou
  await markAsRead(ticketId, user.id);

  // Notifica os outros participantes ativos
  const others = await db
    .select({ userId: ticketParticipants.userId })
    .from(ticketParticipants)
    .where(
      and(
        eq(ticketParticipants.ticketId, ticketId),
        isNull(ticketParticipants.leftAt),
      ),
    );
  for (const o of others) {
    if (o.userId === user.id) continue;
    await notify({
      userId: o.userId,
      type: "chat_resposta",
      title: `Nova mensagem · ${t.assunto}`,
      body: body.slice(0, 200),
      link: `/painel/suporte/${ticketId}`,
    }).catch(() => undefined);
  }

  revalidatePath(`/painel/suporte/${ticketId}`);
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { ok: true };
}

async function isAllowedInTicket(
  t: typeof tickets.$inferSelect,
  user: { id: string; role: string },
) {
  if (user.role === "admin") return true;
  if (t.userId === user.id) return true;
  const [p] = await db
    .select()
    .from(ticketParticipants)
    .where(
      and(
        eq(ticketParticipants.ticketId, t.id),
        eq(ticketParticipants.userId, user.id),
        isNull(ticketParticipants.leftAt),
      ),
    )
    .limit(1);
  return !!p;
}

export async function markAsRead(ticketId: string, userId: string) {
  await db
    .update(ticketParticipants)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(ticketParticipants.ticketId, ticketId),
        eq(ticketParticipants.userId, userId),
      ),
    );
}

/* =========================================================================
   QUERIES
   ========================================================================= */

/** Lista chats acessíveis pro user logado:
 *  - Tudo onde ele é participante (criador entra automaticamente)
 *  - Admin vê tudo
 */
export async function listMyChats() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  if (user.role === "admin") {
    const rows = await db
      .select({
        id: tickets.id,
        assunto: tickets.assunto,
        status: tickets.status,
        categoria: tickets.categoria,
        operacaoId: tickets.operacaoId,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        userId: tickets.userId,
        userNome: users.nome,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(tickets)
      .leftJoin(users, eq(users.id, tickets.userId))
      .orderBy(desc(tickets.updatedAt));
    return rows;
  }

  // Não-admin: só vê tickets onde é participante
  const rows = await db
    .select({
      id: tickets.id,
      assunto: tickets.assunto,
      status: tickets.status,
      categoria: tickets.categoria,
      operacaoId: tickets.operacaoId,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      userId: tickets.userId,
      userNome: users.nome,
      userEmail: users.email,
      userRole: users.role,
    })
    .from(tickets)
    .innerJoin(
      ticketParticipants,
      and(
        eq(ticketParticipants.ticketId, tickets.id),
        eq(ticketParticipants.userId, user.id),
        isNull(ticketParticipants.leftAt),
      ),
    )
    .leftJoin(users, eq(users.id, tickets.userId))
    .orderBy(desc(tickets.updatedAt));
  return rows;
}

export async function getChatDetail(ticketId: string) {
  const user = await getCurrentDbUser();
  if (!user) return null;
  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) return null;
  const allowed = await isAllowedInTicket(t, user);
  if (!allowed) return null;

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

  const participantes = await db
    .select({
      id: ticketParticipants.id,
      userId: ticketParticipants.userId,
      role: ticketParticipants.role,
      addedAt: ticketParticipants.addedAt,
      leftAt: ticketParticipants.leftAt,
      nome: users.nome,
      email: users.email,
    })
    .from(ticketParticipants)
    .leftJoin(users, eq(users.id, ticketParticipants.userId))
    .where(eq(ticketParticipants.ticketId, ticketId))
    .orderBy(ticketParticipants.addedAt);

  // Marca como lida pra quem está abrindo
  await markAsRead(ticketId, user.id);

  return {
    ticket: t,
    messages,
    participantes,
    viewerRole: user.role,
    viewerId: user.id,
  };
}

/** Polling: retorna mensagens novas após um timestamp ISO. */
export async function getChatMessagesSince(
  ticketId: string,
  sinceIso: string,
) {
  const user = await getCurrentDbUser();
  if (!user) return [];
  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) return [];
  const allowed = await isAllowedInTicket(t, user);
  if (!allowed) return [];

  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return [];

  const rows = await db
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
    .where(
      and(
        eq(ticketMessages.ticketId, ticketId),
        gt(ticketMessages.createdAt, since),
      ),
    )
    .orderBy(ticketMessages.createdAt);

  // Marca como lida (polling = está vendo)
  if (rows.length > 0) await markAsRead(ticketId, user.id);

  return rows;
}

/* =========================================================================
   SYNC: trocar fundo da operação → reflete em chats vinculados
   ========================================================================= */

/** Quando admin/fundo troca o fundo de uma operação, sincroniza os chats
 *  vinculados a essa op nas categorias afetadas (operacoes/negociacoes):
 *  remove (leftAt) participantes do fundo antigo, adiciona owner do novo. */
export async function syncChatsOnFundoChange(
  operacaoId: string,
  novoFundoId: string | null,
) {
  // Lista chats afetados (operacoes/negociacoes vinculados à op)
  const chatsAfetados = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(
      and(
        eq(tickets.operacaoId, operacaoId),
        sql`${tickets.categoria} IN ('operacoes', 'negociacoes')`,
      ),
    );
  if (chatsAfetados.length === 0) return;

  // Owner do novo fundo (se houver)
  let novoOwnerId: string | null = null;
  if (novoFundoId) {
    const [f] = await db
      .select({ ownerUserId: fundos.ownerUserId })
      .from(fundos)
      .where(eq(fundos.id, novoFundoId))
      .limit(1);
    novoOwnerId = f?.ownerUserId ?? null;
  }

  for (const c of chatsAfetados) {
    // Remove participantes com role='fundo' que ainda estão ativos
    await db
      .update(ticketParticipants)
      .set({ leftAt: new Date() })
      .where(
        and(
          eq(ticketParticipants.ticketId, c.id),
          eq(ticketParticipants.role, "fundo"),
          isNull(ticketParticipants.leftAt),
        ),
      );

    // Adiciona owner do novo fundo (se houver e ainda não estiver)
    if (novoOwnerId) {
      const [existing] = await db
        .select()
        .from(ticketParticipants)
        .where(
          and(
            eq(ticketParticipants.ticketId, c.id),
            eq(ticketParticipants.userId, novoOwnerId),
          ),
        )
        .limit(1);
      if (existing) {
        // Reativa
        await db
          .update(ticketParticipants)
          .set({ leftAt: null, addedAt: new Date() })
          .where(eq(ticketParticipants.id, existing.id));
      } else {
        await db.insert(ticketParticipants).values({
          ticketId: c.id,
          userId: novoOwnerId,
          role: "fundo",
        });
      }

      // Notifica o novo fundo
      await notify({
        userId: novoOwnerId,
        type: "chat_novo_participante",
        title: `Você foi adicionado a um chat`,
        body: "Uma operação que estava em outro fundo foi transferida pra você. Acompanhe o histórico no chat.",
        link: `/painel/suporte/${c.id}`,
      }).catch(() => undefined);
    }
  }
}