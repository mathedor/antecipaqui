"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  solicitarSaqueAction,
  type SolicitarSaqueState,
} from "@/lib/actions/cashback";

type Props = {
  saldo: number;
  construtoraNome: string;
  construtoraCnpj: string;
};

export function SolicitarSaqueForm({
  saldo,
  construtoraNome,
  construtoraCnpj,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<
    SolicitarSaqueState,
    FormData
  >(solicitarSaqueAction, null);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/painel/suporte/${state.ticketId}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Banco *">
          <input
            name="banco"
            required
            placeholder="Ex: Itaú"
            className="form-input !h-10"
          />
        </Field>
        <Field label="Agência *">
          <input
            name="agencia"
            required
            placeholder="0001"
            className="form-input !h-10 font-mono"
          />
        </Field>
      </div>
      <Field label="Conta *">
        <input
          name="conta"
          required
          placeholder="00000-0"
          className="form-input !h-10 font-mono"
        />
      </Field>
      <Field label="Titular *">
        <input
          name="titular"
          required
          defaultValue={construtoraNome}
          className="form-input !h-10"
        />
      </Field>
      <Field label="CPF / CNPJ do titular *">
        <input
          name="docTitular"
          required
          defaultValue={construtoraCnpj}
          className="form-input !h-10 font-mono"
        />
      </Field>
      <Field label="Observações">
        <textarea
          name="obs"
          rows={2}
          placeholder="Opcional"
          className="w-full rounded-xl bg-bg border border-border-strong px-4 py-2 text-sm text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-y"
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !w-full justify-center !h-11"
      >
        {pending ? "Solicitando..." : "Solicitar saque"}
      </button>
      <p className="text-[11px] text-fg-muted leading-relaxed">
        A solicitação cria um ticket de suporte com a Antecipaqui. Quando
        confirmarmos o pagamento, o saldo é zerado.
      </p>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}
