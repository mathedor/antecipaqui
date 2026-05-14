/** Preview do template de email do recap.
 *  GET /admin/relatorios/recaps/preview?periodo=diario&data=YYYY-MM-DD&escopo=admin&fundoId=...
 *
 *  Útil pra: ver o HTML do email sem esperar o cron rodar.
 *  Acesso restrito a admin (Clerk).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-user";
import {
  calcularRecap,
  periodoRange,
  type RecapPeriodo,
} from "@/lib/recaps";
import {
  renderRecapHtml,
} from "@/lib/recap-email-template";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePeriodo(v: string | null): RecapPeriodo {
  if (v === "semanal" || v === "mensal") return v;
  return "diario";
}

function parseDate(v: string | null): Date {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return new Date(v + "T12:00:00Z");
  }
  const ontem = new Date();
  ontem.setUTCDate(ontem.getUTCDate() - 1);
  return ontem;
}

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = new URL(req.url);
  const periodo = parsePeriodo(url.searchParams.get("periodo"));
  const ref = parseDate(url.searchParams.get("data"));
  const escopo = url.searchParams.get("escopo") === "fundo" ? "fundo" : "admin";
  const fundoId =
    escopo === "fundo" ? url.searchParams.get("fundoId") || null : null;

  const { inicio, fim } = periodoRange(periodo, ref);

  // Período anterior pra delta
  const refPrev = new Date(ref);
  if (periodo === "diario") refPrev.setUTCDate(ref.getUTCDate() - 1);
  else if (periodo === "semanal") refPrev.setUTCDate(ref.getUTCDate() - 7);
  else refPrev.setUTCDate(0);
  const { inicio: prevInicio, fim: prevFim } = periodoRange(periodo, refPrev);

  const [dados, prev] = await Promise.all([
    calcularRecap({ periodo, inicio, fim, escopo, fundoId }),
    calcularRecap({
      periodo,
      inicio: prevInicio,
      fim: prevFim,
      escopo,
      fundoId,
    }).catch(() => undefined),
  ]);

  const titulo =
    periodo === "diario"
      ? "Recap diário"
      : periodo === "semanal"
        ? "Recap semanal"
        : "Recap mensal";

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";
  const ctaUrl =
    escopo === "admin"
      ? `${siteUrl}/admin/relatorios/recaps`
      : `${siteUrl}/painel/recaps`;

  const html = renderRecapHtml({
    titulo: `${titulo} · ${escopo === "admin" ? "visão admin" : "fundo"}`,
    d: dados,
    prev,
    ctaUrl,
  });

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
