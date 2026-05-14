"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { forcarSnapshotScoreAction } from "@/lib/actions/score-historico";
import { useFeedback } from "@/components/feedback-provider";

type Point = {
  score: number;
  restricoes: number;
  alteracaoTipo: string;
  alteracaoMotivo: string | null;
  snapshotAt: Date | string;
};

const TIPO_LABEL: Record<string, string> = {
  parcela_vencida: "Parcela vencida",
  parcela_paga: "Parcela paga",
  op_recusada: "Op recusada",
  op_aprovada: "Op aprovada",
  manual: "Snapshot manual",
  sistema: "Sistema",
};

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function ScoreHistoricoChart({
  construtoraId,
  historico,
  scoreAtual,
}: {
  construtoraId: string;
  historico: Point[];
  scoreAtual: number;
}) {
  const router = useRouter();
  const { alertError, alertSuccess } = useFeedback();
  const [snapshotting, setSnapshotting] = useState(false);

  const data = historico.map((p) => ({
    data: fmtDate(p.snapshotAt),
    score: p.score,
    restricoes: p.restricoes,
    tipo: TIPO_LABEL[p.alteracaoTipo] ?? p.alteracaoTipo,
    motivo: p.alteracaoMotivo,
  }));

  async function forcar() {
    setSnapshotting(true);
    try {
      const r = await forcarSnapshotScoreAction(construtoraId);
      if (r.salvou) {
        await alertSuccess(
          `Score atualizado (${r.score}/100). Salvo no histórico.`,
          "Pronto",
        );
      } else {
        await alertSuccess(
          `Score não mudou desde o último snapshot (${r.score}/100).`,
          "Sem alteração",
        );
      }
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setSnapshotting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="font-bold">Histórico de score</h3>
          <p className="text-xs text-fg-muted mt-1">
            Score atual: <strong>{scoreAtual}/100</strong> ·{" "}
            {historico.length}{" "}
            {historico.length === 1 ? "snapshot" : "snapshots"} registrados.
          </p>
        </div>
        <button
          type="button"
          onClick={forcar}
          disabled={snapshotting}
          className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {snapshotting ? "..." : "🔄 Forçar snapshot"}
        </button>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-fg-dim italic">
          Nenhum snapshot ainda. O sistema grava automaticamente quando o
          score muda (op aprovada/recusada, parcela paga/vencida).
        </p>
      ) : (
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="data" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
                labelStyle={{ fontWeight: "bold" }}
              />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: "Neutro", fontSize: 9, position: "right" }} />
              <ReferenceLine y={75} stroke="#15803d" strokeDasharray="3 3" label={{ value: "Bom", fontSize: 9, position: "right" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#1c6dd0"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-fg-muted cursor-pointer hover:text-fg">
            Ver causas (últimos {Math.min(data.length, 10)})
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {data
              .slice(-10)
              .reverse()
              .map((p, i) => (
                <li key={i} className="flex gap-2 text-fg-muted">
                  <span className="font-mono w-16 shrink-0">{p.data}</span>
                  <span className="font-bold w-16 shrink-0">{p.score}/100</span>
                  <span className="flex-1">
                    {p.tipo}
                    {p.motivo && (
                      <span className="text-fg-dim"> · {p.motivo}</span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}
