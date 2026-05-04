"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createConstrutoraAction,
  type CreateConstrutoraState,
} from "@/lib/actions/operacoes";
import { CepAddressFields } from "@/components/cep-address-fields";
import { useFeedback } from "@/components/feedback-provider";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";

export function AdminCadastrarConstrutoraForm() {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    CreateConstrutoraState,
    FormData
  >(createConstrutoraAction, null);

  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        "Construtora cadastrada. Email de convite disparado.",
        "Pronto",
      ).then(() => router.push(`/admin/construtoras/${state.construtoraId}`));
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao cadastrar construtora");
    }
  }, [state, router, alertSuccess, alertError]);

  return (
    <form action={action} className="space-y-6">
      <Card title="Identificação">
        <Grid>
          <Field label="Razão social *">
            <input name="razaoSocial" required className="form-input" />
          </Field>
          <Field label="Nome fantasia">
            <input name="nomeFantasia" className="form-input" />
          </Field>
          <Field label="CNPJ *">
            <input
              name="cnpj"
              required
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              className="form-input font-mono"
            />
          </Field>
        </Grid>
      </Card>

      <Card title="Contato">
        <Grid>
          <Field label="Telefone *">
            <input
              name="telefone"
              required
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
              placeholder="(00) 00000-0000"
              className="form-input"
            />
          </Field>
          <Field label="Email comercial *">
            <input
              name="email"
              type="email"
              required
              placeholder="contato@..."
              className="form-input"
            />
          </Field>
        </Grid>
      </Card>

      <Card
        title="Endereço (opcional)"
        subtitle="CEP busca o endereço automaticamente. Pode ser preenchido depois."
      >
        <Grid>
          <CepAddressFields optional />
        </Grid>
      </Card>

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending ? "Cadastrando..." : "Cadastrar construtora"}
      </button>
    </form>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
      <h3 className="font-bold mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-fg-muted mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      <div className="space-y-4">{children}</div>
    </section>
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">{children}</div>;
}
