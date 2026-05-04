"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cadastrarComercialAction,
  type CadastrarComercialState,
} from "@/lib/actions/comerciais";
import { CepAddressFields } from "@/components/cep-address-fields";
import { useFeedback } from "@/components/feedback-provider";
import { maskCNPJ, maskCPF, maskPhone } from "@/lib/cnpj";
import type { Comercial } from "@/db/schema";

type Props = {
  comercial?: Comercial;
};

export function AdminCadastrarComercialForm({ comercial }: Props) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const isEdit = Boolean(comercial);

  const [state, action, pending] = useActionState<
    CadastrarComercialState,
    FormData
  >(
    isEdit
      ? // editar usa mesma assinatura que cadastrar
        (async (prev: CadastrarComercialState, fd: FormData) => {
          const { editComercialAction } = await import(
            "@/lib/actions/comerciais"
          );
          return editComercialAction(prev, fd);
        }) as never
      : cadastrarComercialAction,
    null,
  );

  const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">(
    (comercial?.tipoPessoa as "fisica" | "juridica") ?? "fisica",
  );
  const [documento, setDocumento] = useState(() => {
    if (!comercial) return "";
    return comercial.tipoPessoa === "fisica"
      ? maskCPF(comercial.documento)
      : maskCNPJ(comercial.documento);
  });
  const [telefone, setTelefone] = useState(
    comercial?.telefone ? maskPhone(comercial.telefone) : "",
  );

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        isEdit
          ? "Cadastro do comercial atualizado."
          : "Comercial cadastrado e convite Clerk disparado.",
        "Pronto",
      ).then(() => {
        if (isEdit) router.refresh();
        else router.push(`/admin/comerciais/${state.comercialId}`);
      });
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao salvar");
    }
  }, [state, isEdit, alertSuccess, alertError, router]);

  function handleDocChange(raw: string) {
    if (tipoPessoa === "fisica") setDocumento(maskCPF(raw));
    else setDocumento(maskCNPJ(raw));
  }

  return (
    <form action={action} className="space-y-6">
      {comercial && <input type="hidden" name="comercialId" value={comercial.id} />}

      {/* Toggle PF/PJ */}
      <Card title="Tipo">
        <div className="flex gap-2">
          {(["fisica", "juridica"] as const).map((tp) => (
            <label
              key={tp}
              className={`chip cursor-pointer transition-colors hover:border-accent ${
                tipoPessoa === tp ? "chip-accent" : ""
              }`}
            >
              <input
                type="radio"
                name="tipoPessoa"
                value={tp}
                checked={tipoPessoa === tp}
                onChange={() => setTipoPessoa(tp)}
                className="hidden"
              />
              {tp === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"}
            </label>
          ))}
        </div>
      </Card>

      {/* Identificação */}
      <Card title={tipoPessoa === "fisica" ? "Dados pessoais" : "Empresa"}>
        <Grid>
          <Field
            label={
              tipoPessoa === "fisica"
                ? "Nome completo *"
                : "Razão social *"
            }
          >
            <input
              name="nomeCompleto"
              required
              defaultValue={comercial?.nomeCompleto ?? ""}
              className="form-input"
            />
          </Field>
          <Field
            label={tipoPessoa === "fisica" ? "Apelido" : "Nome fantasia"}
          >
            <input
              name="apelido"
              defaultValue={comercial?.apelido ?? ""}
              className="form-input"
            />
          </Field>
          <Field label={tipoPessoa === "fisica" ? "CPF *" : "CNPJ *"}>
            <input
              name="documento"
              required
              value={documento}
              onChange={(e) => handleDocChange(e.target.value)}
              inputMode="numeric"
              placeholder={
                tipoPessoa === "fisica"
                  ? "000.000.000-00"
                  : "00.000.000/0000-00"
              }
              className="form-input font-mono"
            />
          </Field>
          <CepAddressFields
            initial={{
              cep: comercial?.cep,
              endereco: comercial?.endereco,
              cidade: comercial?.cidade,
              uf: comercial?.uf,
            }}
            optional
          />
        </Grid>
      </Card>

      {/* Contato */}
      <Card
        title="Contato e login"
        subtitle="Email é também o login. Comercial recebe convite Clerk por email pra definir senha."
      >
        <Grid>
          <Field label="Email *">
            <input
              name="email"
              type="email"
              required
              defaultValue={comercial?.email ?? ""}
              className="form-input font-mono text-xs"
            />
          </Field>
          <Field label="Telefone (WhatsApp)">
            <input
              name="telefone"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
              placeholder="(00) 00000-0000"
              className="form-input"
            />
          </Field>
        </Grid>
      </Card>

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending
          ? "Salvando..."
          : isEdit
            ? "Salvar alterações"
            : "Cadastrar e enviar convite"}
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
