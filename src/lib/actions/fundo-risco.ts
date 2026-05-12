"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { fundoBlacklist } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";
import { getCurrentFundo } from "@/lib/actions/fundos";

const CONCENTRACAO_LIMITE_DEFAULT = 0.25; // 25% — alerta acima disso
const CONCENTRACAO_LIMITE_CRITICO = 0.4; // 40% — crítico

export type ConcentracaoItem = {
  id: string;
  nome: string;
  valorOperado: number; // soma do VP das ops ativas
  qtdOps: number;
  pct: number; // 0–1
  status: "ok" | "alerta" | "critico";
};

export type DevedoraItem = {
  construtoraId: string;
  construtoraNome: string;
  parcelasVencidas: number;
  valorVencido: number;
  diasMedioAtraso: number;
  ultimaParcelaPaga: string | null; // YYYY-MM-DD
  blacklisted: boolean;
};

export type FundoRiscoPayload = {
  capitalExposto: number;
  porConstrutora: ConcentracaoItem[];
  porImobiliaria: ConcentracaoItem[];
  porUf: ConcentracaoItem[];
  devedoras: DevedoraItem[];
  blacklist: Array<{
    construtoraId: string;
    construtoraNome: string;
    motivo: string | null;
    createdAt: Date;
  }>;
};

/** Status do nível de concentração baseado no % do capital exposto. */
function statusConc(pct: number): ConcentracaoItem["status"] {
  if (pct >= CONCENTRACAO_LIMITE_CRITICO) return "critico";
  if (pct >= CONCENTRACAO_LIMITE_DEFAULT) return "alerta";
  return "ok";
}

export async function getFundoRisco(): Promise<FundoRiscoPayload | null> {
  const fundo = await getCurrentFundo();
  if (!fundo) return null;

  // 1. Capital exposto (VP de ops ativas: pre_aprovada → realizada)
  const statusAtivos = sql`('pre_aprovada','analise_final','enviada_para_assinatura','enviada_para_pagamento','realizada')`;

  // Concentração por construtora (soma do VP das ops ativas + qtd)
  const concConstrutora = await db.execute(sql`
    SELECT
      c.id::text AS id,
      COALESCE(c.nome_fantasia, c.razao_social) AS nome,
      COALESCE(SUM(o.valor_presente)::float, 0) AS valor_operado,
      COUNT(o.id)::int AS qtd
    FROM operacoes o
    INNER JOIN construtoras c ON c.id = o.construtora_id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND o.status IN ${statusAtivos}
    GROUP BY c.id, c.nome_fantasia, c.razao_social
    ORDER BY valor_operado DESC
  `);
  const rowsConstr = (
    concConstrutora as unknown as {
      rows: { id: string; nome: string; valor_operado: number; qtd: number }[];
    }
  ).rows ?? [];

  const capitalExposto = rowsConstr.reduce((s, r) => s + r.valor_operado, 0);

  const porConstrutora: ConcentracaoItem[] = rowsConstr.map((r) => {
    const pct = capitalExposto > 0 ? r.valor_operado / capitalExposto : 0;
    return {
      id: r.id,
      nome: r.nome,
      valorOperado: r.valor_operado,
      qtdOps: r.qtd,
      pct,
      status: statusConc(pct),
    };
  });

  // Concentração por imobiliária
  const concImob = await db.execute(sql`
    SELECT
      im.id::text AS id,
      COALESCE(im.nome_fantasia, im.razao_social) AS nome,
      COALESCE(SUM(o.valor_presente)::float, 0) AS valor_operado,
      COUNT(o.id)::int AS qtd
    FROM operacoes o
    INNER JOIN imobiliarias im ON im.id = o.imobiliaria_id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND o.status IN ${statusAtivos}
    GROUP BY im.id, im.nome_fantasia, im.razao_social
    ORDER BY valor_operado DESC
  `);
  const rowsImob = (
    concImob as unknown as {
      rows: { id: string; nome: string; valor_operado: number; qtd: number }[];
    }
  ).rows ?? [];
  const porImobiliaria: ConcentracaoItem[] = rowsImob.map((r) => {
    const pct = capitalExposto > 0 ? r.valor_operado / capitalExposto : 0;
    return {
      id: r.id,
      nome: r.nome,
      valorOperado: r.valor_operado,
      qtdOps: r.qtd,
      pct,
      status: statusConc(pct),
    };
  });

  // Concentração por UF (da construtora)
  const concUf = await db.execute(sql`
    SELECT
      COALESCE(c.uf, '?') AS id,
      COALESCE(c.uf, '?') AS nome,
      COALESCE(SUM(o.valor_presente)::float, 0) AS valor_operado,
      COUNT(o.id)::int AS qtd
    FROM operacoes o
    INNER JOIN construtoras c ON c.id = o.construtora_id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND o.status IN ${statusAtivos}
    GROUP BY c.uf
    ORDER BY valor_operado DESC
  `);
  const rowsUf = (
    concUf as unknown as {
      rows: { id: string; nome: string; valor_operado: number; qtd: number }[];
    }
  ).rows ?? [];
  const porUf: ConcentracaoItem[] = rowsUf.map((r) => {
    const pct = capitalExposto > 0 ? r.valor_operado / capitalExposto : 0;
    return {
      id: r.id,
      nome: r.nome,
      valorOperado: r.valor_operado,
      qtdOps: r.qtd,
      pct,
      status: statusConc(pct),
    };
  });

  // 2. Ranking de devedoras — parcelas vencidas por construtora + dias médios
  const devedorasRes = await db.execute(sql`
    SELECT
      c.id::text AS construtora_id,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      COUNT(p.id)::int AS parcelas_vencidas,
      COALESCE(SUM(p.valor)::float, 0) AS valor_vencido,
      COALESCE(AVG(EXTRACT(DAY FROM CURRENT_DATE - p.vencimento))::float, 0)
        AS dias_medio_atraso,
      (
        SELECT MAX(pp.pago_em)::text
        FROM parcelas_comissao pp
        INNER JOIN operacoes oo ON oo.id = pp.operacao_id
        WHERE oo.fundo_id = ${fundo.id}::uuid
          AND oo.construtora_id = c.id
          AND pp.status = 'paga'
      ) AS ultima_paga,
      EXISTS (
        SELECT 1 FROM fundo_blacklist b
        WHERE b.fundo_id = ${fundo.id}::uuid
          AND b.construtora_id = c.id
      ) AS blacklisted
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    INNER JOIN construtoras c ON c.id = o.construtora_id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND p.status = 'vencida'
    GROUP BY c.id, c.nome_fantasia, c.razao_social
    ORDER BY valor_vencido DESC
    LIMIT 20
  `);
  const devedoras: DevedoraItem[] = (
    (
      devedorasRes as unknown as {
        rows: {
          construtora_id: string;
          construtora_nome: string;
          parcelas_vencidas: number;
          valor_vencido: number;
          dias_medio_atraso: number;
          ultima_paga: string | null;
          blacklisted: boolean;
        }[];
      }
    ).rows ?? []
  ).map((r) => ({
    construtoraId: r.construtora_id,
    construtoraNome: r.construtora_nome,
    parcelasVencidas: r.parcelas_vencidas,
    valorVencido: r.valor_vencido,
    diasMedioAtraso: Math.round(r.dias_medio_atraso),
    ultimaParcelaPaga: r.ultima_paga,
    blacklisted: r.blacklisted,
  }));

  // 3. Blacklist atual
  const blacklistRows = await db.execute(sql`
    SELECT
      b.construtora_id::text AS construtora_id,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      b.motivo,
      b.created_at AS created_at
    FROM fundo_blacklist b
    INNER JOIN construtoras c ON c.id = b.construtora_id
    WHERE b.fundo_id = ${fundo.id}::uuid
    ORDER BY b.created_at DESC
  `);
  const blacklist = (
    (
      blacklistRows as unknown as {
        rows: {
          construtora_id: string;
          construtora_nome: string;
          motivo: string | null;
          created_at: Date;
        }[];
      }
    ).rows ?? []
  ).map((r) => ({
    construtoraId: r.construtora_id,
    construtoraNome: r.construtora_nome,
    motivo: r.motivo,
    createdAt: r.created_at,
  }));

  return {
    capitalExposto,
    porConstrutora,
    porImobiliaria,
    porUf,
    devedoras,
    blacklist,
  };
}

