"use client";

import { useActionState, useState } from "react";
import {
  decidirOperacaoAction,
  type DecisaoState,
} from "@/lib/actions/fundo-mesa";

type Props = {
  operacaoId: string;
  numero: string;
};

export function DecisaoForm({ operacaoId, numero }: Props) {
  const [mode, setMode] = useState<"idle" | "recusar">("idle");
  const [motivo, setMotivo] = useState("");
  const [state, action, pending] = useActionState<DecisaoState, FormData>(
    decidirOperacaoAction,
    null,
  );

  if (state?.ok) {
    return (
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          state.action === "aprovada"
            ? "border-success/40 bg-green-50 text-success"
            : "border-danger/40 bg-red-50 text-danger"
        }`}
      >
        {state.action === "aprovada" ? "✓ Aprovada" : "✗ Recusada"} ·{" "}
        {numero}
      </div>
    );
  }

  if (mode === "recusar") {
    return (
      <form action={action} className="space-y-2">
        <input type="hidden" name="operacaoId" value={operacaoId} />
        <input type="hidden" name="decisao" value="recusada" />
        <textarea
          name="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Por que recusar? (será compartilhado com o admin)"
          rows={2}
          required
          minLength={5}
          className="form-input w-full !min-h-14 resize-none"
        />
        {state?.ok === false && (
          <div className="text-xs text-danger">{state.error}</div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || motivo.trim().length < 5}
            className="h-10 px-4 rounded-lg bg-danger text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {pending ? "Recusando..." : "Confirmar recusa"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setMotivo("");
            }}
            className="h-10 px-3 rounded-lg border border-border-strong text-fg-muted text-sm hover:bg-bg-card"
          >
            cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <form action={action} className="inline-flex">
        <input type="hidden" name="operacaoId" value={operacaoId} />
        <input type="hidden" name="decisao" value="aprovada" />
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-5 rounded-lg bg-success text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {pending ? "Aprovando..." : "✓ Aprovar"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode("recusar")}
        className="h-11 px-5 rounded-lg border border-danger/40 text-danger text-sm font-semibold hover:bg-red-50 transition-colors"
      >
        ✗ Recusar
      </button>
      {state?.ok === false && (
        <span className="text-xs text-danger">{state.error}</span>
      )}
    </div>
  );
}
