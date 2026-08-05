"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
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

/** Anexo de mensagem: estrutura do que vai no jsonb attachments. */
export type ChatAttachment = {
  url: string;
  name: string;
  size: number;
  type: string;
};

const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15 MB
const NUDGE_COOLDOWN_MS = 30 * 60 * 1000; // 30 min
const MIN_HOURS_BEFORE_NUDGE = 12;

function parseAttachments(raw: unknown): ChatAttachment[] {
  if (!raw) return [];
  let arr: unknown;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  } else {
    arr = raw;
  }
  if (!Array.isArray(arr)) return [];
  const ok: ChatAttachment[] = [];
  for (const item of arr.slice(0, MAX_ATTACHMENTS_PER_MESSAGE)) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as ChatAttachment).url === "string" &&
      typeof (item as ChatAttachment).name === "string"
    ) {
      const a = item as ChatAttachment;
      if (typeof a.size === "number" && a.size > MAX_ATTACHMENT_SIZE) continue;
      ok.push({
        url: a.url,
        name: a.name.slice(0, 200),
        size: typeof a.size === "number" ? a.size : 0,
        type: typeof a.type === "string" ? a.type : "application/octet-stream",
      });
    }
  }
  return ok;
}

/* =========================================================================
   ROUTING — quem entra em cada chat baseado em categoria + operação
   ========================================================================= */

