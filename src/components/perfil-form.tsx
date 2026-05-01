"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  editProfileAction,
  type EditProfileState,
} from "@/lib/actions/profile";
import { CepAddressFields } from "@/components/cep-address-fields";
import { FileUploadField } from "@/components/file-upload-field";
import { useFeedback } from "@/components/feedback-provider";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";
import type { User, Imobiliaria, Construtora } from "@/db/schema";

type DocsState = {
  contratoSocial?: { url: string; name: string } | null;
  comprovanteEndereco?: { url: string; name: string } | null;
  creci?: { url: string; name: string } | null;
};

type Props = {
  user: User;
  imobiliaria: Imobiliaria | null;
  construtora: Construtora | null;
  initialDocs: DocsState;
};

export function PerfilForm({
  user,
  imobiliaria,
  construtora,
  initialDocs,
}: Props) {
  const router = useRouter();
  const clerk = useClerk();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    EditProfileState,
    FormData
  >(editProfileAction, null);

  const isCorretor = user.role === "corretor" || user.role === "imobiliaria";
  const isConstrutora = user.role === "construtora";
  const empresa = isConstrutora ? construtora : imobiliaria;

  const [telefone, setTelefone] = useState(
    user.telefone ? maskPhone(user.telefone) : "",
  );
  const [cnpj, setCnpj] = useState(empresa?.cnpj ? maskCNPJ(empresa.cnpj) : "");

  useEffect(() => {
    if (state?.ok) {
      alertSuccess("Cadastro atualizado.", "Salvo");
      router.refresh();
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao salvar");
    }
  }, [state, alertSuccess, alertError, router]);

  function openClerkProfile() {
    clerk.openUserProfile();
  }

  return (
    <form action={action} className="space-y-6">
      {/* Dados pessoais */}
      <Card title="Dados pessoais">
        <Grid>
          <Field label="Email">
            <input
              value={user.email}
              disabled
              className="form-input opacity-60 cursor-not-allowed"
            />
          </Field>
          <Field label="Nome *">
            <input
              name="nome"
              required
              defaultValue={user.nome ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Telefone *">
            <input
              name="telefone"
              required
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
              className="form-input"
            />
          </Field>
        </Grid>
      </Card>

      {/* Empresa (corretor/imobiliária) */}
      {isCorretor && (
        <Card
          title="Imobiliária"
          subtitle="Dados usados na cessão de comissão (cláusula 3ª do contrato)."
        >
          <Grid>
            <Field label="Razão social">
              <input
                name="razaoSocial"
                defaultValue={imobiliaria?.razaoSocial ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="Nome fantasia">
              <input
                name="nomeFantasia"
                defaultValue={imobiliaria?.nomeFantasia ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="CNPJ">
              <input
                name="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                inputMode="numeric"
                className="form-input font-mono"
              />
            </Field>
            <Field label="CRECI responsável">
              <input
                name="creci"
                defaultValue={imobiliaria?.creciResponsavel ?? ""}
                className="form-input"
              />
            </Field>
            <CepAddressFields
              initial={{
                cep: imobiliaria?.cep,
                endereco: imobiliaria?.endereco,
                cidade: imobiliaria?.cidade,
                uf: imobiliaria?.uf,
              }}
              optional
            />
          </Grid>
          <h4 className="mt-6 mb-3 font-mono text-[11px] uppercase tracking-wider text-fg-dim">
            dados bancários
          </h4>
          <Grid>
            <Field label="Banco">
              <input
                name="bancoNome"
                defaultValue={imobiliaria?.bancoNome ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="Código">
              <input
                name="bancoCodigo"
                defaultValue={imobiliaria?.bancoCodigo ?? ""}
                className="form-input font-mono"
              />
            </Field>
            <Field label="Agência">
              <input
                name="bancoAgencia"
                defaultValue={imobiliaria?.bancoAgencia ?? ""}
                className="form-input font-mono"
              />
            </Field>
            <Field label="Conta">
              <input
                name="bancoConta"
                defaultValue={imobiliaria?.bancoConta ?? ""}
                className="form-input font-mono"
              />
            </Field>
          </Grid>
        </Card>
      )}

      {/* Empresa (construtora) */}
      {isConstrutora && (
        <Card title="Construtora">
          <Grid>
            <Field label="Razão social">
              <input
                name="razaoSocial"
                defaultValue={construtora?.razaoSocial ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="Nome fantasia">
              <input
                name="nomeFantasia"
                defaultValue={construtora?.nomeFantasia ?? ""}
                className="form-input"
              />
            </Field>
            <Field label="CNPJ">
              <input
                name="cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                inputMode="numeric"
                className="form-input font-mono"
              />
            </Field>
            <Field label="Email comercial">
              <input
                name="email"
                type="email"
                defaultValue={construtora?.email ?? ""}
                className="form-input"
              />
            </Field>
            <CepAddressFields
              initial={{
                cep: construtora?.cep,
                endereco: construtora?.endereco,
                cidade: construtora?.cidade,
                uf: construtora?.uf,
              }}
              optional
            />
          </Grid>
        </Card>
      )}

      {/* Documentos KYC (não pra admin) */}
      {user.role !== "admin" && (
        <Card
          title="Documentos KYC"
          subtitle="Mantenha os documentos atualizados. Substitua se houve mudança no contrato social ou endereço."
        >
          <div className="grid md:grid-cols-2 gap-4">
            <FileUploadField
              label="Contrato social"
              name="doc_contrato_social"
              folder={`kyc/user-${user.id}/contrato-social`}
              initial={initialDocs.contratoSocial ?? null}
            />
            <FileUploadField
              label="Comprovante de endereço"
              name="doc_comprovante_endereco"
              folder={`kyc/user-${user.id}/comprovante-endereco`}
              initial={initialDocs.comprovanteEndereco ?? null}
            />
            {isCorretor && (
              <FileUploadField
                label="CRECI (opcional)"
                name="doc_creci"
                folder={`kyc/user-${user.id}/creci`}
                initial={initialDocs.creci ?? null}
              />
            )}
          </div>
        </Card>
      )}

      {/* Senha + conta */}
      <Card
        title="Senha e segurança"
        subtitle="Senha, métodos de login e segurança da conta. Abre o painel oficial Clerk."
      >
        <button
          type="button"
          onClick={openClerkProfile}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-semibold text-sm transition-colors"
        >
          🔒 Trocar senha · gerenciar conta
        </button>
      </Card>

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending ? "Salvando..." : "Salvar alterações"}
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
      {subtitle && (
        <p className="text-xs text-fg-muted mb-5">{subtitle}</p>
      )}
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
