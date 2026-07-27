/** ANA — Pulso do sistema (Antecipaqui) — v2.
 *
 *  GET /api/ana/pulso
 *  Auth: Authorization: Bearer $ANA_PULSO_TOKEN
 *
 *  Retorna métricas do dia (America/Sao_Paulo). Cada métrica roda em
 *  try/catch próprio — uma query quebrada não derruba o pulso, só omite
 *  o campo e registra aviso "metrica X indisponivel".
 *
 *  Fontes reais (src/db/schema.ts):
 *  - acessos_hoje ....................... audit_logs action='login' (dedup 30min
 *                                         por sessão em maybeLogLoginFor)
 *  - online_agora ....................... atividade nos últimos 15min: audit_logs
 *                                         ∪ ticket_messages ∪ cicero_mensagens
 *  - novos_cadastros_hoje / por_nivel ... users.created_at por role (enum user_role:
 *                                         corretor, imobiliaria, construtora,
 *                                         admin, fundo, comercial)
 *  - vendas_hoje / transacionado ........ operações EFETIVADAS hoje = aprovado_em
 *                                         hoje e status aprovado/realizada; valor =
 *                                         SUM(valor_presente) — mesmo critério do
 *                                         dashboard admin (valorAntecipado, com
 *                                         taxa_fundo_snapshot congelada na aprovação)
 *  - chamados_abertos ................... tickets (chats multi-participante)
 *  - tarefas_pendentes .................. fila admin + mesa de decisão do fundo +
 *                                         contratos aguardando assinatura + faturas
 *                                         do fundo pendentes/vencidas
 *  - avisos ............................. parcelas_comissao vencidas, ops paradas,
 *                                         webhooks_eventos com falha
 */

import { NextResponse, type NextRequest } from "next/server";
import { and, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  operacoes,
  parcelasComissao,
  tickets,
  users,
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

  // ── online_agora — users distintos com atividade nos últimos 15 min
  //    (ações auditadas ∪ mensagens de chat ∪ mensagens pro Cícero) ──
  try {
    const res = await db.execute(sql`
      SELECT COUNT(DISTINCT uid)::int AS n FROM (
        SELECT user_id AS uid FROM audit_logs
          WHERE created_at > now() - interval '15 minutes'
            AND user_id IS NOT NULL
        UNION
        SELECT from_user_id FROM ticket_messages
          WHERE created_at > now() - interval '15 minutes'
        UNION
        SELECT c.user_id FROM cicero_mensagens m
          JOIN cicero_conversas c ON c.id = m.conversa_id
          WHERE m.created_at > now() - interval '15 minutes'
      ) atividade
    `);
    const row = (res as unknown as { rows: { n: number }[] }).rows?.[0];
    pulso.online_agora = row?.n ?? 0;
  } catch {
    avisos.push("metrica online_agora indisponivel");
  }

  // ── acessos_hoje — users distintos com login hoje (SP).
  //    Tracking próprio: audit_logs action='login' (gravado em todo acesso
  //    autenticado com dedup de 30min — src/lib/audit.ts). ──
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

  // ── novos_cadastros_hoje + cadastros_por_nivel — users criados hoje (SP)
  //    quebrados por role real do schema (user_role enum) ──
  try {
    const rows = await db
      .select({
        role: users.role,
        n: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(
        sql`(${users.createdAt} at time zone 'America/Sao_Paulo')::date
          = (now() at time zone 'America/Sao_Paulo')::date`,
      )
      .groupBy(users.role);
    const porNivel: Record<string, number> = {};
    let total = 0;
    for (const r of rows) {
      porNivel[r.role] = r.n;
      total += r.n;
    }
    pulso.novos_cadastros_hoje = total;
    pulso.cadastros_por_nivel = porNivel;
  } catch {
    avisos.push("metrica novos_cadastros_hoje indisponivel");
  }

  // ── vendas_hoje + transacionado_hoje_centavos — operações EFETIVADAS hoje:
  //    aprovado_em hoje (SP) e status pós-aprovação. Valor = SUM(valor_presente),
  //    o "valor antecipado" canônico do dashboard admin (VP calculado com
  //    taxa_fundo_snapshot congelada na aprovação). ──
  try {
    const [r] = await db
      .select({
        n: sql<number>`count(*)::int`,
        total: sql<
          string | number
        >`coalesce(round(sum(${operacoes.valorPresente}) * 100), 0)::bigint`,
      })
      .from(operacoes)
      .where(
        sql`(${operacoes.aprovadoEm} at time zone 'America/Sao_Paulo')::date
            = (now() at time zone 'America/Sao_Paulo')::date
          and ${operacoes.status} in ('pre_aprovada','analise_final','enviada_para_assinatura','enviada_para_pagamento','realizada')`,
      );
    pulso.vendas_hoje = r?.n ?? 0;
    pulso.transacionado_hoje_centavos = Number(r?.total ?? 0);
  } catch {
    avisos.push("metrica vendas_hoje indisponivel");
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

  // ── tarefas_pendentes — pendências operacionais esperando alguém:
  //    fila do admin + mesa de decisão do fundo + contratos aguardando
  //    assinatura + faturas do fundo pendentes/vencidas ──
  try {
    const res = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM operacoes
          WHERE status IN ('aguardando_aprovacao','analise_final'))::int AS fila_admin,
        (SELECT COUNT(*) FROM operacoes
          WHERE fundo_aprovacao = 'pendente'
            AND status IN ('pre_aprovada','analise_final','enviada_para_assinatura'))::int AS mesa_fundo,
        (SELECT COUNT(*) FROM contratos
          WHERE status IN ('enviado_assinatura','parcialmente_assinado'))::int AS assinaturas,
        (SELECT COUNT(*) FROM faturas_fundo
          WHERE status IN ('pendente','parcial','vencida'))::int AS faturas
    `);
    const row = (
      res as unknown as {
        rows: {
          fila_admin: number;
          mesa_fundo: number;
          assinaturas: number;
          faturas: number;
        }[];
      }
    ).rows?.[0];
    if (row) {
      pulso.tarefas_pendentes =
        row.fila_admin + row.mesa_fundo + row.assinaturas + row.faturas;
      if (row.mesa_fundo > 0) {
        avisos.push(
          `${row.mesa_fundo} operação(ões) na mesa de decisão do fundo`,
        );
      }
      if (row.assinaturas > 0) {
        avisos.push(
          `${row.assinaturas} contrato(s) aguardando assinatura`,
        );
      }
      if (row.faturas > 0) {
        avisos.push(
          `${row.faturas} fatura(s) do fundo pendente(s)/vencida(s)`,
        );
      }
    } else {
      avisos.push("metrica tarefas_pendentes indisponivel");
    }
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
