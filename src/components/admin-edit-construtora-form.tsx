"use client";

import { useActionState } from "react";
import {
  editConstrutoraAction,
  type EditConstrutoraState,
} from "@/lib/actions/admin-edit";
import type { Construtora } from "@/db/schema";

export function AdminEditConstrutoraForm({
  construtora,
}: {
  construtora: Construtora;
}) {
  const [state, action, pending] = useActionState<
    EditConstrutoraState,
    FormData
  >(editConstrutoraAction, null);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="construtoraId" value={construtora.id} />

      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {state.error}
        </div>
      )}

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
        <h3 className="font-bold mb-5">Dados da construtora</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="Razão social *">
            <input
              name="razaoSocial"
              required
              defaultValue={construtora.razaoSocial}
              className="form-input"
            />
          </Field>
          <Field label="Nome fantasia">
            <input
              name="nomeFantasia"
              defaultValue={construtora.nomeFantasia ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="CNPJ *">
            <input
              name="cnpj"
              required
              defaultValue={construtora.cnpj}
              className="form-input font-mono"
            />
          </Field>
          <Field label="Telefone">
            <input
              name="telefone"
              defaultValue={construtora.telefone ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              defaultValue={construtora.email ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="CEP">
            <input
              name="cep"
              defaultValue={construtora.cep ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Endereço">
            <input
              name="endereco"
              defaultValue={construtora.endereco ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Cidade">
            <input
              name="cidade"
              defaultValue={construtora.cidade ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="UF">
            <input
              name="uf"
              maxLength={2}
              defaultValue={construtora.uf ?? ""}
              className="form-input uppercase"
            />
          </Field>
        </div>
      </section>

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}
