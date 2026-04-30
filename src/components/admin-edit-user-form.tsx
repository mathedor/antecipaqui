"use client";

import { useActionState } from "react";
import {
  editUserAction,
  type EditUserState,
} from "@/lib/actions/admin-edit";
import type { User, Imobiliaria } from "@/db/schema";

type Props = {
  user: User;
  imobiliaria: Imobiliaria | null;
};

export function AdminEditUserForm({ user, imobiliaria }: Props) {
  const [state, action, pending] = useActionState<EditUserState, FormData>(
    editUserAction,
    null,
  );

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="userId" value={user.id} />

      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {state.error}
        </div>
      )}

      <Card title="Dados pessoais">
        <Field label="Email">
          <input
            value={user.email}
            disabled
            className="form-input opacity-60 cursor-not-allowed"
          />
        </Field>
        <Field label="Nome">
          <input
            name="nome"
            defaultValue={user.nome ?? ""}
            className="form-input"
          />
        </Field>
        <Field label="Telefone">
          <input
            name="telefone"
            defaultValue={user.telefone ?? ""}
            className="form-input"
          />
        </Field>
        <Field label="Tipo de cadastro">
          <select
            name="role"
            defaultValue={user.role}
            className="form-input"
          >
            <option value="corretor">Corretor (PF)</option>
            <option value="imobiliaria">Imobiliária (PJ)</option>
            <option value="construtora">Construtora</option>
          </select>
        </Field>
      </Card>

      {imobiliaria && (
        <Card title="Imobiliária">
          <Grid>
            <Field label="Razão social">
              <input
                name="imobRazaoSocial"
                defaultValue={imobiliaria.razaoSocial}
                className="form-input"
              />
            </Field>
            <Field label="Nome fantasia">
              <input
                name="imobNomeFantasia"
                defaultValue={imobiliaria.nomeFantasia ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="CNPJ">
              <input
                name="imobCnpj"
                defaultValue={imobiliaria.cnpj}
                className="form-input"
              />
            </Field>
            <Field label="CRECI responsável">
              <input
                name="imobCreci"
                defaultValue={imobiliaria.creciResponsavel ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="Telefone">
              <input
                name="imobTelefone"
                defaultValue={imobiliaria.telefone ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="CEP">
              <input
                name="imobCep"
                defaultValue={imobiliaria.cep ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="Endereço">
              <input
                name="imobEndereco"
                defaultValue={imobiliaria.endereco ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="Cidade">
              <input
                name="imobCidade"
                defaultValue={imobiliaria.cidade ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="UF">
              <input
                name="imobUf"
                defaultValue={imobiliaria.uf ?? ""}
                maxLength={2}
                className="form-input uppercase"
              />
            </Field>
          </Grid>
          <h4 className="mt-6 mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-dim">
            dados bancários (cessão)
          </h4>
          <Grid>
            <Field label="Banco (nome)">
              <input
                name="imobBancoNome"
                defaultValue={imobiliaria.bancoNome ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="Código">
              <input
                name="imobBancoCodigo"
                defaultValue={imobiliaria.bancoCodigo ?? ""}
                className="form-input font-mono"
              />
            </Field>
            <Field label="Agência">
              <input
                name="imobBancoAgencia"
                defaultValue={imobiliaria.bancoAgencia ?? ""}
                className="form-input font-mono"
              />
            </Field>
            <Field label="Conta">
              <input
                name="imobBancoConta"
                defaultValue={imobiliaria.bancoConta ?? ""}
                className="form-input font-mono"
              />
            </Field>
          </Grid>
        </Card>
      )}

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
      <h3 className="font-bold mb-5">{title}</h3>
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
