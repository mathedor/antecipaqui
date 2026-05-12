"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateSpreadMinimoAction,
  type UpdateSpreadMinimoState,
} from "@/lib/actions/settings";

type Props = {
  spreadAtual: number;
  updatedAt: Date | null;
};

function pct(v: number) {
  return (v * 100).toFixed(2).replace(".", ",") + "%";
}

export function AdminSpreadMinimoForm({ spreadAtual, updatedAt }: Props) {
  const [state, action, pending] = useActionState<
    UpdateSpreadMinimoState,
    FormData
  >(updateSpreadMinimoAction, null);
  const [valor, setValor] = useState(String((spreadAtual * 100).toFixed(2)));

  useEffect(() => {
    if (state?.ok) {
      setValor(String((state.novoSpread * 100).toFixed(2)));
    }
  }, [state]);

  return (
    <form action={action} className="space-y-5 max-w-xl">
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
          Spread mínimo atualizado para {pct(state.novoSpread)} ao mês.
        </div>
      )}

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Spread mínimo permitido (%)
        </label>
        <div className="flex items-stretch max-w-xs rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
          <input
            name="spreadMinimo"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className="flex-1 min-w-0 bg-bg h-12 px-4 text-fg placeholder:text-fg-dim outline-none tabular text-right"
          />
          <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-sm font-mono border-l border-border-strong shrink-0">
            % a.m.
          </span>
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          Diferença mínima exigida entre <strong>taxa da operação</strong> e{" "}
          <strong>taxa do fundo</strong> pra aprovar. Use 0 pra desativar o
          bloqueio.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary !h-11 !px-6"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {updatedAt && (
          <span className="text-xs text-fg-dim font-mono">
            última alteração:{" "}
            {new Date(updatedAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </form>
  );
}