/** Resolve userIds que devem entrar como participantes além do criador. */
async function resolveDestinatarios(
  categoria: ChatCategoria,
  operacaoId: string | null,
  senderRole?: string,
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

  // confirmacao → conversa fundo ↔ construtora (destino = outro lado)
  if (categoria === "confirmacao") {
    if (senderRole === "construtora") {
      if (!op.fundoId) {
        warnings.push("Operação ainda não tem fundo vinculado.");
        return { userIds: [], warnings };
      }
      const [f] = await db
        .select({ ownerUserId: fundos.ownerUserId })
        .from(fundos)
        .where(eq(fundos.id, op.fundoId))
        .limit(1);
      if (f?.ownerUserId) return { userIds: [f.ownerUserId], warnings };
      warnings.push("Fundo ainda sem usuário vinculado.");
      return { userIds: [], warnings };
    }
    // Default (fundo/admin) → construtora
    const [c] = await db
      .select({ ownerUserId: construtoras.ownerUserId })
      .from(construtoras)
      .where(eq(construtoras.id, op.construtoraId))
      .limit(1);
    if (c?.ownerUserId) return { userIds: [c.ownerUserId], warnings };
    warnings.push("Construtora ainda sem usuário vinculado.");
    return { userIds: [], warnings };
  }

  // documentos → fundo pede pro corretor cedente OU construtora envia pro fundo
  if (categoria === "documentos") {
    if (senderRole === "construtora") {
      if (!op.fundoId) {
        warnings.push("Operação ainda não tem fundo vinculado.");
        return { userIds: [], warnings };
      }
      const [f] = await db
        .select({ ownerUserId: fundos.ownerUserId })
        .from(fundos)
        .where(eq(fundos.id, op.fundoId))
        .limit(1);
      if (f?.ownerUserId) return { userIds: [f.ownerUserId], warnings };
      warnings.push("Fundo ainda sem usuário vinculado.");
      return { userIds: [], warnings };
    }
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

  const attachments = parseAttachments(formData.get("attachments"));

  const allowed = getCategoriasForRole(user.role);
  if (!allowed.includes(categoria))
    return { ok: false, error: "Categoria inválida pra seu perfil" };
  if (!assunto) return { ok: false, error: "Informe o assunto" };
  if (!body && attachments.length === 0)
    return { ok: false, error: "Escreva a mensagem inicial ou anexe um arquivo" };
  if (categoriaPrecisaOperacao(categoria) && !operacaoId)
    return { ok: false, error: "Selecione a operação" };

  let resolved: { userIds: string[]; warnings: string[] };
  try {
    resolved = await resolveDestinatarios(categoria, operacaoId, user.role);
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
    body: body || (attachments.length === 1 ? "📎 Anexo" : "📎 Anexos"),
    attachments: attachments.length > 0 ? attachments : null,
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
  const attachments = parseAttachments(formData.get("attachments"));
  if (!ticketId) return { ok: false, error: "ticketId obrigatório" };
  if (!body && attachments.length === 0)
    return { ok: false, error: "Escreva a resposta ou anexe um arquivo" };

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
    body: body || (attachments.length === 1 ? "📎 Anexo" : "📎 Anexos"),
    attachments: attachments.length > 0 ? attachments : null,
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

export type ChatListItem = {
  id: string;
  assunto: string;
  status: string;
  categoria: string;
  operacaoId: string | null;
  createdAt: Date;
  updatedAt: Date;
  arquivadoEm: Date | null;
  userId: string;
  userNome: string | null;
  userEmail: string | null;
  userRole: string | null;
  unreadCount: number;
};

/** Lista chats acessíveis pro user logado:
 *  - Tudo onde ele é participante (criador entra automaticamente)
 *  - Admin vê tudo
 *
 * Filtros opcionais:
 * - q: busca no assunto (ILIKE)
 * - categoria: filtra por chatCategoria
 * - status: aberto | aguardando_resposta | finalizado
 * - includeArquivados: incluir arquivados (default false, esconde)
 * - onlyUnread: só com mensagens não lidas
 */
export async function listMyChats(opts?: {
  q?: string;
  categoria?: string;
  status?: string;
  includeArquivados?: boolean;
  onlyUnread?: boolean;
}): Promise<ChatListItem[]> {
  const user = await getCurrentDbUser();
  if (!user) return [];

  const conds: ReturnType<typeof eq>[] = [];
  if (opts?.q) {
    // Busca no assunto OU dentro do conteúdo das mensagens do ticket
    const q = `%${opts.q}%`;
    conds.push(
      sql`(
        ${tickets.assunto} ILIKE ${q}
        OR EXISTS (
          SELECT 1 FROM ${ticketMessages}
          WHERE ${ticketMessages.ticketId} = ${tickets.id}
            AND ${ticketMessages.body} ILIKE ${q}
        )
      )` as never,
    );
  }
  if (opts?.categoria) conds.push(eq(tickets.categoria, opts.categoria));
  if (opts?.status) conds.push(eq(tickets.status, opts.status as never));
  if (!opts?.includeArquivados)
    conds.push(isNull(tickets.arquivadoEm));

  // Subquery: lastReadAt do user logado para cada ticket (null se admin nunca foi adicionado)
  const lastReadSubquery = sql<Date | null>`(
    SELECT ${ticketParticipants.lastReadAt}
    FROM ${ticketParticipants}
    WHERE ${ticketParticipants.ticketId} = ${tickets.id}
      AND ${ticketParticipants.userId} = ${user.id}
    LIMIT 1
  )`;

  // Subquery: count de mensagens criadas após o lastReadAt do user (ou todas se nunca leu)
  const unreadSubquery = sql<number>`(
    SELECT COUNT(*)::int FROM ${ticketMessages}
    WHERE ${ticketMessages.ticketId} = ${tickets.id}
      AND ${ticketMessages.fromUserId} <> ${user.id}
      AND (
        ${lastReadSubquery} IS NULL
        OR ${ticketMessages.createdAt} > ${lastReadSubquery}
      )
  )`;

  const baseSelect = {
    id: tickets.id,
    assunto: tickets.assunto,
    status: tickets.status,
    categoria: tickets.categoria,
    operacaoId: tickets.operacaoId,
    createdAt: tickets.createdAt,
    updatedAt: tickets.updatedAt,
    arquivadoEm: tickets.arquivadoEm,
    userId: tickets.userId,
    userNome: users.nome,
    userEmail: users.email,
    userRole: users.role,
    unreadCount: unreadSubquery,
  };

  if (user.role === "admin") {
    const rows = await db
      .select(baseSelect)
      .from(tickets)
      .leftJoin(users, eq(users.id, tickets.userId))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(tickets.updatedAt));
    return opts?.onlyUnread
      ? rows.filter((r) => r.unreadCount > 0)
      : rows;
  }

  // Não-admin: só vê tickets onde é participante ativo
  const rows = await db
    .select(baseSelect)
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
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(tickets.updatedAt));
  return opts?.onlyUnread
    ? rows.filter((r) => r.unreadCount > 0)
    : rows;
}

/** Conta total de mensagens não lidas para o user logado (badge global).
 *  Conta apenas mensagens que não são do próprio user, em chats onde ele
 *  é participante ativo (ou admin vê tudo). */
export async function getUnreadCount(): Promise<number> {
  const user = await getCurrentDbUser();
  if (!user) return 0;

  const lastReadSubquery = sql<Date | null>`(
    SELECT ${ticketParticipants.lastReadAt}
    FROM ${ticketParticipants}
    WHERE ${ticketParticipants.ticketId} = ${ticketMessages.ticketId}
      AND ${ticketParticipants.userId} = ${user.id}
    LIMIT 1
  )`;

  if (user.role === "admin") {
    // Admin: conta mensagens em qualquer ticket NÃO arquivado, exceto suas próprias,
    // com lastReadAt comparison (admin já tem participant row)
    const [row] = await db
      .select({
        n: sql<number>`COUNT(*)::int`,
      })
      .from(ticketMessages)
      .innerJoin(tickets, eq(tickets.id, ticketMessages.ticketId))
      .where(
        and(
          isNull(tickets.arquivadoEm),
          ne(ticketMessages.fromUserId, user.id),
          or(
            sql`${lastReadSubquery} IS NULL`,
            gt(ticketMessages.createdAt, lastReadSubquery),
          ),
        ),
      );
    return row?.n ?? 0;
  }

  // Não-admin: só conta em tickets onde é participante ativo
  const [row] = await db
    .select({
      n: sql<number>`COUNT(*)::int`,
    })
    .from(ticketMessages)
    .innerJoin(tickets, eq(tickets.id, ticketMessages.ticketId))
    .innerJoin(
      ticketParticipants,
      and(
        eq(ticketParticipants.ticketId, tickets.id),
        eq(ticketParticipants.userId, user.id),
        isNull(ticketParticipants.leftAt),
      ),
    )
    .where(
      and(
        isNull(tickets.arquivadoEm),
        ne(ticketMessages.fromUserId, user.id),
        or(
          isNull(ticketParticipants.lastReadAt),
          gt(ticketMessages.createdAt, ticketParticipants.lastReadAt),
        ),
      ),
    );
  return row?.n ?? 0;
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
      kind: ticketMessages.kind,
      attachments: ticketMessages.attachments,
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
      kind: ticketMessages.kind,
      attachments: ticketMessages.attachments,
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
   ACTIONS — archive / reopen / nudge
   ========================================================================= */

async function ensureTicketAccess(ticketId: string) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) throw new Error("Chat não encontrado");
  const allowed = await isAllowedInTicket(t, user);
  if (!allowed) throw new Error("Sem permissão");
  return { user, ticket: t };
}

