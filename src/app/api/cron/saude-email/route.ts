/**
 * Cron diário: confere se a plataforma ainda está entregando e-mail.
 *
 * Existe porque o domínio ficou sem DKIM no DNS, o provedor passou a recusar
 * 100% dos envios e ninguém percebeu — a falha só aparecia no console. Agora
 * o problema chega no sino dos admins no dia seguinte, sem depender de
 * alguém abrir /admin/entregabilidade.
 *
 * Nunca avisa por e-mail: se o e-mail está quebrado, o aviso não sairia.
 *
 * Configurado em vercel.json:
 *   { "path": "/api/cron/saude-email", "schedule": "0 11 * * *" }
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { notificacoes, users } from "@/db/schema";
import { checarSaudeEmail, registrarCheck } from "@/lib/email-saude";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TIPO_NOTIF = "saude_email";
/** Não repete o mesmo alerta em menos de 20h (o cron roda 1x/dia). */
const JANELA_DEDUPE_HORAS = 20;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    const custom = req.headers.get("x-cron-secret");
    if (auth !== `Bearer ${expected}` && custom !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const saude = await checarSaudeEmail();
  await registrarCheck(saude).catch((e) =>
    console.error("[cron/saude-email] falhou ao registrar check", e),
  );

  if (saude.nivel === "ok") {
    return NextResponse.json({
      ok: true,
      nivel: saude.nivel,
      statusDominio: saude.statusDominio,
      alertados: 0,
    });
  }

  const titulo =
    saude.nivel === "critico"
      ? "E-mail parado: ninguém está recebendo"
      : "Falhas no envio de e-mail nas últimas 24h";

  const corpo =
    `${saude.resumo}\n\n` +
    (saude.erroConsulta ? `Detalhe: ${saude.erroConsulta}\n\n` : "") +
    (saude.nivel === "critico"
      ? "Enquanto isso durar, nenhuma notificação, cobrança ou credencial chega ao destinatário. Abra Entrega de e-mail para ver os registros de DNS pendentes."
      : "Abra Entrega de e-mail para ver quais envios falharam e reenviar o que for crítico.");

  // Dedupe: se já avisamos esse mesmo nível há menos de 20h, não repete.
  const desde = new Date(Date.now() - JANELA_DEDUPE_HORAS * 60 * 60 * 1000);
  const [recente] = await db
    .select({ id: notificacoes.id })
    .from(notificacoes)
    .where(
      and(
        eq(notificacoes.type, TIPO_NOTIF),
        eq(notificacoes.title, titulo),
        gt(notificacoes.createdAt, desde),
      ),
    )
    .limit(1);

  if (recente) {
    return NextResponse.json({
      ok: true,
      nivel: saude.nivel,
      statusDominio: saude.statusDominio,
      alertados: 0,
      deduplicado: true,
    });
  }

  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));

  if (admins.length > 0) {
    await db.insert(notificacoes).values(
      admins.map((a) => ({
        userId: a.id,
        type: TIPO_NOTIF,
        title: titulo,
        body: corpo,
        link: "/admin/entregabilidade",
        // Deixa explícito que não tentamos avisar por e-mail — seria inútil.
        emailSent: false,
      })),
    );
  } else {
    console.error(
      "[cron/saude-email] sem admin ativo pra avisar:",
      saude.resumo,
    );
  }

  console.error(`[cron/saude-email] ${saude.nivel}: ${saude.resumo}`);

  return NextResponse.json({
    ok: true,
    nivel: saude.nivel,
    statusDominio: saude.statusDominio,
    falhas24h: saude.falhas24h,
    alertados: admins.length,
  });
}

/** Permite disparar manualmente pelo painel/curl sem esperar o cron. */
export async function POST(req: NextRequest) {
  return GET(req);
}
