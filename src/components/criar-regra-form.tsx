"use client";

import { useActionState } from "react";
import { criarRegraAction, type RegraState } from "@/lib/actions/fundo-mesa";

export function CriarRegraForm() {
  const [state, action, pending] = useActionState<RegraState, FormData>(
    criarRegraAction,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
        ✓ Regra criada. Recarregue a página pra ajustar se necessário.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nome da regra" required>
          <input
            name="nome"
            placeholder="Ex: Construtoras top, prazo curto"
            required
            maxLength={100}
            className="form-input"
          />
        </Field>
        <Field
          label="Taxa mínima da operação (% a.m.)"
          help="Vazio = qualquer taxa"
        >
          <input
            name="taxaMinima"
            inputMode="decimal"
            placeholder="Ex: 5,5"
            className="form-input"
          />
        </Field>
        <Field
          label="Prazo máximo (parcelas)"
          help="Vazio = qualquer prazo"
        >
          <input
            name="prazoMaximoMeses"
            inputMode="numeric"
            placeholder="Ex: 6"
            className="form-input"
          />
        </Field>
        <Field
          label="Valor máximo da comissão (R$)"
          help="Vazio = qualquer valor"
        >
          <input
            name="valorMaximoComissao"
            inputMode="decimal"
            placeholder="Ex: 100000"
            className="form-input"
          />
        </Field>
      </div>

      <Field
        label="Construtoras permitidas (IDs separados por vírgula)"
        help="Vazio = qualquer construtora. Use IDs da página da construtora no painel admin (use só se quiser allowlist)."
      >
        <input
          name="construtorasIds"
          placeholder="Ex: uuid1, uuid2, uuid3"
          className="form-input"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !h-11 !px-5"
      >
        {pending ? "Salvando..." : "+ Criar regra"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {children}
      {help && <p className="mt-1 text-[10px] text-fg-muted">{help}</p>}
    </div>
  );
}
