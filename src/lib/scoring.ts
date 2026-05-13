/** Scoring centralizado — score 0-100 de entidades baseado em histórico.
 *
 *  Reaproveitável em: mesa de decisão admin, dashboard de fundo, relatórios.
 *  Mesma fórmula da mesa do fundo (consistência): mais peso em atrasos
 *  graves (>30d) que em atrasos leves.
 *
 *  Pra escopos diferentes (fundo-específico vs global), a query usa filtros
 *  diferentes mas a fórmula é idêntica.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";

export type EscopoScore = "global" | { fundoId: string };

export type ScoreItem = {
  totalParcelas: number;
  vencidas: number;
  vencidasGraves: number; // atraso > 30d
  score: number; // 0-100
};

/** Aplica a fórmula canônica de score. */
export function computeScore(args: {
  totalParcelas: number;
  vencidas: number;
  vencidasGraves: number;
}): number {
  if (args.totalParcelas === 0) return 50; // neutro pra novos
  let score = 100;
  score -= Math.min(50, args.vencidas * 5);
  score -= Math.min(40, args.vencidasGraves * 10);
  return Math.max(0, Math.min(100, score));
}

/** Helper interno: gera fragment SQL pra filtrar por fundo se aplicável. */
function fundoFilterSql(escopo: EscopoScore) {
  return escopo === "global"
    ? sql``
    : sql`AND o.fundo_id = ${escopo.fundoId}::uuid`;
}

/** Score de uma construtora baseado em parcelas vencidas no escopo. */
export async function getScoreConstrutora(
  construtoraId: string,
  escopo: EscopoScore = "global",
): Promise<ScoreItem> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.status = 'vencida')::int AS vencidas,
      COUNT(*) FILTER (
        WHERE p.status = 'vencida'
          AND (CURRENT_DATE - p.vencimento) > 30
      )::int AS vencidas_graves
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.construtora_id = ${construtoraId}::uuid
      ${fundoFilterSql(escopo)}
  `);
  const r = (
    result as unknown as {
      rows: { total: number; vencidas: number; vencidas_graves: number }[];
    }
  ).rows[0] ?? { total: 0, vencidas: 0, vencidas_graves: 0 };
  return {
    totalParcelas: r.total,
    vencidas: r.vencidas,
    vencidasGraves: r.vencidas_graves,
    score: computeScore({
      totalParcelas: r.total,
      vencidas: r.vencidas,
      vencidasGraves: r.vencidas_graves,
    }),
  };
}

/** Score de uma imobiliária — usa parcelas das ops ligadas a ela. */
export async function getScoreImobiliaria(
  imobiliariaId: string,
  escopo: EscopoScore = "global",
): Promise<ScoreItem> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.status = 'vencida')::int AS vencidas,
      COUNT(*) FILTER (
        WHERE p.status = 'vencida'
          AND (CURRENT_DATE - p.vencimento) > 30
      )::int AS vencidas_graves
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.imobiliaria_id = ${imobiliariaId}::uuid
      ${fundoFilterSql(escopo)}
  `);
  const r = (
    result as unknown as {
      rows: { total: number; vencidas: number; vencidas_graves: number }[];
    }
  ).rows[0] ?? { total: 0, vencidas: 0, vencidas_graves: 0 };
  return {
    totalParcelas: r.total,
    vencidas: r.vencidas,
    vencidasGraves: r.vencidas_graves,
    score: computeScore({
      totalParcelas: r.total,
      vencidas: r.vencidas,
      vencidasGraves: r.vencidas_graves,
    }),
  };
}

/** Score de um corretor — parcelas de ops onde ele foi cedente. */
export async function getScoreCorretor(
  corretorUserId: string,
  escopo: EscopoScore = "global",
): Promise<ScoreItem> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.status = 'vencida')::int AS vencidas,
      COUNT(*) FILTER (
        WHERE p.status = 'vencida'
          AND (CURRENT_DATE - p.vencimento) > 30
      )::int AS vencidas_graves
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.corretor_user_id = ${corretorUserId}
      ${fundoFilterSql(escopo)}
  `);
  const r = (
    result as unknown as {
      rows: { total: number; vencidas: number; vencidas_graves: number }[];
    }
  ).rows[0] ?? { total: 0, vencidas: 0, vencidas_graves: 0 };
  return {
    totalParcelas: r.total,
    vencidas: r.vencidas,
    vencidasGraves: r.vencidas_graves,
    score: computeScore({
      totalParcelas: r.total,
      vencidas: r.vencidas,
      vencidasGraves: r.vencidas_graves,
    }),
  };
}

/** Lookup em batch: dado uma lista de construtoras, retorna mapa
 *  construtoraId → ScoreItem. Mais eficiente que loop com 1 query each. */
export async function getScoresBatchConstrutoras(
  construtoraIds: string[],
  escopo: EscopoScore = "global",
): Promise<Map<string, ScoreItem>> {
  if (construtoraIds.length === 0) return new Map();
  const result = await db.execute(sql`
    SELECT
      o.construtora_id::text AS construtora_id,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE p.status = 'vencida')::int AS vencidas,
      COUNT(*) FILTER (
        WHERE p.status = 'vencida'
          AND (CURRENT_DATE - p.vencimento) > 30
      )::int AS vencidas_graves
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.construtora_id = ANY(${construtoraIds}::uuid[])
      ${fundoFilterSql(escopo)}
    GROUP BY o.construtora_id
  `);
  const rows =
    (
      result as unknown as {
        rows: {
          construtora_id: string;
          total: number;
          vencidas: number;
          vencidas_graves: number;
        }[];
      }
    ).rows ?? [];
  const map = new Map<string, ScoreItem>();
  for (const r of rows) {
    map.set(r.construtora_id, {
      totalParcelas: r.total,
      vencidas: r.vencidas,
      vencidasGraves: r.vencidas_graves,
      score: computeScore({
        totalParcelas: r.total,
        vencidas: r.vencidas,
        vencidasGraves: r.vencidas_graves,
      }),
    });
  }
  // Quem não tem parcelas no escopo recebe ScoreItem zerado (score=50)
  for (const id of construtoraIds) {
    if (!map.has(id)) {
      map.set(id, {
        totalParcelas: 0,
        vencidas: 0,
        vencidasGraves: 0,
        score: 50,
      });
    }
  }
  return map;
}

/** Classifica score numa categoria visual */
export function scoreClass(score: number): "alto" | "medio" | "baixo" {
  if (score >= 75) return "alto";
  if (score >= 50) return "medio";
  return "baixo";
}

export function scoreColorClass(score: number): string {
  const c = scoreClass(score);
  if (c === "alto") return "text-success";
  if (c === "medio") return "text-fg";
  return "text-danger";
}