/* =========================================
   BLACKLIST — bloquear / desbloquear construtora
   ========================================= */

export type BlacklistState =
  | { ok: false; error: string }
  | { ok: true; action: "added" | "removed" }
  | null;

export async function toggleBlacklistAction(
  _prev: BlacklistState,
  formData: FormData,
): Promise<BlacklistState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo")
    return { ok: false, error: "Não autorizado" };

  const fundo = await getCurrentFundo();
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const construtoraId = String(formData.get("construtoraId") || "").trim();
  if (!construtoraId)
    return { ok: false, error: "ID da construtora obrigatório" };

  const motivo = String(formData.get("motivo") || "").trim().slice(0, 500) || null;

  // Existe? Se sim, remove; se não, adiciona
  const [existing] = await db
    .select({ id: fundoBlacklist.id })
    .from(fundoBlacklist)
    .where(
      and(
        eq(fundoBlacklist.fundoId, fundo.id),
        eq(fundoBlacklist.construtoraId, construtoraId),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(fundoBlacklist).where(eq(fundoBlacklist.id, existing.id));
    await audit({
      action: "fundo_blacklist_removida",
      targetType: "construtora",
      targetId: construtoraId,
      metadata: { fundoId: fundo.id },
    });
    revalidatePath("/painel/risco");
    return { ok: true, action: "removed" };
  }

  await db.insert(fundoBlacklist).values({
    fundoId: fundo.id,
    construtoraId,
    motivo,
    blockedByUserId: user.id,
  });
  await audit({
    action: "fundo_blacklist_adicionada",
    targetType: "construtora",
    targetId: construtoraId,
    metadata: { fundoId: fundo.id, motivo },
  });
  revalidatePath("/painel/risco");
  return { ok: true, action: "added" };
}

/** Helper pra checar se uma construtora está na blacklist do fundo.
 *  Retorna null se não bloqueada, ou motivo (texto) se bloqueada. */
export async function checkBlacklist(
  fundoId: string,
  construtoraId: string,
): Promise<{ blocked: boolean; motivo: string | null }> {
  const [row] = await db
    .select({ motivo: fundoBlacklist.motivo })
    .from(fundoBlacklist)
    .where(
      and(
        eq(fundoBlacklist.fundoId, fundoId),
        eq(fundoBlacklist.construtoraId, construtoraId),
      ),
    )
    .limit(1);
  if (!row) return { blocked: false, motivo: null };
  return { blocked: true, motivo: row.motivo };
}
