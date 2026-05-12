"use client";

import { useActionState, useState } from "react";
import {
  gerarFaturasDoMesAction,
  type GerarFaturasState,
} from "@/lib/actions/faturas-fundo";

function defaultRefMes() {
  // Mês passado (cobrança normalmente é do mês fechado)
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultVencimento() {
  // 10 dias a partir de hoje
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().slice(0, 10);
}

export function GerarFaturasForm() {
  const [state, action, pending] = useActionState<GerarFaturasState, FormData>(
    gerarFaturasDoMesAction,
    null,
  );
  const [refMes, setRefMes] = useState(defaultRefMes());
  const [venc, setVenc] = useState(defaultVencimento());

  return (
    <form action={action} className="space-y-4">
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
          {state.criadas} nova{state.criadas === 1 ? "" : "s"} fatura
          {state.criadas === 1 ? "" : "s"} criada{state.criadas === 1 ? "" : "s"}{" "}
          ({state.total} fundo{state.total === 1 ? "" : "s"} com repasse no mês).
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            Mês de referência
          </label>
          <input
            type="month"
            name="refMes"
            value={refMes}
            onChange={(e) => setRefMes(e.target.value)}
            required
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            Vencimento (opcional)
          </label>
          <input
            type="date"
            name="vencimento"
            value={venc}
            onChange={(e) => setVenc(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="btn-primary !h-10 !px-5 w-full sm:w-auto"
          >
            {pending ? "Gerando..." : "Gerar faturas"}
          </button>
        </div>
      </div>
    </form>
  );
}
