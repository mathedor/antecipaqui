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
const CDI_MENSAL_KEY = "cdi_mensal_pct";
const CDI_MENSAL_DEFAULT = 0.0085; // SELIC ≈ 11,25%a.a. → CDI ≈ 10,65%a.a. → 0,85%/m
const SCORE_PESO_VENCIDA_KEY = "score_peso_vencida";
const SCORE_PESO_VENCIDA_DEFAULT = 5;
const SCORE_PESO_VENCIDA_GRAVE_KEY = "score_peso_vencida_grave";
const SCORE_PESO_VENCIDA_GRAVE_DEFAULT = 10;
const SCORE_DIAS_GRAVE_KEY = "score_dias_grave";
const SCORE_DIAS_GRAVE_DEFAULT = 30;

/**
 * Taxa mensal usada na calculadora pública e no cadastro de operação
 * pelo corretor. É a MÉDIA da TAXA DE OPERAÇÃO (valor da operação cobrado do
 * cliente — `taxaOperacaoPadrao`) dos fundos ativos. NÃO usar `taxaMensalBase`
 * aqui: aquela é o CUSTO DO DINHEIRO do fundo (taxa_fundo), bem menor que a
 * taxa de operação — usá-la subestima o deságio no simulador.
 *
 * Se não houver fundos, fallback pra system_settings.taxa_mensal, que por
 * sua vez tem default 6% a.m.
 *
 * Importante: essa taxa é só uma estimativa. Na aprovação da operação, o
 * admin escolhe o fundo específico e pode ainda customizar manualmente.
 */
