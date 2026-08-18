/** CRON: cutucão automático em chats parados.
 *
 *  Executa 1x/dia. Para cada chat aberto/aguardando_resposta há ≥ N dias sem
 *  resposta E que não recebeu cutucão recente, dispara uma system message
 *  notificando os participantes ativos que deveriam responder (todos
 *  exceto o autor da última mensagem).
 *
 *  Idempotente via ultimo_nudge_em — mesmo chat só recebe cutucão automático
 *  uma vez por janela.
 *
 *  Defaults (sobrescrevíveis por env):
 *    AUTO_NUDGE_IDLE_DAYS=3        chat parado há ≥ 3 dias dispara
 *    AUTO_NUDGE_MIN_INTERVAL_DAYS=3 não cutuca de novo se cutucão < 3d
 *    AUTO_NUDGE_MAX_PER_RUN=200    teto por execução pra não estourar
 *
 *  Auth: Bearer $CRON_SECRET ou x-cron-secret header.
 *  Configurar em vercel.json crons.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/seguranca/cron-auth";
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ticketMessages,
  ticketParticipants,
  tickets,
} from "@/db/schema";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const IDLE_DAYS = Number(process.env.AUTO_NUDGE_IDLE_DAYS ?? "3");
const MIN_INTERVAL_DAYS = Number(
  process.env.AUTO_NUDGE_MIN_INTERVAL_DAYS ?? "3",
);
const MAX_PER_RUN = Number(process.env.AUTO_NUDGE_MAX_PER_RUN ?? "200");

export async function GET(req: NextRequest) {
  const naoAutorizado = requireCronAuth(req);
  if (naoAutorizado) return naoAutorizado;

  const now = new Date();
  const idleThreshold = new Date(now.getTime() - IDLE_DAYS * 24 * 3600 * 1000);
  const minIntervalThreshold = new Date(
    now.getTime() - MIN_INTERVAL_DAYS * 24 * 3600 * 1000,
  );

  // Chats elegíveis: aberto/aguardando, não arquivados, não finalizados,
  // sem atividade há >= IDLE_DAYS, sem cutucão recente.
  const candidatos = await db
    .select({
      id: tickets.id,
      assunto: tickets.assunto,
      categoria: tickets.categoria,
      updatedAt: tickets.updatedAt,
      ultimoNudgeEm: tickets.ultimoNudgeEm,
      userId: tickets.userId,
    })
    .from(tickets)
    .where(
      and(
        sql`${tickets.status} IN ('aberto', 'aguardando_resposta')`,
        isNull(tickets.arquivadoEm),
        lt(tickets.updatedAt, idleThreshold),
        or(
          isNull(tickets.ultimoNudgeEm),
          lt(tickets.ultimoNudgeEm, minIntervalThreshold),
        ),
      ),
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(MAX_PER_RUN);

  const erros: string[] = [];
  let cutucados = 0;
  let notificacoesEnviadas = 0;

  for (const c of candidatos) {
    try {
      // Última mensagem (autor) — pra saber quem NÃO precisa ser cutucado
      const [ultimaMsg] = await db
        .select({ fromUserId: ticketMessages.fromUserId })
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, c.id))
        .orderBy(desc(ticketMessages.createdAt))
        .limit(1);
      const ultimoAutor = ultimaMsg?.fromUserId ?? null;

      const diasParado = Math.max(
        1,
        Math.floor(
          (now.getTime() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      // ticketMessages.fromUserId é NOT NULL com FK pra users — usa o último
      // autor se houver, senão o criador do ticket (sempre existe).
      const systemFromUserId = ultimoAutor ?? c.userId;
      await db.insert(ticketMessages).values({
        ticketId: c.id,
        fromUserId: systemFromUserId,
        fromRole: "system",
        kind: "system",
        body: `🤖 Cutucão automático: chat parado há ${diasParado} ${
          diasParado === 1 ? "dia" : "dias"
        } sem resposta.`,
      });

      // Atualiza ultimo_nudge_em + updatedAt
      await db
        .update(tickets)
        .set({ ultimoNudgeEm: now, updatedAt: now })
        .where(eq(tickets.id, c.id));

      // Notifica os participantes ativos exceto o último autor
      const others = await db
        .select({ userId: ticketParticipants.userId })
        .from(ticketParticipants)
        .where(
          and(
            eq(ticketParticipants.ticketId, c.id),
            isNull(ticketParticipants.leftAt),
          ),
        );
      for (const o of others) {
        if (o.userId === ultimoAutor) continue;
        await notify({
          userId: o.userId,
          type: "chat_auto_nudge",
          title: `Chat parado há ${diasParado}d · ${c.assunto}`,
          body: `O chat "${c.assunto}" está esperando sua resposta há ${diasParado} ${
            diasParado === 1 ? "dia" : "dias"
          }.`,
          link: `/painel/suporte/${c.id}`,
        }).catch(() => undefined);
        notificacoesEnviadas++;
      }

      cutucados++;
    } catch (e) {
      erros.push(`ticket ${c.id}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    cutucados,
    notificacoesEnviadas,
    candidatosTotal: candidatos.length,
    config: {
      idleDays: IDLE_DAYS,
      minIntervalDays: MIN_INTERVAL_DAYS,
      maxPerRun: MAX_PER_RUN,
    },
    erros,
    timestamp: now.toISOString(),
  });
}
