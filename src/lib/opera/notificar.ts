/**
 * NOTIFICAÇÃO DOS ENVOLVIDOS — o lado do cliente da integração.
 *
 * O fundo é dono do estado; nós somos donos da conversa. Cada mudança que
 * chega vira aviso para quem precisa saber ou agir, em linguagem nossa —
 * o cliente nunca precisa saber o nome do sistema do outro lado.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  imobiliarias,
  operacoes,
  users,
  type User,
} from "@/db/schema";
import { notify } from "@/lib/notify";
import type { PapelNotificado } from "@/lib/opera/contrato";

export type Envolvidos = {
  cedente: User | null;
  imobiliaria: User | null;
  construtora: User | null;
};

/** Resolve quem recebe aviso de uma operação. Deduplicado: quando o cedente
 *  é o próprio dono da imobiliária, ele recebe uma notificação, não duas. */
export async function envolvidosDaOperacao(
  op: typeof operacoes.$inferSelect,
): Promise<Envolvidos> {
  const [cedente] = await db
    .select()
    .from(users)
    .where(eq(users.id, op.corretorUserId))
    .limit(1);

  let imobUser: User | null = null;
  if (op.imobiliariaId) {
    const [imob] = await db
      .select({ ownerUserId: imobiliarias.ownerUserId })
      .from(imobiliarias)
      .where(eq(imobiliarias.id, op.imobiliariaId))
      .limit(1);
    if (imob?.ownerUserId && imob.ownerUserId !== op.corretorUserId) {
      const [u] = await db
        .select()
        .from(users)
        .where(eq(users.id, imob.ownerUserId))
        .limit(1);
      imobUser = u ?? null;
    }
  }

  let conUser: User | null = null;
  const [con] = await db
    .select({ ownerUserId: construtoras.ownerUserId })
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);
  if (con?.ownerUserId) {
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, con.ownerUserId))
      .limit(1);
    conUser = u ?? null;
  }

  return { cedente: cedente ?? null, imobiliaria: imobUser, construtora: conUser };
}

export type AvisoOperacao = {
  papeis: PapelNotificado[];
  type: string;
  titulo: string;
  corpo: string;
  link: string;
  /** Manda e-mail além do painel. */
  email?: boolean;
  assuntoEmail?: string;
  /** Manda SMS — reservado pros momentos em que alguém precisa AGIR. */
  urgente?: boolean;
  mensagemCurta?: string;
};

/** Dispara o aviso pros papéis pedidos. Falha de e-mail/SMS nunca derruba o
 *  processamento do evento — a notificação no painel sempre fica gravada. */
export async function avisarEnvolvidos(
  op: typeof operacoes.$inferSelect,
  aviso: AvisoOperacao,
) {
  const envolvidos = await envolvidosDaOperacao(op);
  const destinatarios: User[] = [];

  for (const papel of aviso.papeis) {
    const u = envolvidos[papel];
    if (u && !destinatarios.some((d) => d.id === u.id)) destinatarios.push(u);
  }

  for (const u of destinatarios) {
    try {
      await notify({
        userId: u.id,
        type: aviso.type,
        title: aviso.titulo,
        body: aviso.corpo,
        link: aviso.link,
        operacaoId: op.id,
        email: aviso.email
          ? {
              to: u.email,
              subject: aviso.assuntoEmail ?? aviso.titulo,
              body: `${u.nome ? `Olá ${u.nome},\n\n` : ""}${aviso.corpo}\n\nAcompanhe pelo painel: ${aviso.link}`,
            }
          : undefined,
        sms:
          aviso.urgente && u.telefone
            ? {
                to: u.telefone,
                message:
                  aviso.mensagemCurta ??
                  `Antecipaqui: ${aviso.titulo}. Acesse o painel.`,
              }
            : undefined,
      });
    } catch (e) {
      console.error("[opera/notificar] falhou pra", u.id, e);
    }
  }

  return destinatarios.length;
}

/** Avisa os admins — usado quando algo precisa de gente nossa: status fora do
 *  catálogo, job desistido, assinatura inválida. */
export async function avisarAdmins(input: {
  type: string;
  titulo: string;
  corpo: string;
  link: string;
  operacaoId?: string;
}) {
  const admins = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"));

  for (const a of admins) {
    if (!a.isActive) continue;
    try {
      await notify({
        userId: a.id,
        type: input.type,
        title: input.titulo,
        body: input.corpo,
        link: input.link,
        operacaoId: input.operacaoId,
      });
    } catch {
      /* aviso interno é best-effort */
    }
  }
}