async function insertSystemMessage(
  ticketId: string,
  fromUserId: string,
  fromRole: string,
  body: string,
) {
  await db.insert(ticketMessages).values({
    ticketId,
    fromUserId,
    fromRole,
    body,
    kind: "system",
  });
  await db
    .update(tickets)
    .set({ updatedAt: new Date() })
    .where(eq(tickets.id, ticketId));
}

/** Arquiva ou desarquiva um chat. Só esconde da listagem padrão; mensagens
 *  permanecem acessíveis via filtro "arquivados". Pode ser feito por admin ou
 *  pelo dono do chat. */
export async function setChatArquivado(ticketId: string, arquivado: boolean) {
  const { user, ticket } = await ensureTicketAccess(ticketId);
  const isOwner = ticket.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin)
    throw new Error("Só admin ou autor pode arquivar/desarquivar");

  await db
    .update(tickets)
    .set({
      arquivadoEm: arquivado ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));

  await insertSystemMessage(
    ticketId,
    user.id,
    user.role,
    arquivado
      ? `📦 Chat arquivado por ${user.nome ?? user.email}.`
      : `📂 Chat desarquivado por ${user.nome ?? user.email}.`,
  );

  revalidatePath("/painel/suporte");
  revalidatePath(`/painel/suporte/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
}

/** Reabre um chat finalizado. Só admin. Insere mensagem de sistema e volta
 *  status pra "aberto". Notifica os participantes ativos. */
export async function reopenChatAction(ticketId: string) {
  const { user, ticket } = await ensureTicketAccess(ticketId);
  if (user.role !== "admin")
    throw new Error("Só admin pode reabrir chat finalizado");
  if (ticket.status !== "finalizado")
    throw new Error("Chat não está finalizado");

  await db
    .update(tickets)
    .set({
      status: "aberto",
      finalizadoEm: null,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId));

  await insertSystemMessage(
    ticketId,
    user.id,
    user.role,
    `🔄 Chat reaberto por ${user.nome ?? user.email}.`,
  );

  // Notifica participantes ativos (exceto admin que reabriu)
  const ativos = await db
    .select({ userId: ticketParticipants.userId })
    .from(ticketParticipants)
    .where(
      and(
        eq(ticketParticipants.ticketId, ticketId),
        isNull(ticketParticipants.leftAt),
      ),
    );
  for (const p of ativos) {
    if (p.userId === user.id) continue;
    await notify({
      userId: p.userId,
      type: "chat_reaberto",
      title: `Chat reaberto · ${ticket.assunto}`,
      body: `${user.nome ?? user.email} reabriu um chat finalizado.`,
      link: `/painel/suporte/${ticketId}`,
    }).catch(() => undefined);
  }

  revalidatePath("/painel/suporte");
  revalidatePath(`/painel/suporte/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
}

