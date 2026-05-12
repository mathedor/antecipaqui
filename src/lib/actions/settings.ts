"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings, fundos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";

const TAXA_MENSAL_KEY = "taxa_mensal";
const TAXA_MENSAL_DEFAULT = 0.06;
const SPREAD_MINIMO_KEY = "spread_minimo_mensal_pct";
const SPREAD_MINIMO_DEFAULT = 0; // 0 = sem mínimo (não bloqueia)

/**
 * Taxa mensal usada na calculadora pública e no cadastro de operação
 * pelo corretor. É a MÉDIA das taxas-base dos fundos ativos cadastrados.
 *
 * Se não houver fundos, fallback pra system_settings.taxa_mensal, que por
 * sua vez tem default 6% a.m.
 *
 * Importante: essa taxa é só uma estimativa. Na aprovação da operação, o
 * admin escolhe o fundo específico (com sua taxa-base) e pode ainda
 * customizar manualmente.
 */
export async function getTaxaMensal(): Promise<number> {
  try {
    // 1. Tenta média dos fundos ativos
    const result = await db
      .select({
        media: sql<string>`COALESCE(AVG(${fundos.taxaMensalBase})::text, '0')`,
        qtd: sql<number>`COUNT(*)::int`,
      })
      .from(fundos)
      .where(eq(fundos.isActive, true));
    const qtd = result[0]?.qtd ?? 0;
    if (qtd > 0) {
      const media = parseFloat(result[0].media);
      if (Number.isFinite(media) && media > 0 && media < 1) return media;
    }

    // 2. Fallback: system_settings
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, TAXA_MENSAL_KEY))
      .limit(1);
    if (!row) return TAXA_MENSAL_DEFAULT;
    const v = parseFloat(row.value);
    if (!Number.isFinite(v) || v <= 0 || v >= 1) return TAXA_MENSAL_DEFAULT;
    return v;
  } catch (e) {
    console.error("[settings] getTaxaMensal failed:", e);
    return TAXA_MENSAL_DEFAULT;
  }
}

/** Spread mínimo permitido por operação. Decimal 0–1 em pontos % mensais
 *  (ex: 0.015 = 1,5%/mês de diferença entre taxa_op e taxa_fundo).
 *  Se taxa_op − taxa_fundo < esse valor, aprovação é bloqueada.
 *  Default 0 = sem bloqueio. */
export async function getSpreadMinimoMensal(): Promise<number> {
  try {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, SPREAD_MINIMO_KEY))
      .limit(1);
    if (!row) return SPREAD_MINIMO_DEFAULT;
    const v = parseFloat(row.value);
    if (!Number.isFinite(v) || v < 0 || v >= 1) return SPREAD_MINIMO_DEFAULT;
    return v;
  } catch (e) {
    console.error("[settings] getSpreadMinimoMensal failed:", e);
    return SPREAD_MINIMO_DEFAULT;
  }
}

export async function getSettingsSnapshot() {
  await requireAdmin();
  const [taxaRow] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, TAXA_MENSAL_KEY))
    .limit(1);
  const [spreadRow] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, SPREAD_MINIMO_KEY))
    .limit(1);

  return {
    taxaMensal: {
      value: taxaRow ? parseFloat(taxaRow.value) : TAXA_MENSAL_DEFAULT,
      updatedAt: taxaRow?.updatedAt ?? null,
      updatedBy: taxaRow?.updatedBy ?? null,
    },
    spreadMinimo: {
      value: spreadRow ? parseFloat(spreadRow.value) : SPREAD_MINIMO_DEFAULT,
      updatedAt: spreadRow?.updatedAt ?? null,
      updatedBy: spreadRow?.updatedBy ?? null,
    },
  };
}

export type UpdateTaxaMensalState =
  | { ok: false; error: string }
  | { ok: true; novaTaxa: number }
  | null;

/**
 * Atualiza a taxa mensal. Aceita input em formato decimal (0.06) ou
 * percentual (6 ou 6,00 ou "6%"). Limita entre 0.005 e 0.20 (0.5%–20%).
 */
export async function updateTaxaMensalAction(
  _prev: UpdateTaxaMensalState,
  formData: FormData,
): Promise<UpdateTaxaMensalState> {
  const admin = await requireAdmin();

  const raw = String(formData.get("taxaMensal") || "").trim();
  if (!raw) return { ok: false, error: "Informe a nova taxa mensal" };

  // Aceita "6", "6,00", "6%", "0.06"
  const normalized = raw
    .replace("%", "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return { ok: false, error: "Valor inválido" };

  // Heurística: se >= 0.5, assume que veio em percentual (ex: 6 → 0.06)
  const taxa = n >= 0.5 ? n / 100 : n;

  if (taxa < 0.005 || taxa > 0.2) {
    return {
      ok: false,
      error: "Taxa fora dos limites permitidos (0,5% a 20% ao mês)",
    };
  }

  await db
    .insert(systemSettings)
    .values({
      key: TAXA_MENSAL_KEY,
      value: String(taxa),
      updatedBy: admin.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: String(taxa),
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin/configuracoes");
  // Calculadora da landing também usa taxa — invalida pra atualizar
  revalidatePath("/");
  revalidatePath("/painel/operacoes/nova");
  return { ok: true, novaTaxa: taxa };
}

export type UpdateSpreadMinimoState =
  | { ok: false; error: string }
  | { ok: true; novoSpread: number }
  | null;

/** Atualiza o spread mínimo mensal exigido pra aprovar uma operação.
 *  Aceita "0", "1,5", "1.5%", "0.015". 0 = sem bloqueio. */
export async function updateSpreadMinimoAction(
  _prev: UpdateSpreadMinimoState,
  formData: FormData,
): Promise<UpdateSpreadMinimoState> {
  const admin = await requireAdmin();

  const raw = String(formData.get("spreadMinimo") || "").trim();
  if (!raw) return { ok: false, error: "Informe o spread mínimo (0 = sem limite)" };

  const normalized = raw
    .replace("%", "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Valor inválido" };

  // Heurística: se >= 0.5, assume percentual (1,5 → 0.015)
  const spread = n >= 0.5 ? n / 100 : n;

  if (spread < 0 || spread > 0.5) {
    return {
      ok: false,
      error: "Spread mínimo fora dos limites (0% a 50% ao mês)",
    };
  }

  await db
    .insert(systemSettings)
    .values({
      key: SPREAD_MINIMO_KEY,
      value: String(spread),
      updatedBy: admin.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: String(spread),
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin/configuracoes");
  return { ok: true, novoSpread: spread };
}
