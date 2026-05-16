"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireActiveUser } from "@/lib/auth-user";

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export type Conquista = {
  key: string;
  titulo: string;
  descricao: string;
  emoji: string;
  unlocked: boolean;
  /** Progresso 0–1 quando bloqueada (pra mostrar "70% no caminho"). */
  progresso: number;
  /** Quando foi conquistada (se unlocked + temos data). */
  unlockedAt?: string | null;
  /** Texto extra ("em mai/26", "8/10 ops"). */
  extra?: string;
};

export type StreakInfo = {
  /** Sequência atual de meses batendo meta (>=100%). */
  atual: number;
  /** Maior sequência histórica. */
  recorde: number;
  /** Bateu o mês passado? (pra mostrar "se manter, vira 3"). */
  passadoBateu: boolean;
};

export async function getComercialConquistas(
  comercialId: string,
): Promise<{ conquistas: Conquista[]; streak: StreakInfo }> {
  await requireActiveUser();

  // --- Agregações em uma query só ---
  const res = await db.execute(sql`
    WITH ops AS (
      SELECT
        o.id,
        o.valor_presente::float AS vp,
        o.status,
        o.created_at,
        o.aprovado_em,
        o.liquidado_em,
        c.uf AS construtora_uf
      FROM operacoes o
      LEFT JOIN construtoras c ON c.id = o.construtora_id
      WHERE o.comercial_id = ${comercialId}::uuid
        AND o.status NOT IN ('rascunho','recusada','cancelada')
    ),
    imobs AS (
      SELECT i.id, i.created_at,
        EXISTS (
          SELECT 1 FROM operacoes oo
          WHERE oo.imobiliaria_id = i.id
            AND oo.status NOT IN ('rascunho','recusada','cancelada')
            AND oo.created_at >= NOW() - INTERVAL '90 days'
        ) AS ativa
      FROM imobiliarias i
      WHERE i.comercial_id = ${comercialId}::uuid
    )
    SELECT
      (SELECT COUNT(*) FROM ops)::int AS total_ops,
      (SELECT MIN(aprovado_em) FROM ops WHERE aprovado_em IS NOT NULL) AS primeira_op_em,
      (SELECT MIN(liquidado_em) FROM ops WHERE liquidado_em IS NOT NULL) AS primeira_liquidada_em,
      (SELECT COUNT(*) FROM ops WHERE status = 'realizada')::int AS realizadas,
      (SELECT COUNT(DISTINCT construtora_uf) FROM ops WHERE construtora_uf IS NOT NULL)::int AS ufs,
      (SELECT COALESCE(SUM(vp),0)::float FROM ops WHERE date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE)) AS volume_mes,
      (SELECT COALESCE(MAX(vp),0)::float FROM ops) AS maior_op,
      (SELECT MIN(created_at) FROM imobs) AS primeira_imob_em,
      (SELECT COUNT(*) FROM imobs)::int AS imobs_total,
      (SELECT COUNT(*) FROM imobs WHERE ativa = true)::int AS imobs_ativas
  `);

  const row =
    extractRows<{
      total_ops: number;
      primeira_op_em: string | null;
      primeira_liquidada_em: string | null;
      realizadas: number;
      ufs: number;
      volume_mes: number;
      maior_op: number;
      primeira_imob_em: string | null;
      imobs_total: number;
      imobs_ativas: number;
    }>(res)[0] ?? {
      total_ops: 0,
      primeira_op_em: null,
      primeira_liquidada_em: null,
      realizadas: 0,
      ufs: 0,
      volume_mes: 0,
      maior_op: 0,
      primeira_imob_em: null,
      imobs_total: 0,
      imobs_ativas: 0,
    };

  // Streak de meta — pega últimos 12 meses de meta vs realizado
  const metaRes = await db.execute(sql`
    WITH meses AS (
      SELECT generate_series(
        date_trunc('month', CURRENT_DATE) - INTERVAL '12 months',
        date_trunc('month', CURRENT_DATE) - INTERVAL '1 month',
        '1 month'
      ) AS m
    ),
    agg AS (
      SELECT
        date_trunc('month', o.created_at) AS m,
        COALESCE(SUM(cc.valor_devido)::float, 0) AS comissao
      FROM operacoes o
      LEFT JOIN comissoes_comercial cc ON cc.operacao_id = o.id
      WHERE o.comercial_id = ${comercialId}::uuid
        AND o.status NOT IN ('rascunho','recusada','cancelada')
        AND o.created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '13 months'
      GROUP BY date_trunc('month', o.created_at)
    )
    SELECT
      to_char(m.m, 'YYYY-MM') AS ym,
      COALESCE(a.comissao, 0)::float AS comissao
    FROM meses m
    LEFT JOIN agg a ON a.m = m.m
    ORDER BY m.m
  `);
  const meses = extractRows<{ ym: string; comissao: number }>(metaRes);

  // Calcula meta = 120% do mês anterior pra cada mês e marca bateu/não bateu
  const bateu: boolean[] = [];
  for (let i = 0; i < meses.length; i++) {
    const prev = meses[i - 1]?.comissao ?? 0;
    const meta = Math.max(prev * 1.2, prev > 0 ? 0 : 500);
    bateu.push(meses[i].comissao >= meta);
  }
  // Streak atual = sequência terminando no fim
  let streakAtual = 0;
  for (let i = bateu.length - 1; i >= 0; i--) {
    if (bateu[i]) streakAtual++;
    else break;
  }
  let streakRecorde = 0;
  let cur = 0;
  for (const b of bateu) {
    if (b) {
      cur++;
      if (cur > streakRecorde) streakRecorde = cur;
    } else cur = 0;
  }

  const streak: StreakInfo = {
    atual: streakAtual,
    recorde: streakRecorde,
    passadoBateu: bateu[bateu.length - 1] ?? false,
  };

  const conquistas: Conquista[] = [
    {
      key: "primeira_op",
      titulo: "Primeira operação",
      descricao: "Sua primeira op aprovada pela mesa AQ.",
      emoji: "🎯",
      unlocked: row.total_ops >= 1,
      progresso: Math.min(1, row.total_ops),
      unlockedAt: row.primeira_op_em,
      extra: row.total_ops >= 1 ? "✓" : "0/1",
    },
    {
      key: "primeira_liquidada",
      titulo: "Primeira liquidada",
      descricao: "Uma op sua chegou até o fim — comissão entrou.",
      emoji: "💰",
      unlocked: !!row.primeira_liquidada_em,
      progresso: row.primeira_liquidada_em ? 1 : 0,
      unlockedAt: row.primeira_liquidada_em,
    },
    {
      key: "10_ops",
      titulo: "10 operações",
      descricao: "Você fechou 10 ops na carteira.",
      emoji: "🔟",
      unlocked: row.total_ops >= 10,
      progresso: Math.min(1, row.total_ops / 10),
      extra: `${row.total_ops}/10`,
    },
    {
      key: "50_ops",
      titulo: "50 operações",
      descricao: "Volume sólido. Você virou referência.",
      emoji: "🏆",
      unlocked: row.total_ops >= 50,
      progresso: Math.min(1, row.total_ops / 50),
      extra: `${row.total_ops}/50`,
    },
    {
      key: "100_ops",
      titulo: "100 operações",
      descricao: "Veterano da Antecipaqui.",
      emoji: "👑",
      unlocked: row.total_ops >= 100,
      progresso: Math.min(1, row.total_ops / 100),
      extra: `${row.total_ops}/100`,
    },
    {
      key: "100k_mes",
      titulo: "100k num mês",
      descricao: "Operou mais de R$ 100.000 num único mês.",
      emoji: "💎",
      unlocked: row.volume_mes >= 100_000,
      progresso: Math.min(1, row.volume_mes / 100_000),
      extra:
        row.volume_mes > 0
          ? `R$ ${(row.volume_mes / 1000).toFixed(0)}k este mês`
          : undefined,
    },
    {
      key: "imobs_5",
      titulo: "5 imobs ativas",
      descricao: "5 imobiliárias da sua carteira operaram nos últimos 90d.",
      emoji: "🌱",
      unlocked: row.imobs_ativas >= 5,
      progresso: Math.min(1, row.imobs_ativas / 5),
      extra: `${row.imobs_ativas}/5 ativas`,
    },
    {
      key: "imobs_20",
      titulo: "20 imobs ativas",
      descricao: "Carteira pulsante.",
      emoji: "🚀",
      unlocked: row.imobs_ativas >= 20,
      progresso: Math.min(1, row.imobs_ativas / 20),
      extra: `${row.imobs_ativas}/20 ativas`,
    },
    {
      key: "3_estados",
      titulo: "Operou em 3 estados",
      descricao: "Diversidade geográfica na carteira.",
      emoji: "🗺️",
      unlocked: row.ufs >= 3,
      progresso: Math.min(1, row.ufs / 3),
      extra: `${row.ufs} UFs`,
    },
    {
      key: "5_estados",
      titulo: "Operou em 5 estados",
      descricao: "Atuação nacional.",
      emoji: "🌎",
      unlocked: row.ufs >= 5,
      progresso: Math.min(1, row.ufs / 5),
      extra: `${row.ufs} UFs`,
    },
    {
      key: "streak_3",
      titulo: "Streak 3 meses",
      descricao: "Bateu meta 3 meses seguidos.",
      emoji: "🔥",
      unlocked: streak.recorde >= 3,
      progresso: Math.min(1, streak.recorde / 3),
      extra:
        streak.atual >= 3
          ? `Em curso! ${streak.atual}/?`
          : `Recorde: ${streak.recorde}`,
    },
    {
      key: "streak_6",
      titulo: "Streak 6 meses",
      descricao: "Meio ano consistente. Top performer.",
      emoji: "🏅",
      unlocked: streak.recorde >= 6,
      progresso: Math.min(1, streak.recorde / 6),
      extra: `Recorde: ${streak.recorde} meses`,
    },
    {
      key: "maior_op_50k",
      titulo: "Op de 50k+",
      descricao: "Pelo menos uma op sua passou de R$ 50.000.",
      emoji: "💵",
      unlocked: row.maior_op >= 50_000,
      progresso: Math.min(1, row.maior_op / 50_000),
      extra:
        row.maior_op > 0
          ? `Maior: R$ ${(row.maior_op / 1000).toFixed(0)}k`
          : undefined,
    },
  ];

  return { conquistas, streak };
}
