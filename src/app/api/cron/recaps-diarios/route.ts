/** CRON: gera Recaps de fim de dia/semana/mês.
 *
 *  Roda diariamente 03:30 UTC (= 00:30 UTC-3).
 *  Para cada execução:
 *   - Diário:   sempre gera (ontem)
 *   - Semanal:  se hoje é segunda, gera a semana anterior (segunda → domingo)
 *   - Mensal:   se hoje é dia 1, gera o mês anterior inteiro
 *
 *  Escopo: gera 1 recap pra admin (global) + 1 por fundo ativo.
 *  Notifica admins e donos de fundo via in-app + email "report estratégico".
 *
 *  Configurar em vercel.json:
 *    "crons": [{ "path": "/api/cron/recaps-diarios", "schedule": "30 3 * * *" }]
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/seguranca/cron-auth";
import {
  calcularRecap,
  listAdmins,
  listFundosComOwner,
  periodoRange,
  salvarRecap,
  type RecapDados,
  type RecapPeriodo,
} from "@/lib/recaps";
import {
  renderRecapHtml,
  renderRecapText,
} from "@/lib/recap-email-template";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function fmtDateBR(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

function tituloDoRecap(p: RecapPeriodo): string {
  if (p === "diario") return "Recap diário";
  if (p === "semanal") return "Recap semanal";
  return "Recap mensal";
}

/** Calcula a referência do período anterior (mesma duração).
 *  - diario: 2 dias atrás
 *  - semanal: 7 dias antes da ref
 *  - mensal: 1 dia antes do início do mês anterior (= último dia 2 meses atrás) */
function refAnterior(periodo: RecapPeriodo, ref: Date): Date {
  const prev = new Date(ref);
  if (periodo === "diario") {
    prev.setUTCDate(ref.getUTCDate() - 1);
  } else if (periodo === "semanal") {
    prev.setUTCDate(ref.getUTCDate() - 7);
  } else {
    prev.setUTCDate(0); // primeiro dia anterior já no mês anterior
  }
  return prev;
}

function subjectFor(d: RecapDados, titulo: string): string {
  const isSingleDay = d.inicio === d.fim;
  const periodo = isSingleDay
    ? fmtDateBR(d.inicio)
    : `${fmtDateBR(d.inicio)} → ${fmtDateBR(d.fim)}`;
  return `[Antecipaqui] ${titulo} · ${periodo}`;
}

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital"
  );
}

export async function GET(req: NextRequest) {
  const naoAutorizado = requireCronAuth(req);
  if (naoAutorizado) return naoAutorizado;

  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setUTCDate(hoje.getUTCDate() - 1);

  const tipos: RecapPeriodo[] = ["diario"];
  if (hoje.getUTCDay() === 1) tipos.push("semanal");
  if (hoje.getUTCDate() === 1) tipos.push("mensal");

  const fundos = await listFundosComOwner();
  const admins = await listAdmins();
  const fundosAtivos = fundos.filter((f) => f.ownerUserId);

  const recapsGerados: Array<{
    periodo: RecapPeriodo;
    escopo: string;
    inicio: string;
  }> = [];
  const erros: string[] = [];

  for (const periodo of tipos) {
    const { inicio, fim } = periodoRange(periodo, ontem);
    const titulo = tituloDoRecap(periodo);

    // Compara com período anterior pra exibir delta no email
    const refPrev = refAnterior(periodo, ontem);
    const { inicio: prevInicio, fim: prevFim } = periodoRange(
      periodo,
      refPrev,
    );

    /* 1) Recap admin (global) */
    try {
      const [dados, prev] = await Promise.all([
        calcularRecap({
          periodo,
          inicio,
          fim,
          escopo: "admin",
          fundoId: null,
        }),
        calcularRecap({
          periodo,
          inicio: prevInicio,
          fim: prevFim,
          escopo: "admin",
          fundoId: null,
        }).catch(() => undefined),
      ]);
      await salvarRecap(dados);
      recapsGerados.push({ periodo, escopo: "admin", inicio });

      const subject = subjectFor(dados, `${titulo} (admin)`);
      const ctaUrl = `${siteUrl()}/admin/relatorios/recaps`;
      const html = renderRecapHtml({
        titulo: `${titulo} · visão admin`,
        d: dados,
        prev,
        ctaUrl,
      });
      const body = renderRecapText({
        titulo: `${titulo} (admin)`,
        d: dados,
        prev,
        ctaUrl,
      });

      for (const a of admins) {
        await notify({
          userId: a.id,
          type: `recap_${periodo}`,
          title: subject,
          body: `Operações: ${dados.opsNovas.qtd} novas · ${dados.totalAprovado.qtd} aprovadas. Veja em Relatórios → Recaps.`,
          link: `/admin/relatorios/recaps`,
          email: { to: a.email, subject, body, html },
        }).catch((e) =>
          erros.push(`admin notify ${a.id}: ${(e as Error).message}`),
        );
      }
    } catch (e) {
      erros.push(`recap admin ${periodo}: ${(e as Error).message}`);
    }

    /* 2) Recap por fundo */
    for (const fundo of fundosAtivos) {
      if (!fundo.ownerUserId) continue;
      try {
        const [dados, prev] = await Promise.all([
          calcularRecap({
            periodo,
            inicio,
            fim,
            escopo: "fundo",
            fundoId: fundo.id,
          }),
          calcularRecap({
            periodo,
            inicio: prevInicio,
            fim: prevFim,
            escopo: "fundo",
            fundoId: fundo.id,
          }).catch(() => undefined),
        ]);
        await salvarRecap(dados);
        recapsGerados.push({
          periodo,
          escopo: `fundo:${fundo.id}`,
          inicio,
        });

        const subject = subjectFor(
          dados,
          `${titulo} · ${fundo.razaoSocial}`,
        );
        const ctaUrl = `${siteUrl()}/painel/recaps`;
        const html = renderRecapHtml({
          titulo: `${titulo} · ${fundo.razaoSocial}`,
          d: dados,
          prev,
          ctaUrl,
        });
        const body = renderRecapText({
          titulo: `${titulo} · ${fundo.razaoSocial}`,
          d: dados,
          prev,
          ctaUrl,
        });

        await notify({
          userId: fundo.ownerUserId,
          type: `recap_${periodo}`,
          title: subject,
          body: `Operações no fundo: ${dados.opsNovas.qtd} novas · ${dados.totalAprovado.qtd} aprovadas.`,
          link: `/painel/recaps`,
          email: fundo.ownerEmail
            ? { to: fundo.ownerEmail, subject, body, html }
            : undefined,
        }).catch((e) =>
          erros.push(`fundo notify ${fundo.id}: ${(e as Error).message}`),
        );
      } catch (e) {
        erros.push(
          `recap fundo ${fundo.id} ${periodo}: ${(e as Error).message}`,
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    tipos,
    gerados: recapsGerados.length,
    detalhes: recapsGerados,
    fundosNotificados: fundosAtivos.length,
    adminsNotificados: admins.length,
    erros,
    timestamp: new Date().toISOString(),
  });
}
