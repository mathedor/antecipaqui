"use client";

import { useActionState, useState } from "react";
import {
  updateScoreParamsAction,
  type UpdateScoreParamsState,
} from "@/lib/actions/settings";

type Props = {
  pesoVencidaAtual: number;
  pesoVencidaGraveAtual: number;
  diasGraveAtual: number;
  updatedAt: Date | null;
};

export function AdminScoreForm({
  pesoVencidaAtual,
  pesoVencidaGraveAtual,
  diasGraveAtual,
  updatedAt,
}: Props) {
  const [state, action, pending] = useActionState<
    UpdateScoreParamsState,
    FormData
  >(updateScoreParamsAction, null);
  const [pesoVencida, setPesoVencida] = useState(String(pesoVencidaAtual));
  const [pesoVencidaGrave, setPesoVencidaGrave] = useState(
    String(pesoVencidaGraveAtual),
  );
  const [diasGrave, setDiasGrave] = useState(String(diasGraveAtual));

  return (
    <form action={action} className="space-y-5 max-w-xl">
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
          Score atualizado: −{state.pesoVencida} por vencida, −
          {state.pesoVencidaGrave} por vencida grave (acima de{" "}
          {state.diasGrave} dias).
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field
          name="pesoVencida"
          label="Peso vencida"
          value={pesoVencida}
          onChange={setPesoVencida}
          suffix="pts"
          help="cap em −50"
        />
        <Field
          name="pesoVencidaGrave"
          label="Peso vencida grave"
          value={pesoVencidaGrave}
          onChange={setPesoVencidaGrave}
          suffix="pts"
          help="cap em −40"
        />
        <Field
          name="diasGrave"
          label="Dias pra grave"
          value={diasGrave}
          onChange={setDiasGrave}
          suffix="dias"
          help="threshold"
        />
      </div>

      <p className="text-xs text-fg-muted">
        Fórmula: <code className="font-mono">score = 100 − min(50, vencidas × peso_vencida) − min(40, vencidas_graves × peso_vencida_grave)</code>.
        Vencida grave é parcela com atraso acima do limite de dias configurado.
        Construtoras sem histórico recebem score neutro (50).
      </p>

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

function Field({
  name,
  label,
  value,
  onChange,
  suffix,
  help,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  help?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      <div className="flex items-stretch rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
        <input
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          className="flex-1 min-w-0 bg-bg h-11 px-3 text-fg placeholder:text-fg-dim outline-none tabular text-right"
        />
        <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-xs font-mono border-l border-border-strong shrink-0">
          {suffix}
        </span>
      </div>
      {help && <p className="mt-1 text-[10px] text-fg-dim font-mono">{help}</p>}
    </div>
  );
}