export async function getTaxaMensal(): Promise<number> {
  try {
    // 1. Tenta média da taxa de operação dos fundos ativos
    const result = await db
      .select({
        media: sql<string>`COALESCE(AVG(${fundos.taxaOperacaoPadrao})::text, '0')`,
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

/** CDI estimado ao mês (decimal). Usado como benchmark do fundo. */
export async function getCdiMensal(): Promise<number> {
  try {
    const [row] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, CDI_MENSAL_KEY))
      .limit(1);
    if (!row) return CDI_MENSAL_DEFAULT;
    const v = parseFloat(row.value);
    if (!Number.isFinite(v) || v <= 0 || v >= 0.1) return CDI_MENSAL_DEFAULT;
    return v;
  } catch (e) {
    console.error("[settings] getCdiMensal failed:", e);
    return CDI_MENSAL_DEFAULT;
  }
}

export type ScoreParams = {
  pesoVencida: number;
  pesoVencidaGrave: number;
  diasGrave: number;
};

/** Pesos e janela do score de construtoras/imobiliárias/corretores. */
export async function getScoreParams(): Promise<ScoreParams> {
  try {
    const rows = await db
      .select()
      .from(systemSettings)
      .where(
        sql`${systemSettings.key} IN (${SCORE_PESO_VENCIDA_KEY}, ${SCORE_PESO_VENCIDA_GRAVE_KEY}, ${SCORE_DIAS_GRAVE_KEY})`,
      );
    const map = new Map(rows.map((r) => [r.key, parseFloat(r.value)]));
    const pesoVencida = map.get(SCORE_PESO_VENCIDA_KEY);
    const pesoVencidaGrave = map.get(SCORE_PESO_VENCIDA_GRAVE_KEY);
    const diasGrave = map.get(SCORE_DIAS_GRAVE_KEY);
    return {
      pesoVencida:
        Number.isFinite(pesoVencida) && pesoVencida! > 0
          ? pesoVencida!
          : SCORE_PESO_VENCIDA_DEFAULT,
      pesoVencidaGrave:
        Number.isFinite(pesoVencidaGrave) && pesoVencidaGrave! > 0
          ? pesoVencidaGrave!
          : SCORE_PESO_VENCIDA_GRAVE_DEFAULT,
      diasGrave:
        Number.isFinite(diasGrave) && diasGrave! > 0
          ? diasGrave!
          : SCORE_DIAS_GRAVE_DEFAULT,
    };
  } catch (e) {
    console.error("[settings] getScoreParams failed:", e);
    return {
      pesoVencida: SCORE_PESO_VENCIDA_DEFAULT,
      pesoVencidaGrave: SCORE_PESO_VENCIDA_GRAVE_DEFAULT,
      diasGrave: SCORE_DIAS_GRAVE_DEFAULT,
    };
  }
}

export async function getSettingsSnapshot() {
  await requireAdmin();
  const rows = await db.select().from(systemSettings);
  const map = new Map(rows.map((r) => [r.key, r]));

  const read = (key: string, fallback: number) => {
    const row = map.get(key);
    return {
      value: row ? parseFloat(row.value) : fallback,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  };

  return {
    taxaMensal: read(TAXA_MENSAL_KEY, TAXA_MENSAL_DEFAULT),
    spreadMinimo: read(SPREAD_MINIMO_KEY, SPREAD_MINIMO_DEFAULT),
    cdiMensal: read(CDI_MENSAL_KEY, CDI_MENSAL_DEFAULT),
    scorePesoVencida: read(
      SCORE_PESO_VENCIDA_KEY,
      SCORE_PESO_VENCIDA_DEFAULT,
    ),
    scorePesoVencidaGrave: read(
      SCORE_PESO_VENCIDA_GRAVE_KEY,
      SCORE_PESO_VENCIDA_GRAVE_DEFAULT,
    ),
    scoreDiasGrave: read(SCORE_DIAS_GRAVE_KEY, SCORE_DIAS_GRAVE_DEFAULT),
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

export type UpdateCdiState =
  | { ok: false; error: string }
  | { ok: true; novoCdi: number }
  | null;

/** Atualiza o CDI mensal usado como benchmark de rentabilidade do fundo.
 *  Aceita "0.85", "0,85", "0.85%", "0.0085". */
export async function updateCdiAction(
  _prev: UpdateCdiState,
  formData: FormData,
): Promise<UpdateCdiState> {
  const admin = await requireAdmin();

  const raw = String(formData.get("cdiMensal") || "").trim();
  if (!raw) return { ok: false, error: "Informe o CDI mensal" };

  const normalized = raw
    .replace("%", "")
    .replace(/\s+/g, "")
    .replace(",", ".");
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n <= 0)
    return { ok: false, error: "Valor inválido" };

  // Heurística: se >= 0.1, assume percentual (0,85 → 0.0085)
  const cdi = n >= 0.1 ? n / 100 : n;

  if (cdi <= 0 || cdi >= 0.05) {
    return {
      ok: false,
      error: "CDI fora dos limites permitidos (0% a 5% ao mês)",
    };
  }

  await db
    .insert(systemSettings)
    .values({
      key: CDI_MENSAL_KEY,
      value: String(cdi),
      updatedBy: admin.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: String(cdi),
        updatedBy: admin.id,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/admin/configuracoes");
  revalidatePath("/painel");
  return { ok: true, novoCdi: cdi };
}

export type UpdateScoreParamsState =
  | { ok: false; error: string }
  | {
      ok: true;
      pesoVencida: number;
      pesoVencidaGrave: number;
      diasGrave: number;
    }
  | null;

/** Atualiza pesos e janela do score. Todos os campos obrigatórios. */
export async function updateScoreParamsAction(
  _prev: UpdateScoreParamsState,
  formData: FormData,
): Promise<UpdateScoreParamsState> {
  const admin = await requireAdmin();

  const parse = (k: string) => {
    const raw = String(formData.get(k) || "").trim().replace(",", ".");
    return parseFloat(raw);
  };
  const pesoVencida = parse("pesoVencida");
  const pesoVencidaGrave = parse("pesoVencidaGrave");
  const diasGrave = parse("diasGrave");

  if (![pesoVencida, pesoVencidaGrave, diasGrave].every(Number.isFinite)) {
    return { ok: false, error: "Preencha todos os campos com números válidos" };
  }
  if (pesoVencida <= 0 || pesoVencida > 50) {
    return { ok: false, error: "Peso de vencida fora dos limites (1 a 50)" };
  }
  if (pesoVencidaGrave <= 0 || pesoVencidaGrave > 50) {
    return {
      ok: false,
      error: "Peso de vencida grave fora dos limites (1 a 50)",
    };
  }
  if (diasGrave < 1 || diasGrave > 180) {
    return {
      ok: false,
      error: "Dias pra atraso grave fora dos limites (1 a 180)",
    };
  }

  const upsert = async (key: string, value: number) => {
    await db
      .insert(systemSettings)
      .values({
        key,
        value: String(value),
        updatedBy: admin.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value: String(value),
          updatedBy: admin.id,
          updatedAt: new Date(),
        },
      });
  };

  await upsert(SCORE_PESO_VENCIDA_KEY, pesoVencida);
  await upsert(SCORE_PESO_VENCIDA_GRAVE_KEY, pesoVencidaGrave);
  await upsert(SCORE_DIAS_GRAVE_KEY, diasGrave);

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/decidir");
  revalidatePath("/admin/risco-global");
  revalidatePath("/painel/risco");
  return { ok: true, pesoVencida, pesoVencidaGrave, diasGrave };
}
