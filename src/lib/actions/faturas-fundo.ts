"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { faturasFundo, fundos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { getInvoiceData } from "@/lib/actions/invoice";
import { audit } from "@/lib/audit";

export type FaturaFundoListItem = {
  id: string;
  fundoId: string;
  fundoNome: string | null;
  refMes: string;
  valorDevido: number;
  valorPago: number;
  status: "pendente" | "parcial" | "paga" | "vencida" | "cancelada";
  emitidaEm: Date;
  vencimento: string | null;
  pagaEm: Date | null;
};

/** Lista faturas do fundo (todas, paginação simples). */
export async function listFaturasFundo(filters?: {
  fundoId?: string;
  status?: FaturaFundoListItem["status"];
}): Promise<FaturaFundoListItem[]> {
  await requireAdmin();

  const conds = [];
  if (filters?.fundoId) conds.push(eq(faturasFundo.fundoId, filters.fundoId));
  if (filters?.status) conds.push(eq(faturasFundo.status, filters.status));

  const rows = await db
    .select({
      id: faturasFundo.id,
      fundoId: faturasFundo.fundoId,
      fundoRazao: fundos.razaoSocial,
      fundoFantasia: fundos.nomeFantasia,
      refMes: faturasFundo.refMes,
      valorDevido: faturasFundo.valorDevido,
      valorPago: faturasFundo.valorPago,
      status: faturasFundo.status,
      emitidaEm: faturasFundo.emitidaEm,
      vencimento: faturasFundo.vencimento,
      pagaEm: faturasFundo.pagaEm,
    })
    .from(faturasFundo)
    .leftJoin(fundos, eq(faturasFundo.fundoId, fundos.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(faturasFundo.refMes), desc(faturasFundo.emitidaEm));

  return rows.map((r) => ({
    id: r.id,
    fundoId: r.fundoId,
    fundoNome: r.fundoFantasia ?? r.fundoRazao,
    refMes: r.refMes,
    valorDevido: parseFloat(r.valorDevido),
    valorPago: parseFloat(r.valorPago),
    status: r.status,
    emitidaEm: r.emitidaEm,
    vencimento: r.vencimento,
    pagaEm: r.pagaEm,
  }));
}

export type GerarFaturasState =
  | { ok: false; error: string }
  | { ok: true; criadas: number; total: number }
  | null;

/** Gera (ou atualiza) faturas pra todos os fundos com repasse devido no mês.
 *  refMes formato YYYY-MM. Idempotente: faturas já pagas/parciais não são
 *  sobrescritas — só atualiza valorDevido das pendentes. */
export async function gerarFaturasDoMesAction(
  _prev: GerarFaturasState,
  formData: FormData,
): Promise<GerarFaturasState> {
  const admin = await requireAdmin();

  const refMes = String(formData.get("refMes") || "").trim();
  if (!/^\d{4}-\d{2}$/.test(refMes))
    return { ok: false, error: "Mês de referência inválido (use YYYY-MM)" };
  const vencimentoStr = String(formData.get("vencimento") || "").trim();
  const vencimento = /^\d{4}-\d{2}-\d{2}$/.test(vencimentoStr)
    ? vencimentoStr
    : null;

  const [ano, mes] = refMes.split("-").map(Number);
  const from = `${refMes}-01`;
  const lastDay = new Date(ano, mes, 0).getDate();
  const to = `${refMes}-${String(lastDay).padStart(2, "0")}`;

  // Pega o invoice completo do mês (sem filtro de fundo)
  const invoice = await getInvoiceData({ periodo: "custom", from, to });

  // Agrupa por fundo
  const porFundo = new Map<
    string,
    { valorDevido: number; qtdOps: number }
  >();
  for (const r of invoice.rows) {
    if (!r.fundoId) continue;
    const cur = porFundo.get(r.fundoId);
    if (cur) {
      cur.valorDevido += r.saldoRepasse;
      cur.qtdOps += 1;
    } else {
      porFundo.set(r.fundoId, {
        valorDevido: r.saldoRepasse,
        qtdOps: 1,
      });
    }
  }

  let criadas = 0;
  for (const [fundoId, dados] of porFundo) {
    if (dados.valorDevido <= 0) continue;
    // Tenta inserir; se já existe pra (fundo, refMes), faz upsert SÓ se
    // ainda estiver pendente — protege faturas já pagas.
    const valor = dados.valorDevido.toFixed(2);
    const existente = await db
      .select({
        id: faturasFundo.id,
        status: faturasFundo.status,
      })
      .from(faturasFundo)
      .where(
        and(
          eq(faturasFundo.fundoId, fundoId),
          eq(faturasFundo.refMes, refMes),
        ),
      )
      .limit(1);

    if (existente.length === 0) {
      await db.insert(faturasFundo).values({
        fundoId,
        refMes,
        valorDevido: valor,
        vencimento,
        geradaPorUserId: admin.id,
      });
      criadas += 1;
      await audit({
        action: "fatura_fundo_gerada",
        targetType: "fatura_fundo",
        metadata: { fundoId, refMes, valor: dados.valorDevido },
      });
    } else if (existente[0].status === "pendente") {
      await db
        .update(faturasFundo)
        .set({
          valorDevido: valor,
          updatedAt: new Date(),
          vencimento: vencimento ?? undefined,
        })
        .where(eq(faturasFundo.id, existente[0].id));
    }
    // Se já pagou ou cancelou, deixa quieto.
  }

  revalidatePath("/admin/faturas");
  revalidatePath("/admin/interno/invoice");
  return { ok: true, criadas, total: porFundo.size };
}

export type MarcarFaturaPagaState =
  | { ok: false; error: string }
  | { ok: true; status: FaturaFundoListItem["status"] }
  | null;

/** Registra pagamento (total ou parcial) de uma fatura. */
export async function marcarFaturaPagaAction(
  _prev: MarcarFaturaPagaState,
  formData: FormData,
): Promise<MarcarFaturaPagaState> {
  await requireAdmin();

  const id = String(formData.get("id") || "").trim();
  const valorRaw = String(formData.get("valorPago") || "").trim();
  if (!id) return { ok: false, error: "ID da fatura inválido" };
  const valorPagoNovo = parseFloat(valorRaw.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(valorPagoNovo) || valorPagoNovo < 0)
    return { ok: false, error: "Valor pago inválido" };

  const [fatura] = await db
    .select()
    .from(faturasFundo)
    .where(eq(faturasFundo.id, id))
    .limit(1);
  if (!fatura) return { ok: false, error: "Fatura não encontrada" };

  const devido = parseFloat(fatura.valorDevido);
  const novoValorPago = valorPagoNovo;
  let novoStatus: FaturaFundoListItem["status"] = "pendente";
  let pagaEm: Date | null = null;
  if (novoValorPago >= devido) {
    novoStatus = "paga";
    pagaEm = new Date();
  } else if (novoValorPago > 0) {
    novoStatus = "parcial";
  }

  await db
    .update(faturasFundo)
    .set({
      valorPago: novoValorPago.toFixed(2),
      status: novoStatus,
      pagaEm: pagaEm ?? fatura.pagaEm,
      updatedAt: new Date(),
    })
    .where(eq(faturasFundo.id, id));

  await audit({
    action: "fatura_fundo_pagamento",
    targetType: "fatura_fundo",
    targetId: id,
    metadata: { valorPago: novoValorPago, status: novoStatus },
  });

  revalidatePath("/admin/faturas");
  return { ok: true, status: novoStatus };
}

/** Marca faturas vencidas (cron-ish — pode chamar no carregamento da página) */
export async function marcarFaturasVencidas(): Promise<number> {
  await requireAdmin();
  const result = await db.execute(sql`
    UPDATE faturas_fundo
    SET status = 'vencida', updated_at = NOW()
    WHERE status IN ('pendente', 'parcial')
      AND vencimento IS NOT NULL
      AND vencimento < CURRENT_DATE
  `);
  return (result as { rowCount?: number }).rowCount ?? 0;
}
