/**
 * Wrapper minimal pra envio de SMS via Twilio.
 *
 * Configuração:
 *  - TWILIO_ACCOUNT_SID
 *  - TWILIO_AUTH_TOKEN
 *  - TWILIO_FROM_NUMBER (no formato E.164, ex: +15551234567)
 *
 * Se faltar qualquer uma, loga no console e segue (mock).
 * O número de destino é normalizado pra E.164 (+55... no Brasil).
 */

import twilio from "twilio";

type SendSmsArgs = {
  /** Número de destino. Aceita "11999999999", "(11) 99999-9999", etc. — normaliza */
  to: string;
  message: string;
};

/**
 * Normaliza um telefone BR pra E.164 (+55...).
 * Já com + → mantém. Caso contrário, prefixa +55 nos dígitos.
 */
function toE164BR(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/[^\d+]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Se já tem 13 dígitos começando com 55, prefixa só "+"
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  // Se tem 10/11 dígitos (DDD + número), prefixa +55
  return `+55${digits}`;
}

let _twilio: ReturnType<typeof twilio> | null = null;
function client() {
  if (
    !_twilio &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  ) {
    _twilio = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  return _twilio;
}

export async function sendSms(
  args: SendSmsArgs,
): Promise<{ ok: boolean; sid?: string; mocked?: boolean }> {
  const to = toE164BR(args.to);
  if (!to) {
    console.warn("[sms] número inválido:", args.to);
    return { ok: false };
  }

  const c = client();
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!c || !from) {
    // Sem credenciais: loga e segue.
    console.log("[sms/mock]", { to, message: args.message });
    return { ok: true, mocked: true };
  }

  try {
    const r = await c.messages.create({
      from,
      to,
      body: args.message,
    });
    return { ok: true, sid: r.sid };
  } catch (e) {
    console.error("[sms/twilio] exception:", e);
    return { ok: false };
  }
}
