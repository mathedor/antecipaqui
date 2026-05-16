"use server";

/**
 * Sistema de notificações multi-canal.
 *
 * - In-app: persiste em `notificacoes`
 * - Email: via Resend (lib/email.ts) — fallback log se RESEND_API_KEY ausente
 * - SMS: via Twilio (lib/sms.ts) — fallback log se TWILIO_* ausente
 *
 * Uso: notify({ userId, type, title, body, link, email?, sms? })
 *
 * MODO IMPERSONATION: quando admin está agindo como outro user, suprime
 * envio externo (email/SMS) pra não confundir o cliente real. Mantém o
 * registro no DB com metadata.viaImpersonation=true pra auditoria.
 */

import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notificacoes, users } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { IMPERSONATE_COOKIE_NAME } from "@/lib/impersonate";

type EmailPayload = { subject: string; body: string; html?: string };
type SmsPayload = { message: string };

type NotifyArgs = {
  userId: string;
  /** ID enum-like — útil pra filtrar/agrupar (ex: "operacao_pre_aprovada") */
  type: string;
  title: string;
  body?: string;
  link?: string;
  operacaoId?: string;
  /** Se passado, dispara email e marca emailSent na row criada */
  email?: { to: string } & EmailPayload;
  /** Se passado, dispara SMS e marca smsSent */
  sms?: { to: string } & SmsPayload;
};

/** Detecta se a request atual é de um admin impersonando. Best-effort —
 *  retorna null se não conseguir detectar (não bloqueia notify). */
async function detectImpersonation(): Promise<{
  adminId: string;
  adminEmail: string;
} | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;
    const cookieStore = await cookies();
    const targetId = cookieStore.get(IMPERSONATE_COOKIE_NAME)?.value;
    if (!targetId) return null;
    // Quem ESTÁ logado precisa ser admin pra contar como impersonation
    const [real] = await db
      .select({ id: users.id, role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!real || real.role !== "admin") return null;
    return { adminId: real.id, adminEmail: real.email };
  } catch {
    return null;
  }
}

export async function notify(args: NotifyArgs) {
  const impersonation = await detectImpersonation();
  const isImpersonating = impersonation !== null;

  let emailSent = false;
  let smsSent = false;

  // Suprime envio externo (email/SMS) durante impersonation pra não
  // confundir o cliente final com mensagens disparadas pelo suporte.
  if (args.email && !isImpersonating) {
    try {
      const r = await sendEmail({
        to: args.email.to,
        subject: args.email.subject,
        body: args.email.body,
        html: args.email.html,
      });
      emailSent = r.ok;
    } catch (e) {
      console.error("[notify/email] error", e);
    }
  }

  if (args.sms && !isImpersonating) {
    try {
      const r = await sendSms({
        to: args.sms.to,
        message: args.sms.message,
      });
      smsSent = r.ok;
    } catch (e) {
      console.error("[notify/sms] error", e);
    }
  }

  // Notificação in-app: sempre persiste (cliente vai ver pelo sino quando
  // logar). Mas marca a flag pra rastreabilidade.
  await db.insert(notificacoes).values({
    userId: args.userId,
    type: args.type,
    title: isImpersonating ? `${args.title} · via suporte` : args.title,
    body: args.body ?? null,
    link: args.link ?? null,
    operacaoId: args.operacaoId ?? null,
    emailSent,
    smsSent,
  });

  if (isImpersonating && impersonation) {
    console.log(
      `[notify/impersonation] email/sms suprimidos · admin=${impersonation.adminEmail} target=${args.userId}`,
    );
  }
}
