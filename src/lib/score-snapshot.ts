import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoraScoreHistorico } from "@/db/schema";
import { getScoreConstrutora } from "@/lib/scoring";

export type SnapshotMotivo = {
  tipo:
    | "parcela_vencida"
    | "parcela_paga"
    | "op_recusada"
    | "op_aprovada"
    | "manual"
    | "sistema";
  motivo?: string;
};

/** Calcula score atual da construtora e, se diferente do último snapshot,
 *  grava uma nova row no histórico. Idempotente: se score não mudou,
 *  não faz nada. */
export async function snapshotScoreConstrutora(
  construtoraId: string,
  motivo: SnapshotMotivo,
): Promise<{ score: number; salvou: boolean }> {
  try {
    const atual = await getScoreConstrutora(construtoraId, "global");

    const [ultimo] = await db
      .select({
        score: construtoraScoreHistorico.score,
        restricoes: construtoraScoreHistorico.restricoes,
      })
      .from(construtoraScoreHistorico)
      .where(eq(construtoraScoreHistorico.construtoraId, construtoraId))
      .orderBy(desc(construtoraScoreHistorico.snapshotAt))
      .limit(1);

    // Restrições = total de parcelas vencidas (proxy)
    const restricoes = atual.vencidas ?? 0;

    if (
      ultimo &&
      ultimo.score === atual.score &&
      ultimo.restricoes === restricoes
    ) {
      return { score: atual.score, salvou: false };
    }

    await db.insert(construtoraScoreHistorico).values({
      construtoraId,
      score: atual.score,
      restricoes,
      alteracaoTipo: motivo.tipo,
      alteracaoMotivo: motivo.motivo ?? null,
    });

    return { score: atual.score, salvou: true };
  } catch (e) {
    console.error("[score-snapshot] falhou:", (e as Error).message);
    return { score: 0, salvou: false };
  }
}

/** Lista o histórico de score de uma construtora ordenado do mais antigo
 *  pro mais recente (pra plotar gráfico). */
export async function listScoreHistorico(construtoraId: string, limit = 100) {
  const rows = await db
    .select()
    .from(construtoraScoreHistorico)
    .where(eq(construtoraScoreHistorico.construtoraId, construtoraId))
    .orderBy(desc(construtoraScoreHistorico.snapshotAt))
    .limit(limit);
  // Inverte pra ordem crescente
  return rows.reverse();
}
