"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { custosOperacao } from "@/db/schema";

/** Lista os custos cadastrados de uma operação, ordenados por criação. */
export async function listCustosOperacao(operacaoId: string) {
  return db
    .select()
    .from(custosOperacao)
    .where(eq(custosOperacao.operacaoId, operacaoId))
    .orderBy(custosOperacao.createdAt);
}

/** Soma total dos custos de uma operação (em number, BRL). */
export async function sumCustosOperacao(operacaoId: string) {
  const rows = await listCustosOperacao(operacaoId);
  return rows.reduce((s, c) => s + parseFloat(c.valor), 0);
}
