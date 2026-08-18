/** CRON: lembretes automáticos de cobrança de parcelas.
 *
 *  Executa 1x/dia. Cria ticket categoria 'confirmacao' (fundo ↔ construtora):
 *  - Pré-vencimento: parcelas a_vencer com vencimento entre +5 e +9 dias
 *  - Atraso: parcelas vencidas/a_vencer com vencimento < hoje
 *
 *  Idempotente: cada parcela só recebe um lembrete pré-vencimento e um de
 *  atraso (campos cobranca_pre_vencimento_em / cobranca_atraso_em).
 *
 *  Configurar em vercel.json:
 *    "crons": [{ "path": "/api/cron/cobranca-parcelas", "schedule": "0 12 * * *" }]
 *
 *  Header de auth: x-cron-secret = CRON_SECRET env var. Vercel Cron envia
 *  automaticamente o header pra requests de cron jobs configurados no
 *  vercel.json — basta definir CRON_SECRET nas envs.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/seguranca/cron-auth";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { tickets, ticketMessages, parcelasComissao } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export async function GET(req: NextRequest) {
  // Auth: Vercel Cron adiciona Authorization: Bearer $CRON_SECRET
  // automaticamente. Fail-closed — sem CRON_SECRET, recusa.
  const naoAutorizado = requireCronAuth(req);
  if (naoAutorizado) return naoAutorizado;

  let preVencCriados = 0;
  let atrasoCriados = 0;
  const erros: string[] = [];
  const construtorasComAtrasoNovo = new Set<string>();

  // 1. PRÉ-VENCIMENTO: parcelas a_vencer com vencimento em 5-9 dias
  const preVencRes = await db.execute(sql`
    SELECT
      p.id::text AS parcela_id,
      p.numero AS parcela_numero,
      p.valor::float AS valor,
      p.vencimento::text AS vencimento,
      o.id::text AS operacao_id,
      o.numero AS op_numero,
      o.fundo_id::text AS fundo_id,
      o.construtora_id::text AS construtora_id
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE p.status = 'a_vencer'
      AND p.vencimento BETWEEN CURRENT_DATE + INTERVAL '5 days'
                           AND CURRENT_DATE + INTERVAL '9 days'
      AND p.cobranca_pre_vencimento_em IS NULL
      AND o.fundo_id IS NOT NULL
      AND o.status IN ('enviada_para_pagamento','realizada')
  `);
  type Row = {
    parcela_id: string;
    parcela_numero: number;
    valor: number;
    vencimento: string;
    operacao_id: string;
    op_numero: string;
    fundo_id: string;
    construtora_id: string;
  };
  const preVencRows = (preVencRes as unknown as { rows: Row[] }).rows ?? [];

  for (const row of preVencRows) {
    try {
      // Procura responsável da construtora (ownerUserId) — destinatário
      const ownerRes = await db.execute(sql`
        SELECT owner_user_id::text AS uid
        FROM construtoras WHERE id = ${row.construtora_id}::uuid LIMIT 1
      `);
      const ownerUid =
        (ownerRes as unknown as { rows: { uid: string | null }[] }).rows[0]
          ?.uid ?? null;
      // Fundo é o "originador" do ticket
      const fundoOwnerRes = await db.execute(sql`
        SELECT owner_user_id::text AS uid
        FROM fundos WHERE id = ${row.fundo_id}::uuid LIMIT 1
      `);
      const fundoUid =
        (fundoOwnerRes as unknown as { rows: { uid: string | null }[] }).rows[0]
          ?.uid ?? null;
      if (!ownerUid || !fundoUid) {
        erros.push(`parcela ${row.parcela_id}: sem owner construtora/fundo`);
        continue;
      }

      const [t] = await db
        .insert(tickets)
        .values({
          userId: fundoUid,
          assunto: `Lembrete: parcela ${row.parcela_numero}/${row.op_numero} vence em breve`,
          status: "aberto",
          categoria: "confirmacao",
          operacaoId: row.operacao_id,
        })
        .returning({ id: tickets.id });

      await db.insert(ticketMessages).values({
        ticketId: t.id,
        fromUserId: fundoUid,
        fromRole: "fundo",
        body: `Olá! Apenas um lembrete amigável: a parcela ${row.parcela_numero} da operação ${row.op_numero} no valor de ${fmtBRL(row.valor)} vence em ${fmtDate(row.vencimento)}. Qualquer dúvida ou imprevisto, é só responder por aqui. Mensagem gerada automaticamente pelo sistema.`,
      });

      await db
        .update(parcelasComissao)
        .set({ cobrancaPreVencimentoEm: new Date() })
        .where(eq(parcelasComissao.id, row.parcela_id));

      preVencCriados++;
    } catch (e) {
      erros.push(
        `parcela ${row.parcela_id} (pré-venc): ${(e as Error).message}`,
      );
    }
  }

  // 2. ATRASO: parcelas vencidas/a_vencer com vencimento < hoje, sem
  //    cobrança de atraso enviada ainda
  const atrasoRes = await db.execute(sql`
    SELECT
      p.id::text AS parcela_id,
      p.numero AS parcela_numero,
      p.valor::float AS valor,
      p.vencimento::text AS vencimento,
      (CURRENT_DATE - p.vencimento)::int AS dias_atraso,
      o.id::text AS operacao_id,
      o.numero AS op_numero,
      o.fundo_id::text AS fundo_id,
      o.construtora_id::text AS construtora_id
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE p.status IN ('vencida', 'a_vencer')
      AND p.vencimento < CURRENT_DATE
      AND p.cobranca_atraso_em IS NULL
      AND o.fundo_id IS NOT NULL
      AND o.status IN ('enviada_para_pagamento','realizada')
  `);
  type AtrRow = Row & { dias_atraso: number };
  const atrasoRows =
    (atrasoRes as unknown as { rows: AtrRow[] }).rows ?? [];

  for (const row of atrasoRows) {
    try {
      const fundoOwnerRes = await db.execute(sql`
        SELECT owner_user_id::text AS uid
        FROM fundos WHERE id = ${row.fundo_id}::uuid LIMIT 1
      `);
      const fundoUid =
        (fundoOwnerRes as unknown as { rows: { uid: string | null }[] }).rows[0]
          ?.uid ?? null;
      if (!fundoUid) {
        erros.push(`parcela ${row.parcela_id}: sem owner fundo`);
        continue;
      }

      const [t] = await db
        .insert(tickets)
        .values({
          userId: fundoUid,
          assunto: `⚠ Atraso: parcela ${row.parcela_numero}/${row.op_numero} (${row.dias_atraso}d)`,
          status: "aberto",
          categoria: "confirmacao",
          operacaoId: row.operacao_id,
        })
        .returning({ id: tickets.id });

      await db.insert(ticketMessages).values({
        ticketId: t.id,
        fromUserId: fundoUid,
        fromRole: "fundo",
        body: `Identificamos atraso no pagamento da parcela ${row.parcela_numero} da operação ${row.op_numero}, no valor de ${fmtBRL(row.valor)}, com vencimento em ${fmtDate(row.vencimento)} (${row.dias_atraso} dia${row.dias_atraso === 1 ? "" : "s"} de atraso). Pode confirmar a data do pagamento? Mensagem gerada automaticamente pelo sistema.`,
      });

      await db
        .update(parcelasComissao)
        .set({ cobrancaAtrasoEm: new Date(), status: "vencida" })
        .where(eq(parcelasComissao.id, row.parcela_id));

      construtorasComAtrasoNovo.add(row.construtora_id);
      atrasoCriados++;
    } catch (e) {
      erros.push(
        `parcela ${row.parcela_id} (atraso): ${(e as Error).message}`,
      );
    }
  }

  // Snapshot de score pra construtoras que ganharam atraso novo hoje
  if (construtorasComAtrasoNovo.size > 0) {
    const { snapshotScoreConstrutora } = await import("@/lib/score-snapshot");
    for (const cid of construtorasComAtrasoNovo) {
      await snapshotScoreConstrutora(cid, {
        tipo: "parcela_vencida",
        motivo: `Nova(s) parcela(s) detectada(s) em atraso pelo cron`,
      }).catch((e) =>
        console.error("[score-snapshot] cron cobranca:", e),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    preVencCriados,
    atrasoCriados,
    construtorasSnapshotted: construtorasComAtrasoNovo.size,
    erros,
    timestamp: new Date().toISOString(),
  });
}
