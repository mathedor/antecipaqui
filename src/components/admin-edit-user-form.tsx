"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  editUserAction,
  type EditUserState,
} from "@/lib/actions/admin-edit";
import { CepAddressFields } from "@/components/cep-address-fields";
import { FileUploadField } from "@/components/file-upload-field";
import { useFeedback } from "@/components/feedback-provider";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";
import type { User, Imobiliaria } from "@/db/schema";

type DocsState = {
  contratoSocial?: { url: string; name: string } | null;
  comprovanteEndereco?: { url: string; name: string } | null;
  creci?: { url: string; name: string } | null;
};

type Props = {
  user: User;
  imobiliaria: Imobiliaria | null;
  initialDocs: DocsState;
};

export function AdminEditUserForm({
  user,
  imobiliaria,
  initialDocs,
}: Props) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<EditUserState, FormData>(
    editUserAction,
    null,
  );

  const [telefone, setTelefone] = useState(
    user.telefone ? maskPhone(user.telefone) : "",
  );
  const [imobCnpj, setImobCnpj] = useState(
    imobiliaria?.cnpj ? maskCNPJ(imobiliaria.cnpj) : "",
  );
  const [imobTelefone, setImobTelefone] = useState(
    imobiliaria?.telefone ? maskPhone(imobiliaria.telefone) : "",
  );

  useEffect(() => {
    if (state && !state.ok) {
      alertError(state.error, "Erro ao salvar");
    } else if (state && state.ok) {
      alertSuccess("Cadastro atualizado.", "Salvo");
      router.refresh();
    }
  }, [state, alertSuccess, alertError, router]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="userId" value={user.id} />

      <Card title="Dados pessoais">
        <Grid>
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
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
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
        </Grid>
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
                value={imobCnpj}
                onChange={(e) => setImobCnpj(maskCNPJ(e.target.value))}
                inputMode="numeric"
                className="form-input font-mono"
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
                value={imobTelefone}
                onChange={(e) => setImobTelefone(maskPhone(e.target.value))}
                inputMode="tel"
                className="form-input"
              />
            </Field>
            <CepAddressFields
              prefix="imob"
              initial={{
                cep: imobiliaria.cep,
                endereco: imobiliaria.endereco,
                cidade: imobiliaria.cidade,
                uf: imobiliaria.uf,
              }}
              optional
            />
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

      {user.role !== "construtora" && user.role !== "admin" && (
        <Card title="Documentos KYC">
          <p className="text-xs text-fg-muted mb-4 -mt-2">
            Faltando? Você (admin) pode subir agora pra completar o cadastro
            sem cobrar o usuário.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <FileUploadField
              label="Contrato social"
              name="doc_contrato_social"
              tipo="contrato_social"
              folder={`kyc/user-${user.id}/contrato-social`}
              initial={initialDocs.contratoSocial ?? null}
            />
            <FileUploadField
              label="Comprovante de endereço"
              name="doc_comprovante_endereco"
              tipo="comprovante_endereco"
              folder={`kyc/user-${user.id}/comprovante-endereco`}
              initial={initialDocs.comprovanteEndereco ?? null}
            />
            <FileUploadField
              label="CRECI (opcional)"
              name="doc_creci"
              tipo="creci"
              folder={`kyc/user-${user.id}/creci`}
              initial={initialDocs.creci ?? null}
            />
          </div>
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
