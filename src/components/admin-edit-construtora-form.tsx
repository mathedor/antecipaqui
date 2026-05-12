"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  editConstrutoraAction,
  type EditConstrutoraState,
} from "@/lib/actions/admin-edit";
import { CepAddressFields } from "@/components/cep-address-fields";
import { FileUploadField } from "@/components/file-upload-field";
import { useFeedback } from "@/components/feedback-provider";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";
import type { Construtora } from "@/db/schema";

type DocsState = {
  contratoSocial?: { url: string; name: string } | null;
  comprovanteEndereco?: { url: string; name: string } | null;
};

type FundoOption = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  taxaMensalBase: string;
};

type Props = {
  construtora: Construtora;
  initialDocs: DocsState;
  fundos: FundoOption[];
};

export function AdminEditConstrutoraForm({
  construtora,
  initialDocs,
  fundos,
}: Props) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    EditConstrutoraState,
    FormData
  >(editConstrutoraAction, null);

  const [cnpj, setCnpj] = useState(maskCNPJ(construtora.cnpj));
  const [telefone, setTelefone] = useState(
    construtora.telefone ? maskPhone(construtora.telefone) : "",
  );
  const [fidelizar, setFidelizar] = useState<"sim" | "nao">(
    construtora.fundoFidelizadoId ? "sim" : "nao",
  );
  const [fundoFidelizadoId, setFundoFidelizadoId] = useState<string>(
    construtora.fundoFidelizadoId ?? "",
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
      <input type="hidden" name="construtoraId" value={construtora.id} />

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
              value={cnpj}
              onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
              inputMode="numeric"
              className="form-input font-mono"
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
          <Field label="Email">
            <input
              name="email"
              type="email"
              defaultValue={construtora.email ?? ""}
              className="form-input"
            />
          </Field>
          <CepAddressFields
            initial={{
              cep: construtora.cep,
              endereco: construtora.endereco,
              cidade: construtora.cidade,
              uf: construtora.uf,
            }}
            optional
          />
        </div>
      </section>

      <section className="rounded-2xl border border-yellow-300/40 bg-yellow-50/40 p-6 md:p-7">
        <h3 className="font-bold mb-1">Fidelizar a um fundo?</h3>
        <p className="text-xs text-fg-muted mb-5">
          Se sim, todas as operações dessa construtora serão automaticamente
          vinculadas ao fundo escolhido (e usarão a taxa-base dele como padrão).
          O admin/fundo ainda pode customizar a taxa por operação na aprovação.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Fidelizar?">
            <select
              name="fidelizar"
              value={fidelizar}
              onChange={(e) => setFidelizar(e.target.value as "sim" | "nao")}
              className="form-input"
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </Field>
          {fidelizar === "sim" && (
            <Field label="Fundo responsável *">
              <select
                name="fundoFidelizadoId"
                value={fundoFidelizadoId}
                onChange={(e) => setFundoFidelizadoId(e.target.value)}
                className="form-input"
                required
              >
                <option value="">Selecione...</option>
                {fundos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nomeFantasia ?? f.razaoSocial} ·{" "}
                    {(parseFloat(f.taxaMensalBase) * 100)
                      .toFixed(2)
                      .replace(".", ",")}
                    % a.m.
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
        <h3 className="font-bold mb-1">Documentos KYC</h3>
        <p className="text-xs text-fg-muted mb-5">
          Faltando? Suba aqui mesmo. Os arquivos vão pro mesmo storage do
          onboarding.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <FileUploadField
            label="Contrato social"
            name="doc_contrato_social"
            tipo="contrato_social"
            folder={`kyc/construtora-${construtora.id}/contrato-social`}
            initial={initialDocs.contratoSocial ?? null}
          />
          <FileUploadField
            label="Comprovante de endereço"
            name="doc_comprovante_endereco"
            tipo="comprovante_endereco"
            folder={`kyc/construtora-${construtora.id}/comprovante-endereco`}
            initial={initialDocs.comprovanteEndereco ?? null}
          />
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
