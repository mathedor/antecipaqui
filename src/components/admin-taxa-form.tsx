"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateTaxaMensalAction,
  type UpdateTaxaMensalState,
} from "@/lib/actions/settings";

type Props = {
  taxaAtual: number;
  updatedAt: Date | null;
};

function pct(v: number) {
  return (v * 100).toFixed(2).replace(".", ",") + "%";
}

export function AdminTaxaForm({ taxaAtual, updatedAt }: Props) {
  const [state, action, pending] = useActionState<
    UpdateTaxaMensalState,
    FormData
  >(updateTaxaMensalAction, null);
  const [valor, setValor] = useState(String((taxaAtual * 100).toFixed(2)));

  useEffect(() => {
    if (state?.ok) {
      setValor(String((state.novaTaxa * 100).toFixed(2)));
    }
  }, [state]);

  const taxaSimulada = (() => {
    const cleaned = valor.replace(",", ".").replace("%", "");
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n)) return null;
    return n >= 0.5 ? n / 100 : n;
  })();

  return (
    <form action={action} className="space-y-5 max-w-xl">
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
          Taxa atualizada para {pct(state.novaTaxa)} ao mês.
        </div>
      )}

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Taxa mensal sugerida (%)
          <span className="ml-1 text-accent">*</span>
        </label>
        <div className="relative max-w-xs">
          <input
            name="taxaMensal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder="6,00"
            className="form-input !pr-12 tabular text-right"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-fg-muted text-sm font-mono pointer-events-none">
            % a.m.
          </span>
        </div>
        <p className="mt-2 text-xs text-fg-muted">
          Limites: 0,5% a 20% ao mês. Aceita formato decimal (0.06) ou
          percentual (6 ou 6,00).
        </p>
      </div>

      {taxaSimulada !== null && (
        <div className="rounded-xl border border-border bg-bg p-4 text-sm">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
            preview da nova taxa
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <Stat label="Mensal" value={pct(taxaSimulada)} />
            <Stat
              label="Anual equivalente"
              value={pct(Math.pow(1 + taxaSimulada, 12) - 1)}
            />
            <Stat
              label="Diária equivalente"
              value={pct(Math.pow(1 + taxaSimulada, 1 / 30) - 1)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary !h-11 !px-6"
        >
          {pending ? "Salvando..." : "Salvar nova taxa"}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className="font-mono tabular text-base font-bold tracking-tight text-fg mt-0.5">
        {value}
      </div>
    </div>
  );
}
