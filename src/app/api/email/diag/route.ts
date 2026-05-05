import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Endpoint de diagnóstico do Resend.
 * Exige session Clerk autenticada (pra não virar relay aberto).
 *
 * Uso:
 *   /api/email/diag                   → mostra status da config
 *   /api/email/diag?to=email@x.com    → tenta enviar email de teste pro endereço
 *
 * Retorna o erro real do Resend (sem mock) pra confirmar que API + domínio +
 * From estão corretos em produção.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { ok: false, step: "auth", error: "not signed in" },
      { status: 401 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = req.nextUrl.searchParams.get("to");

  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      step: "env",
      error: "RESEND_API_KEY ausente — emails saem mockados (log)",
      from,
    });
  }
  if (!from) {
    return NextResponse.json({
      ok: false,
      step: "env",
      error: "RESEND_FROM ausente",
    });
  }

  if (!to) {
    return NextResponse.json({
      ok: true,
      step: "config",
      apiKeyPrefix: apiKey.slice(0, 8) + "…",
      from,
      hint: "Pra disparar email de teste, chame com ?to=seu@email.com",
    });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const r = await resend.emails.send({
      from,
      to,
      subject: "Antecipaqui · diagnóstico Resend (prod)",
      text: `Olá!\n\nEmail de teste disparado por /api/email/diag.\n\nFrom configurado: ${from}\nEnviado em: ${new Date().toISOString()}\n\nSe você recebeu, Resend está OK em produção.`,
      html: `<p>Olá!</p><p>Email de teste disparado por <code>/api/email/diag</code> em produção.</p><p><strong>From configurado:</strong> <code>${from}</code></p><p><em>Enviado em: ${new Date().toISOString()}</em></p><p>Se você recebeu, Resend está OK.</p>`,
    });
    if (r.error) {
      return NextResponse.json(
        {
          ok: false,
          step: "send",
          errorName: r.error.name,
          errorMessage: r.error.message,
          from,
          to,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      step: "send",
      emailId: r.data?.id,
      from,
      to,
      message: `Email enviado. Cheque a caixa de ${to} (e o spam).`,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        step: "send",
        errorName: (e as Error).name,
        errorMessage: (e as Error).message,
        from,
        to,
      },
      { status: 500 },
    );
  }
}
