/**
 * Wrapper minimal pra envio de email via Resend.
 *
 * Configuração:
 *  - RESEND_API_KEY (obrigatória pra enviar de verdade)
 *  - RESEND_FROM (default: "Antecipaqui <noreply@antecipaqui.digital>")
 *
 * Falha NÃO passa batido: todo envio que não sai vira linha em `email_falhas`
 * e aparece em /admin/entregabilidade. Isso existe porque o domínio ficou sem
 * verificação no Resend e a plataforma inteira parou de mandar e-mail sem que
 * ninguém percebesse — o erro só ia pro console de um server action.
 *
 * Sem RESEND_API_KEY: em desenvolvimento loga e segue (útil em preview sem
 * secrets); em produção isso é falha, porque significa e-mail não entregue.
 */

import { Resend } from "resend";

type SendEmailArgs = {
  to: string;
  subject: string;
  /** Plain text body. Convertemos em HTML simples se `html` não for passado. */
  body: string;
  /** Opcional: HTML pré-formatado. Se omitido, geramos com o body. */
  html?: string;
  /** De onde partiu o envio (ex: "cobranca", "daily"). Vai pro registro
   *  de falha e ajuda a achar o fluxo afetado. */
  contexto?: string;
};

export type SendEmailResult = {
  ok: boolean;
  id?: string;
  /** True quando não havia API key e estamos fora de produção. */
  mocked?: boolean;
  /** Preenchido quando ok=false. */
  error?: string;
};

function defaultFrom() {
  return (
    process.env.RESEND_FROM || "Antecipaqui <noreply@antecipaqui.digital>"
  );
}

function emProducao() {
  return process.env.NODE_ENV === "production";
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

/** Grava a falha pra alguém ver depois. Best-effort e sem e-mail nenhum —
 *  se isso também falhar, o console é o último recurso (não dá pra avisar
 *  de falha de e-mail por e-mail). */
async function registrarFalha(args: {
  to: string;
  subject: string;
  erro: string;
  contexto?: string;
}) {
  console.error("[email/falha]", {
    to: args.to,
    subject: args.subject,
    erro: args.erro,
    contexto: args.contexto,
  });
  try {
    const { db } = await import("@/db");
    const { emailFalhas } = await import("@/db/schema");
    await db.insert(emailFalhas).values({
      destinatario: args.to,
      assunto: args.subject,
      erro: args.erro.slice(0, 2000),
      contexto: args.contexto ?? null,
    });
  } catch (e) {
    console.error("[email/falha] não consegui registrar no banco:", e);
  }
}

export async function sendEmail(
  args: SendEmailArgs,
): Promise<SendEmailResult> {
  const c = client();

  if (!c) {
    // Fora de produção seguir sem enviar é conveniência de dev.
    if (!emProducao()) {
      console.log("[email/mock]", {
        to: args.to,
        subject: args.subject,
        preview: args.body.slice(0, 120),
      });
      return { ok: true, mocked: true };
    }
    // Em produção, isso é e-mail não entregue — tratar como falha.
    const erro = "RESEND_API_KEY ausente em produção";
    await registrarFalha({ ...args, erro });
    return { ok: false, error: erro };
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
      const erro = `${r.error.name ?? "erro"}: ${r.error.message ?? String(r.error)}`;
      await registrarFalha({ ...args, erro });
      return { ok: false, error: erro };
    }
    return { ok: true, id: r.data?.id };
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    await registrarFalha({ ...args, erro });
    return { ok: false, error: erro };
  }
}

/**
 * Variante pra fluxo crítico, onde entregar o e-mail faz parte da operação
 * (ex: mandar credencial de acesso). Registra a falha igual e ainda lança,
 * pra o caller não seguir achando que deu certo.
 */
export async function sendEmailOrThrow(
  args: SendEmailArgs,
): Promise<SendEmailResult> {
  const r = await sendEmail(args);
  if (!r.ok) {
    throw new Error(`Falha ao enviar e-mail para ${args.to}: ${r.error}`);
  }
  return r;
}
