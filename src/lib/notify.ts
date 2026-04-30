"use server";

/**
 * Sistema de notificações multi-canal.
 *
 * - In-app: persiste em `notificacoes`
 * - Email: via Resend (lib/email.ts) — fallback log se RESEND_API_KEY ausente
 * - SMS: via Twilio (lib/sms.ts) — fallback log se TWILIO_* ausente
 *
 * Uso: notify({ userId, type, title, body, link, email?, sms? })
 */

import { db } from "@/db";
import { notificacoes } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

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
  /** Se passado, dispara email e marca emailSent na row criada */
  email?: { to: string } & EmailPayload;
  /** Se passado, dispara SMS e marca smsSent */
  sms?: { to: string } & SmsPayload;
};

export async function notify(args: NotifyArgs) {
  let emailSent = false;
  let smsSent = false;

  if (args.email) {
    try {
      const r = await sendEmail({
        to: args.email.to,
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
      const r = await sendSms({
        to: args.sms.to,
        message: args.sms.message,
      });
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
