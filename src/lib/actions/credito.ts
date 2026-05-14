"use server";

import crypto from "node:crypto";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { consultasCredito } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";

const CACHE_DIAS = 30;

export type ConsultaCreditoResultado = {
  documento: string;
  tipoPessoa: "pf" | "pj";
  provedor: string;
  score: number; // 0-1000
  risco: "baixo" | "medio" | "alto" | "critico";
  restricoes: number;
  consultadoEm: Date;
  cached: boolean;
};

/** Stub provider: gera score determinístico baseado em hash do documento.
 *  Substituir pela integração real (Serasa/Boa Vista) quando contratada. */
function stubProvider(documento: string): Omit<
  ConsultaCreditoResultado,
  "documento" | "tipoPessoa" | "consultadoEm" | "cached"
> {
  const hash = crypto.createHash("sha256").update(documento).digest();
  const score = hash[0] * 4; // 0-1020, vai limitar
  const finalScore = Math.min(1000, score);
  const restricoes = hash[1] % 4; // 0-3
  let risco: ConsultaCreditoResultado["risco"];
  if (restricoes >= 2 || finalScore < 250) risco = "critico";
  else if (finalScore < 500) risco = "alto";
  else if (finalScore < 750) risco = "medio";
  else risco = "baixo";
  return {
    provedor: "stub",
    score: finalScore,
    risco,
    restricoes,
  };
}

/** Consulta crédito de um documento (CPF ou CNPJ). Usa cache de 30 dias.
 *  Admin/fundo podem solicitar. */
export async function consultarCredito(
  documento: string,
  opts?: { operacaoId?: string; forceRefresh?: boolean },
): Promise<
  | { ok: true; data: ConsultaCreditoResultado }
  | { ok: false; error: string }
> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "admin" && user.role !== "fundo")
    return { ok: false, error: "Apenas admin ou fundo" };

  const doc = documento.replace(/\D/g, "");
  if (doc.length !== 11 && doc.length !== 14)
    return { ok: false, error: "Documento inválido (precisa CPF ou CNPJ)" };

  const tipoPessoa: "pf" | "pj" = doc.length === 11 ? "pf" : "pj";

  // Cache lookup
  if (!opts?.forceRefresh) {
    const cutoff = new Date(Date.now() - CACHE_DIAS * 24 * 3600 * 1000);
    const [cached] = await db
      .select()
      .from(consultasCredito)
      .where(
        and(
          eq(consultasCredito.documento, doc),
          gt(consultasCredito.consultadoEm, cutoff),
        ),
      )
      .orderBy(desc(consultasCredito.consultadoEm))
      .limit(1);
    if (cached) {
      return {
        ok: true,
        data: {
          documento: doc,
          tipoPessoa,
          provedor: cached.provedor,
          score: cached.score,
          risco: cached.risco as ConsultaCreditoResultado["risco"],
          restricoes: cached.restricoes,
          consultadoEm: cached.consultadoEm,
          cached: true,
        },
      };
    }
  }

  // Provedor real seria chamado aqui. Por enquanto stub.
  const stubResult = stubProvider(doc);
  const consultadoEm = new Date();

  await db.insert(consultasCredito).values({
    documento: doc,
    tipoPessoa,
    provedor: stubResult.provedor,
    score: stubResult.score,
    risco: stubResult.risco,
    restricoes: stubResult.restricoes,
    payload: { stub: true },
    solicitadoPorUserId: user.id,
    operacaoId: opts?.operacaoId ?? null,
  });

  return {
    ok: true,
    data: {
      documento: doc,
      tipoPessoa,
      ...stubResult,
      consultadoEm,
      cached: false,
    },
  };
}

/** Lista consultas anteriores de um documento. */
export async function historicoCredito(documento: string) {
  const user = await getCurrentDbUser();
  if (!user || (user.role !== "admin" && user.role !== "fundo")) return [];
  const doc = documento.replace(/\D/g, "");
  return db
    .select()
    .from(consultasCredito)
    .where(eq(consultasCredito.documento, doc))
    .orderBy(desc(consultasCredito.consultadoEm))
    .limit(10);
}
