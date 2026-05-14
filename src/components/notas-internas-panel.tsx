"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addNotaInternaAction,
  deleteNotaInternaAction,
  type AddNotaState,
} from "@/lib/actions/notas-internas";
import { useFeedback } from "@/components/feedback-provider";

type Nota = {
  id: string;
  body: string;
  flag: string | null;
  autorRole: string;
  autorId: string | null;
  autorNome: string | null;
  autorEmail: string | null;
  createdAt: Date | string;
};

const FLAG_BADGE: Record<string, { bg: string; label: string }> = {
  alerta: { bg: "bg-yellow-50 text-warn border-warn/40", label: "⚠ Alerta" },
  recusa: { bg: "bg-red-50 text-danger border-danger/40", label: "✕ Recusa anterior" },
  observacao: {
    bg: "bg-bg-card text-fg-muted border-border",
    label: "ⓘ Observação",
  },
};

function fmtDT(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotasInternasPanel({
  operacaoId,
  notas,
  currentUserId,
  currentUserRole,
}: {
  operacaoId: string;
  notas: Nota[];
  currentUserId: string;
  currentUserRole: string;
}) {
  const router = useRouter();
  const { confirm, alertError } = useFeedback();
  const [state, action, pending] = useActionState<AddNotaState, FormData>(
    addNotaInternaAction,
    null,
  );
  const [body, setBody] = useState("");
  const [flag, setFlag] = useState("");

  useEffect(() => {
    if (state?.ok) {
      setBody("");
      setFlag("");
      router.refresh();
    }
  }, [state, router]);

  async function remover(id: string) {
    const ok = await confirm({
      title: "Remover nota interna?",
      message: "Essa ação é permanente.",
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteNotaInternaAction(id, operacaoId);
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    }
  }

  return (
    <section className="rounded-2xl border border-accent/30 bg-accent-soft/30 p-5 mb-4 print:hidden">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="font-bold mb-1">📝 Notas internas</h3>
          <p className="text-xs text-fg-muted">
            Visíveis apenas pra admin e comercial. NUNCA aparecem pra
            corretor, construtora ou fundo.
          </p>
        </div>
      </div>

      <form action={action} className="space-y-2 mb-4">
        <input type="hidden" name="operacaoId" value={operacaoId} />
        <textarea
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Escreva uma observação interna..."
          className="form-input"
          maxLength={5000}
        />
        <div className="flex gap-2 flex-wrap items-center">
          <select
            name="flag"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            className="h-9 px-2 rounded-lg border border-border bg-bg text-sm"
          >
            <option value="">Sem flag</option>
            <option value="observacao">ⓘ Observação</option>
            <option value="alerta">⚠ Alerta</option>
            <option value="recusa">✕ Recusa anterior</option>
          </select>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "..." : "Adicionar nota"}
          </button>
          {state && !state.ok && (
            <span className="text-xs text-danger">{state.error}</span>
          )}
        </div>
      </form>

      {notas.length === 0 ? (
        <p className="text-xs text-fg-dim italic">
          Nenhuma nota interna ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {notas.map((n) => {
            const flagInfo = n.flag ? FLAG_BADGE[n.flag] : null;
            const podeRemover =
              currentUserRole === "admin" || n.autorId === currentUserId;
            return (
              <li
                key={n.id}
                className={`rounded-xl border p-3 ${
                  flagInfo
                    ? flagInfo.bg
                    : "border-border bg-bg"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim">
                    {n.autorNome ?? n.autorEmail ?? "—"} ·{" "}
                    <span className="text-fg-muted">
                      {n.autorRole}
                    </span>
                    {" · "}
                    {fmtDT(n.createdAt)}
                    {flagInfo && (
                      <span className="ml-2 font-bold">{flagInfo.label}</span>
                    )}
                  </div>
                  {podeRemover && (
                    <button
                      type="button"
                      onClick={() => remover(n.id)}
                      className="text-fg-dim hover:text-danger text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-line">{n.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
