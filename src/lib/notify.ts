"use server";

/**
 * Sistema de notificações multi-canal.
 *
 * - In-app: persiste em `notificacoes`
 * - Email: stub por enquanto (logs no console). Round 2 = Resend integration
 * - SMS: stub por enquanto. Round 2 = Twilio/Zenvia
 *
 * Uso: notify({ userId, type, title, body, link, email?, sms? })
 */

import { db } from "@/db";
import { notificacoes } from "@/db/schema";

type EmailPayload = { subject: string; body: string };
type SmsPayload = { message: string };

type NotifyArgs = {
  userId: string;
  /** ID enum-like — útil pra filtrar/agrupar (ex: "operacao_pre_aprovada") */
  type: string;
  title: string;
  body?: string;
  link?: string;
  operacaoId?: string;
  /** Se passado, dispara email (stub) e marca emailSent na row criada */
  email?: { to: string } & EmailPayload;
  /** Se passado, dispara sms (stub) e marca smsSent */
  sms?: { to: string } & SmsPayload;
};

async function sendEmailStub(to: string, payload: EmailPayload) {
  console.log("[notify/email]", {
    to,
    subject: payload.subject,
    bodyPreview: payload.body.slice(0, 100),
  });
  // TODO Round 2: integrar com Resend
  // await resend.emails.send({ from: "...", to, subject: payload.subject, html: payload.body });
  return { ok: true };
}

async function sendSmsStub(to: string, payload: SmsPayload) {
  console.log("[notify/sms]", { to, message: payload.message });
  // TODO Round 2: integrar com Twilio/Zenvia
  return { ok: true };
}

export async function notify(args: NotifyArgs) {
  let emailSent = false;
  let smsSent = false;

  if (args.email) {
    try {
      const r = await sendEmailStub(args.email.to, {
        subject: args.email.subject,
        body: args.email.body,
      });
      emailSent = r.ok;
    } catch (e) {
      console.error("[notify/email] error", e);
    }
  }

  if (args.sms) {
    try {
      const r = await sendSmsStub(args.sms.to, { message: args.sms.message });
      smsSent = r.ok;
    } catch (e) {
      console.error("[notify/sms] error", e);
    }
  }

  await db.insert(notificacoes).values({
    userId: args.userId,
    type: args.type,
    title: args.title,
    body: args.body ?? null,
    link: args.link ?? null,
    operacaoId: args.operacaoId ?? null,
    emailSent,
    smsSent,
  });
}