/** Cutuca os participantes do outro lado. Rate-limited por chat (30min) e só
 *  permitido se o chat está parado há ≥12h (sem mensagem nova). Insere msg
 *  de sistema e notifica os outros. */
export async function nudgeChatAction(ticketId: string) {
  const { user, ticket } = await ensureTicketAccess(ticketId);
  if (ticket.status === "finalizado")
    throw new Error("Chat finalizado não pode ser cutucado");
  if (ticket.arquivadoEm)
    throw new Error("Chat arquivado não pode ser cutucado");

  if (
    ticket.ultimoNudgeEm &&
    Date.now() - ticket.ultimoNudgeEm.getTime() < NUDGE_COOLDOWN_MS
  )
    throw new Error("Aguarde 30min entre cutucões.");

  const hoursIdle =
    (Date.now() - ticket.updatedAt.getTime()) / (1000 * 60 * 60);
  if (hoursIdle < MIN_HOURS_BEFORE_NUDGE)
    throw new Error(
      `Espere pelo menos ${MIN_HOURS_BEFORE_NUDGE}h sem resposta pra cutucar (faltam ${(MIN_HOURS_BEFORE_NUDGE - hoursIdle).toFixed(1)}h).`,
    );

  const now = new Date();
  await db
    .update(tickets)
    .set({ ultimoNudgeEm: now, updatedAt: now })
    .where(eq(tickets.id, ticketId));

  const diasParado = Math.max(1, Math.floor(hoursIdle / 24));
  await insertSystemMessage(
    ticketId,
    user.id,
    user.role,
    `👋 Cutucão de ${user.nome ?? user.email}: este chat está parado há ${diasParado} ${
      diasParado === 1 ? "dia" : "dias"
    } sem resposta.`,
  );

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
      type: "chat_nudge",
      title: `Cutucão · ${ticket.assunto}`,
      body: `${user.nome ?? user.email} cutucou o chat — está há ${diasParado} ${
        diasParado === 1 ? "dia" : "dias"
      } sem resposta.`,
      link: `/painel/suporte/${ticketId}`,
    }).catch(() => undefined);
  }

  revalidatePath(`/painel/suporte/${ticketId}`);
  revalidatePath(`/admin/tickets/${ticketId}`);
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

      // System message no thread pra ficar visível pra todos
      const [novoFundo] = await db
        .select({ nome: fundos.nomeFantasia })
        .from(fundos)
        .where(eq(fundos.id, novoFundoId!))
        .limit(1);
      await db.insert(ticketMessages).values({
        ticketId: c.id,
        fromUserId: novoOwnerId,
        fromRole: "fundo",
        kind: "system",
        body: `🔁 Operação migrada para o fundo ${novoFundo?.nome ?? "—"}. Agora é o novo destinatário deste chat.`,
      });
    }
  }
}