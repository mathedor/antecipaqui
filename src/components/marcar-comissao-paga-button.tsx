"use client";

import { useActionState, useState } from "react";
import {
  marcarComissaoPagaAction,
  type MarcarComissaoPagaState,
} from "@/lib/actions/comissoes-comercial";

type Props = {
  comissaoId: string;
  valorDevido: number;
  valorPagoAtual: number;
};

function fmtBRLInput(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export function MarcarComissaoPagaButton({
  comissaoId,
  valorDevido,
  valorPagoAtual,
}: Props) {
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState(
    fmtBRLInput(valorPagoAtual > 0 ? valorPagoAtual : valorDevido),
  );
  const [state, action, pending] = useActionState<
    MarcarComissaoPagaState,
    FormData
  >(marcarComissaoPagaAction, null);

  if (state?.ok && !open) {
    return (
      <span className="text-xs text-success font-mono">✓ atualizado</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-accent hover:underline text-xs font-mono"
      >
        registrar pgto →
      </button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="id" value={comissaoId} />
      <input
        name="valorPago"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        inputMode="decimal"
        placeholder={fmtBRLInput(valorDevido)}
        className="h-8 px-2 rounded border border-border-strong bg-bg font-mono tabular text-xs w-28 text-right"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 px-2 rounded bg-success text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
      >
        {pending ? "..." : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-8 px-1.5 rounded border border-border-strong text-fg-muted text-xs hover:bg-bg-card"
      >
        ✕
      </button>
      {state?.ok === false && (
        <span className="text-xs text-danger">{state.error}</span>
      )}
    </form>
  );
}
