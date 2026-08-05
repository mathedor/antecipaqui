"use server";

import { revalidatePath } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { custosOperacao, fundoCustosPadrao } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";

/** Custos padrão cadastrados por fundo. Quando admin seleciona o fundo numa
 *  operação, esses custos são clonados pra custos_operacao. */
export async function listCustosPadraoFundo(fundoId: string) {
  await requireAdmin();
  return db
    .select()
    .from(fundoCustosPadrao)
    .where(eq(fundoCustosPadrao.fundoId, fundoId))
    .orderBy(asc(fundoCustosPadrao.ordem), asc(fundoCustosPadrao.createdAt));
}

export type UpsertCustoPadraoState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

export async function upsertCustoPadraoAction(
  _prev: UpsertCustoPadraoState,
  formData: FormData,
): Promise<UpsertCustoPadraoState> {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const fundoId = String(formData.get("fundoId") || "").trim();
  const titulo = String(formData.get("titulo") || "").trim();
  const valorRaw = String(formData.get("valor") || "").trim();
  const ordemRaw = String(formData.get("ordem") || "0").trim();

  if (!fundoId) return { ok: false, error: "fundoId obrigatório" };
  if (!titulo) return { ok: false, error: "Informe o título do custo" };

  const valor = parseBRLNumber(valorRaw);
  if (!Number.isFinite(valor) || valor <= 0)
    return { ok: false, error: "Valor inválido" };

  const ordem = parseInt(ordemRaw, 10) || 0;

  if (id) {
    await db
      .update(fundoCustosPadrao)
      .set({
        titulo,
        valor: valor.toFixed(2),
        ordem,
        updatedAt: new Date(),
      })
      .where(eq(fundoCustosPadrao.id, id));
    revalidatePath(`/admin/fundos/${fundoId}/editar`);
    return { ok: true, id };
  }

  const [created] = await db
    .insert(fundoCustosPadrao)
    .values({
      fundoId,
      titulo,
      valor: valor.toFixed(2),
      ordem,
    })
    .returning();
  revalidatePath(`/admin/fundos/${fundoId}/editar`);
  return { ok: true, id: created.id };
}

export async function deleteCustoPadraoAction(id: string, fundoId: string) {
  await requireAdmin();
  await db.delete(fundoCustosPadrao).where(eq(fundoCustosPadrao.id, id));
  revalidatePath(`/admin/fundos/${fundoId}/editar`);
}

/** Clona os custos padrão do fundo na operação. Chamado quando admin vincula
 *  fundo a uma operação (status-flow). Skip se a operação já tem custos
 *  (não sobrescreve trabalho prévio). */
export async function cloneCustosPadraoForOperacao(
  fundoId: string,
  operacaoId: string,
  createdByUserId: string,
): Promise<{ clonados: number; skipped: boolean }> {
  const jaTem = await db
    .select({ id: custosOperacao.id })
    .from(custosOperacao)
    .where(eq(custosOperacao.operacaoId, operacaoId))
    .limit(1);
  if (jaTem.length > 0) return { clonados: 0, skipped: true };

  const padroes = await db
    .select()
    .from(fundoCustosPadrao)
    .where(eq(fundoCustosPadrao.fundoId, fundoId))
    .orderBy(asc(fundoCustosPadrao.ordem), asc(fundoCustosPadrao.createdAt));
  if (padroes.length === 0) return { clonados: 0, skipped: false };

  await db.insert(custosOperacao).values(
    padroes.map((p) => ({
      operacaoId,
      titulo: p.titulo,
      valor: p.valor,
      createdByUserId,
    })),
  );
  return { clonados: padroes.length, skipped: false };
}

function parseBRLNumber(s: string): number {
  if (!s) return 0;
  // Aceita "1.234,56", "1234,56", "1234.56", "1234"
  const cleaned = s
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  return parseFloat(cleaned);
}
