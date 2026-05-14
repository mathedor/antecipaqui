"use server";

import { revalidatePath } from "next/cache";
import {
  listScoreHistorico as _listScoreHistorico,
  snapshotScoreConstrutora as _snapshot,
} from "@/lib/score-snapshot";
import { requireAdmin } from "@/lib/auth-user";

export async function getScoreHistoricoConstrutora(construtoraId: string) {
  await requireAdmin();
  const rows = await _listScoreHistorico(construtoraId, 200);
  return rows.map((r) => ({
    score: r.score,
    restricoes: r.restricoes,
    alteracaoTipo: r.alteracaoTipo,
    alteracaoMotivo: r.alteracaoMotivo,
    snapshotAt: r.snapshotAt,
  }));
}

export async function forcarSnapshotScoreAction(construtoraId: string) {
  await requireAdmin();
  const r = await _snapshot(construtoraId, {
    tipo: "manual",
    motivo: "Snapshot manual disparado pelo admin",
  });
  revalidatePath(`/admin/construtoras/${construtoraId}`);
  return r;
}
