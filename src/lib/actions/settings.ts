"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";

const TAXA_MENSAL_KEY = "taxa_mensal";
const TAXA_MENSAL_DEFAULT = 0.06;

/**
 * Lê a taxa mensal atual do DB. Retorna o default 0.06 (6%) se ainda
 * não tiver valor configurado.
 */
export async function getTaxaMensal(): Promise<number> {
  try {
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

export async function getSettingsSnapshot() {
  await requireAdmin();
  const [taxaRow] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, TAXA_MENSAL_KEY))
    .limit(1);

  return {
    taxaMensal: {
      value: taxaRow ? parseFloat(taxaRow.value) : TAXA_MENSAL_DEFAULT,
      updatedAt: taxaRow?.updatedAt ?? null,
      updatedBy: taxaRow?.updatedBy ?? null,
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
