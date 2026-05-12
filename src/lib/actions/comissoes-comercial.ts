"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  comerciais,
  comissoesComercial,
  operacoes,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

export type ComissaoItem = {
  id: string;
  operacaoId: string;
  operacaoNumero: string;
  comercialId: string;
  comercialNome: string | null;
  valorDevido: number;
  valorPago: number;
  status: "pendente" | "paga" | "cancelada";
  geradaEm: Date;
  pagaEm: Date | null;
};

export async function listComissoesComercial(filters?: {
  comercialId?: string;
  status?: ComissaoItem["status"];
}): Promise<ComissaoItem[]> {
  await requireAdmin();

  const conds = [];
  if (filters?.comercialId)
    conds.push(eq(comissoesComercial.comercialId, filters.comercialId));
  if (filters?.status) conds.push(eq(comissoesComercial.status, filters.status));

  const rows = await db
    .select({
      id: comissoesComercial.id,
      operacaoId: comissoesComercial.operacaoId,
      operacaoNumero: operacoes.numero,
      comercialId: comissoesComercial.comercialId,
      comercialApelido: comerciais.apelido,
      comercialNome: comerciais.nomeCompleto,
      valorDevido: comissoesComercial.valorDevido,
      valorPago: comissoesComercial.valorPago,
      status: comissoesComercial.status,
      geradaEm: comissoesComercial.geradaEm,
      pagaEm: comissoesComercial.pagaEm,
    })
    .from(comissoesComercial)
    .innerJoin(operacoes, eq(comissoesComercial.operacaoId, operacoes.id))
    .leftJoin(comerciais, eq(comissoesComercial.comercialId, comerciais.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(comissoesComercial.geradaEm));

  return rows.map((r) => ({
    id: r.id,
    operacaoId: r.operacaoId,
    operacaoNumero: r.operacaoNumero,
    comercialId: r.comercialId,
    comercialNome: r.comercialApelido ?? r.comercialNome,
    valorDevido: parseFloat(r.valorDevido),
    valorPago: parseFloat(r.valorPago),
    status: r.status,
    geradaEm: r.geradaEm,
    pagaEm: r.pagaEm,
  }));
}

/** Gera (ou atualiza, se status pendente) a row de comissão pra uma op.
 *  Chamado pelo status-flow no momento da aprovação. */
export async function upsertComissaoParaOperacao(input: {
  operacaoId: string;
  comercialId: string;
  spread: number; // R$ — max(0, juros − custo_dinheiro)
}): Promise<void> {
  // Fórmula: (spread / 2) × 0.82 × 0.10 = spread × 0.041
  const valorDevido = Math.max(0, input.spread) * 0.041;
  const valorStr = valorDevido.toFixed(2);

  // Tenta atualizar se já existe E está pendente, senão insere
  const [existente] = await db
    .select({ id: comissoesComercial.id, status: comissoesComercial.status })
    .from(comissoesComercial)
    .where(eq(comissoesComercial.operacaoId, input.operacaoId))
    .limit(1);

  if (!existente) {
    await db
      .insert(comissoesComercial)
      .values({
        operacaoId: input.operacaoId,
        comercialId: input.comercialId,
        valorDevido: valorStr,
      })
      .onConflictDoNothing();
  } else if (existente.status === "pendente") {
    await db
      .update(comissoesComercial)
      .set({ valorDevido: valorStr, updatedAt: new Date() })
      .where(eq(comissoesComercial.id, existente.id));
  }
  // Se já pagou, deixa quieto (snapshot do valor pago)
}

export type MarcarComissaoPagaState =
  | { ok: false; error: string }
  | { ok: true; status: ComissaoItem["status"] }
  | null;

export async function marcarComissaoPagaAction(
  _prev: MarcarComissaoPagaState,
  formData: FormData,
): Promise<MarcarComissaoPagaState> {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const valorRaw = String(formData.get("valorPago") || "").trim();
  if (!id) return { ok: false, error: "ID inválido" };
  const valorPagoNovo = parseFloat(
    valorRaw.replace(/\./g, "").replace(",", "."),
  );
  if (!Number.isFinite(valorPagoNovo) || valorPagoNovo < 0)
    return { ok: false, error: "Valor inválido" };

  const [c] = await db
    .select()
    .from(comissoesComercial)
    .where(eq(comissoesComercial.id, id))
    .limit(1);
  if (!c) return { ok: false, error: "Comissão não encontrada" };

  const devido = parseFloat(c.valorDevido);
  const novoStatus: ComissaoItem["status"] =
    valorPagoNovo >= devido ? "paga" : "pendente";
  const pagaEm = novoStatus === "paga" ? new Date() : c.pagaEm;

  await db
    .update(comissoesComercial)
    .set({
      valorPago: valorPagoNovo.toFixed(2),
      status: novoStatus,
      pagaEm,
      updatedAt: new Date(),
    })
    .where(eq(comissoesComercial.id, id));

  await audit({
    action: "comissao_pagamento",
    targetType: "comissao_comercial",
    targetId: id,
    metadata: { valorPago: valorPagoNovo, status: novoStatus },
  });

  revalidatePath("/admin/comerciais/comissoes");
  return { ok: true, status: novoStatus };
}

/** Resumo pro dashboard do comercial: total a receber, recebido, pendente. */
export async function getComissoesResumoPorComercial(comercialId: string) {
  await requireAdmin();
  const [row] = await db
    .select({
      totalDevido: sql<string>`COALESCE(SUM(${comissoesComercial.valorDevido})::text, '0')`,
      totalPago: sql<string>`COALESCE(SUM(${comissoesComercial.valorPago})::text, '0')`,
      qtdPendente: sql<number>`COUNT(*) FILTER (WHERE ${comissoesComercial.status} = 'pendente')::int`,
      qtdPaga: sql<number>`COUNT(*) FILTER (WHERE ${comissoesComercial.status} = 'paga')::int`,
    })
    .from(comissoesComercial)
    .where(eq(comissoesComercial.comercialId, comercialId));
  const devido = parseFloat(row?.totalDevido ?? "0");
  const pago = parseFloat(row?.totalPago ?? "0");
  return {
    totalDevido: devido,
    totalPago: pago,
    aReceber: Math.max(0, devido - pago),
    qtdPendente: row?.qtdPendente ?? 0,
    qtdPaga: row?.qtdPaga ?? 0,
  };
}
