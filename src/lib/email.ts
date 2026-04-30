/**
 * Wrapper minimal pra envio de email via Resend.
 *
 * Configuração:
 *  - RESEND_API_KEY (obrigatória pra enviar de verdade)
 *  - RESEND_FROM (default: "Antecipaqui <noreply@antecipaqui.digital>")
 *
 * Se RESEND_API_KEY não estiver setada, loga no console (dev/preview).
 * Assim o app funciona em qualquer ambiente sem precisar mockar.
 */

import { Resend } from "resend";

type SendEmailArgs = {
  to: string;
  subject: string;
  /** Plain text body. Convertemos em HTML simples se `html` não for passado. */
  body: string;
  /** Opcional: HTML pré-formatado. Se omitido, geramos com o body. */
  html?: string;
};

function defaultFrom() {
  return (
    process.env.RESEND_FROM || "Antecipaqui <noreply@antecipaqui.digital>"
  );
}

function bodyToHtml(body: string) {
  // wrapper HTML simples — corrige quebras + escape básico
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 16px 0;line-height:1.5">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111;background:#f7f7f8;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;padding:32px 28px;border:1px solid #e5e7eb">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#1f4ed8;margin-bottom:16px">Antecipaqui</div>
    ${paragraphs}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 14px 0"/>
    <div style="font-size:11px;color:#9ca3af">Você recebeu este email porque tem uma operação na Antecipaqui.</div>
  </div>
</body></html>`;
}

let _resend: Resend | null = null;
function client() {
  if (!_resend && process.env.RESEND_API_KEY) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendEmail(
  args: SendEmailArgs,
): Promise<{ ok: boolean; id?: string; mocked?: boolean }> {
  const c = client();
  if (!c) {
    // Sem API key: loga e segue. Útil em dev/preview sem secrets.
    console.log("[email/mock]", {
      to: args.to,
      subject: args.subject,
      preview: args.body.slice(0, 120),
    });
    return { ok: true, mocked: true };
  }

  try {
    const html = args.html ?? bodyToHtml(args.body);
    const r = await c.emails.send({
      from: defaultFrom(),
      to: args.to,
      subject: args.subject,
      text: args.body,
      html,
    });
    if (r.error) {
      console.error("[email/resend] error:", r.error);
      return { ok: false };
    }
    return { ok: true, id: r.data?.id };
  } catch (e) {
    console.error("[email/resend] exception:", e);
    return { ok: false };
  }
}
