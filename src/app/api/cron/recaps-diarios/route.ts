/** CRON: gera Recaps de fim de dia/semana/mês.
 *
 *  Roda diariamente 23:55 (UTC-3 = 02:55 UTC do dia seguinte → cron 0 3 * * *).
 *  Para cada execução:
 *   - Diário:   sempre gera (ontem)
 *   - Semanal:  se hoje é segunda, gera a semana anterior (segunda → domingo)
 *   - Mensal:   se hoje é dia 1, gera o mês anterior inteiro
 *
 *  Escopo: gera 1 recap pra admin (global) + 1 por fundo ativo.
 *  Notifica admins e donos de fundo via in-app + email.
 *
 *  Configurar em vercel.json:
 *    "crons": [{ "path": "/api/cron/recaps-diarios", "schedule": "0 3 * * *" }]
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  calcularRecap,
  listAdmins,
  listFundosComOwner,
  periodoRange,
  salvarRecap,
  type RecapDados,
  type RecapPeriodo,
} from "@/lib/recaps";
import { notify } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDateBR(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

function emailBody(d: RecapDados, titulo: string): { subject: string; body: string } {
  const subject = `[Antecipaqui] ${titulo} ${fmtDateBR(d.inicio)}${d.inicio !== d.fim ? ` → ${fmtDateBR(d.fim)}` : ""}`;

  const linhas: string[] = [];
  linhas.push(`📊 ${titulo} (${fmtDateBR(d.inicio)}${d.inicio !== d.fim ? ` → ${fmtDateBR(d.fim)}` : ""})`);
  linhas.push("");
  linhas.push(`Operações novas: ${d.opsNovas.qtd} (${fmtBRL(d.opsNovas.valor)})`);
  linhas.push(`Operações realizadas: ${d.opsRealizadas.qtd} (${fmtBRL(d.opsRealizadas.valor)})`);
  linhas.push(`Aprovadas pelos fundos: ${d.totalAprovado.qtd} (${fmtBRL(d.totalAprovado.valor)})`);
  linhas.push(`Recusadas: ${d.totalRecusado.qtd} (${fmtBRL(d.totalRecusado.valor)})`);
  linhas.push("");

  if (d.escopo === "admin" && d.aprovacoes.length > 0) {
    linhas.push(`Aprovações por fundo:`);
    for (const a of d.aprovacoes) {
      linhas.push(`  • ${a.fundoNome}: ${a.qtd} op${a.qtd === 1 ? "" : "s"} · ${fmtBRL(a.valor)}`);
    }
    linhas.push("");
  }

  linhas.push(`Inadimplência no período: ${fmtBRL(d.inadimplencia.vencidoNoPeriodo)}`);
  linhas.push(`Inadimplência acumulada: ${fmtBRL(d.inadimplencia.acumulado)} (${d.inadimplencia.qtdVencidasAcumulado} parcela${d.inadimplencia.qtdVencidasAcumulado === 1 ? "" : "s"})`);
  linhas.push("");
  linhas.push(`Novos corretores: ${d.novosCorretores}`);
  linhas.push(`Prazo médio de análise: ${d.prazoMedioAnaliseHoras.toFixed(1)}h`);
  linhas.push("");
  linhas.push(`Antecipações: ${d.antecipacoes.solicitadas} solicitada(s) · ${d.antecipacoes.aprovadas} aprovada(s) · ${d.antecipacoes.recusadas} recusada(s)`);
  linhas.push("");
  linhas.push(`Acesse o recap completo em: /admin/relatorios/recaps`);

  return { subject, body: linhas.join("\n") };
}

function tituloDoRecap(p: RecapPeriodo): string {
  if (p === "diario") return "Recap diário";
  if (p === "semanal") return "Recap semanal";
  return "Recap mensal";
}

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get("authorization");
    const custom = req.headers.get("x-cron-secret");
    if (auth !== `Bearer ${expected}` && custom !== expected) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  // "ontem" como referência — o dia que acabou de fechar
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setUTCDate(hoje.getUTCDate() - 1);

  const tipos: RecapPeriodo[] = ["diario"];
  // Semanal: se hoje é segunda (1), ontem foi domingo — fecha a semana
  if (hoje.getUTCDay() === 1) tipos.push("semanal");
  // Mensal: se hoje é dia 1, ontem foi último dia do mês passado
  if (hoje.getUTCDate() === 1) tipos.push("mensal");

  const fundos = await listFundosComOwner();
  const admins = await listAdmins();
  const fundosAtivos = fundos.filter((f) => f.ownerUserId);

  const recapsGerados: Array<{ periodo: RecapPeriodo; escopo: string; inicio: string }> = [];
  const erros: string[] = [];

  for (const periodo of tipos) {
    const { inicio, fim } = periodoRange(periodo, ontem);
    const titulo = tituloDoRecap(periodo);

    // 1) Recap admin (global)
    try {
      const dados = await calcularRecap({
        periodo,
        inicio,
        fim,
        escopo: "admin",
        fundoId: null,
      });
      await salvarRecap(dados);
      recapsGerados.push({ periodo, escopo: "admin", inicio });

      const mail = emailBody(dados, `${titulo} (admin)`);
      for (const a of admins) {
        await notify({
          userId: a.id,
          type: `recap_${periodo}`,
          title: mail.subject,
          body: `Operações: ${dados.opsNovas.qtd} novas · ${dados.totalAprovado.qtd} aprovadas. Veja em Relatórios → Recaps.`,
          link: `/admin/relatorios/recaps`,
          email: { to: a.email, subject: mail.subject, body: mail.body },
        }).catch((e) => erros.push(`admin notify ${a.id}: ${(e as Error).message}`));
      }
    } catch (e) {
      erros.push(`recap admin ${periodo}: ${(e as Error).message}`);
    }

    // 2) Recap por fundo
    for (const fundo of fundosAtivos) {
      if (!fundo.ownerUserId) continue;
      try {
        const dados = await calcularRecap({
          periodo,
          inicio,
          fim,
          escopo: "fundo",
          fundoId: fundo.id,
        });
        await salvarRecap(dados);
        recapsGerados.push({ periodo, escopo: `fundo:${fundo.id}`, inicio });

        const mail = emailBody(dados, `${titulo} · ${fundo.razaoSocial}`);
        await notify({
          userId: fundo.ownerUserId,
          type: `recap_${periodo}`,
          title: mail.subject,
          body: `Operações no fundo: ${dados.opsNovas.qtd} novas · ${dados.totalAprovado.qtd} aprovadas.`,
          link: `/painel/recaps`,
          email: fundo.ownerEmail
            ? { to: fundo.ownerEmail, subject: mail.subject, body: mail.body }
            : undefined,
        }).catch((e) =>
          erros.push(`fundo notify ${fundo.id}: ${(e as Error).message}`),
        );
      } catch (e) {
        erros.push(`recap fundo ${fundo.id} ${periodo}: ${(e as Error).message}`);
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
