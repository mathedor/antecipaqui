/** ANA — Pulso do sistema (Antecipaqui).
 *
 *  GET /api/ana/pulso
 *  Auth: Authorization: Bearer $ANA_PULSO_TOKEN
 *
 *  Retorna métricas do dia (America/Sao_Paulo). Cada métrica roda em
 *  try/catch próprio — uma query quebrada não derruba o pulso, só omite
 *  o campo e registra aviso "metrica X indisponivel".
 *
 *  Fontes reais (src/db/schema.ts):
 *  - online_agora / acessos_hoje ....... audit_logs (action='login' tem dedup de 30min)
 *  - vendas_hoje / transacionado ....... operacoes (valor_comissao = valor antecipado)
 *  - chamados_abertos .................. tickets (chats multi-participante)
 *  - tarefas_pendentes ................. operacoes aguardando ação do time
 *  - avisos ............................ parcelas_comissao vencidas, webhooks_eventos com falha
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  operacoes,
  parcelasComissao,
  tickets,
  webhooksEventos,
} from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.ANA_PULSO_TOKEN;
  const auth = req.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const pulso: Record<string, unknown> = { sistema: "antecipaqui" };
  const avisos: string[] = [];

  // ── online_agora — users com atividade auditada nos últimos 30 min ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(distinct ${auditLogs.userId})::int` })
      .from(auditLogs)
      .where(sql`${auditLogs.createdAt} > now() - interval '30 minutes'`);
    pulso.online_agora = r?.n ?? 0;
  } catch {
    avisos.push("metrica online_agora indisponivel");
  }

  // ── acessos_hoje — users distintos com login hoje (SP) ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(distinct ${auditLogs.userId})::int` })
      .from(auditLogs)
      .where(
        sql`${auditLogs.action} = 'login'
          and (${auditLogs.createdAt} at time zone 'America/Sao_Paulo')::date
            = (now() at time zone 'America/Sao_Paulo')::date`,
      );
    pulso.acessos_hoje = r?.n ?? 0;
  } catch {
    avisos.push("metrica acessos_hoje indisponivel");
  }

  // ── vendas_hoje — operações criadas hoje (SP) ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(operacoes)
      .where(
        sql`(${operacoes.createdAt} at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date`,
      );
    pulso.vendas_hoje = r?.n ?? 0;
  } catch {
    avisos.push("metrica vendas_hoje indisponivel");
  }

  // ── transacionado_hoje_centavos — soma do valor antecipado (valor_comissao)
  //    das operações criadas hoje (SP) ──
  try {
    const [r] = await db
      .select({
        total: sql<
          string | number
        >`coalesce(round(sum(${operacoes.valorComissao}) * 100), 0)::bigint`,
      })
      .from(operacoes)
      .where(
        sql`(${operacoes.createdAt} at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date`,
      );
    pulso.transacionado_hoje_centavos = Number(r?.total ?? 0);
  } catch {
    avisos.push("metrica transacionado_hoje_centavos indisponivel");
  }

  // ── chamados_abertos — chats/tickets não finalizados nem arquivados ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(tickets)
      .where(
        and(
          inArray(tickets.status, ["aberto", "aguardando_resposta"]),
          isNull(tickets.arquivadoEm),
        ),
      );
    pulso.chamados_abertos = r?.n ?? 0;
  } catch {
    avisos.push("metrica chamados_abertos indisponivel");
  }

  // ── tarefas_pendentes — operações aguardando ação do time ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(operacoes)
      .where(inArray(operacoes.status, ["aguardando_aprovacao", "analise_final"]));
    pulso.tarefas_pendentes = r?.n ?? 0;
  } catch {
    avisos.push("metrica tarefas_pendentes indisponivel");
  }

  // ── avisos: parcelas de comissão vencidas ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(parcelasComissao)
      .where(
        sql`${parcelasComissao.status} = 'vencida'
          or (${parcelasComissao.status} = 'a_vencer'
            and ${parcelasComissao.vencimento} < (now() at time zone 'America/Sao_Paulo')::date)`,
      );
    if ((r?.n ?? 0) > 0) {
      avisos.push(`${r!.n} parcela(s) de comissão vencida(s)`);
    }
  } catch {
    // aviso opcional — silencia
  }

  // ── avisos: operações paradas há mais de 3 dias aguardando aprovação ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(operacoes)
      .where(
        sql`${operacoes.status} in ('aguardando_aprovacao', 'analise_final')
          and ${operacoes.createdAt} < now() - interval '3 days'`,
      );
    if ((r?.n ?? 0) > 0) {
      avisos.push(`${r!.n} operação(ões) parada(s) há mais de 3 dias aguardando aprovação`);
    }
  } catch {
    // aviso opcional — silencia
  }

  // ── avisos: fila de webhooks com falhas repetidas ──
  try {
    const [r] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(webhooksEventos)
      .where(
        sql`${webhooksEventos.status} = 'pendente'
          and ${webhooksEventos.tentativas} >= 3`,
      );
    if ((r?.n ?? 0) > 0) {
      avisos.push(`${r!.n} webhook(s) na fila com 3+ tentativas falhas`);
    }
  } catch {
    // aviso opcional — silencia
  }

  return NextResponse.json({ ...pulso, avisos });
}
