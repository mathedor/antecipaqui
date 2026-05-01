"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  createFundoAction,
  editFundoAction,
  type FundoState,
} from "@/lib/actions/fundos";
import { CepAddressFields } from "@/components/cep-address-fields";
import { useFeedback } from "@/components/feedback-provider";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";
import type { Fundo } from "@/db/schema";

type Props = {
  /** Fundo existente pra editar; ausente = criar novo. */
  fundo?: Fundo;
};

export function AdminFundoForm({ fundo }: Props) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const isEdit = Boolean(fundo);

  const [state, action, pending] = useActionState<FundoState, FormData>(
    isEdit ? editFundoAction : createFundoAction,
    null,
  );

  const [cnpj, setCnpj] = useState(
    fundo?.cnpj ? maskCNPJ(fundo.cnpj) : "",
  );
  const [telefone, setTelefone] = useState(
    fundo?.telefone ? maskPhone(fundo.telefone) : "",
  );

  // Upload do contrato
  const [contratoUrl, setContratoUrl] = useState(fundo?.contratoUrl ?? "");
  const [contratoNome, setContratoNome] = useState(fundo?.contratoNome ?? "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const blob = await upload(`fundos/contratos/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        onUploadProgress: (e) => setProgress(e.percentage),
      });
      setContratoUrl(blob.url);
      setContratoNome(file.name);
    } catch (e) {
      await alertError((e as Error).message, "Erro ao enviar contrato");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        isEdit ? "Cadastro do fundo atualizado." : "Fundo cadastrado.",
        "Salvo",
      ).then(() => {
        if (!isEdit) {
          router.push(`/admin/fundos/${state.fundoId}`);
        } else {
          router.refresh();
        }
      });
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao salvar");
    }
  }, [state, isEdit, alertSuccess, alertError, router]);

  // Taxa: aceita "6", "6%", "6,00", "0.06" — exibe sempre como percentual
  const taxaInicial = fundo
    ? (parseFloat(fundo.taxaMensalBase) * 100).toFixed(2).replace(".", ",")
    : "";

  return (
    <form action={action} className="space-y-6">
      {fundo && <input type="hidden" name="fundoId" value={fundo.id} />}
      <input type="hidden" name="contratoUrl" value={contratoUrl} />
      <input type="hidden" name="contratoNome" value={contratoNome} />

      <Card title="Dados da empresa">
        <Grid>
          <Field label="Razão social *">
            <input
              name="razaoSocial"
              required
              defaultValue={fundo?.razaoSocial ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Nome fantasia">
            <input
              name="nomeFantasia"
              defaultValue={fundo?.nomeFantasia ?? ""}
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
          <CepAddressFields
            initial={{
              cep: fundo?.cep,
              endereco: fundo?.endereco,
              cidade: fundo?.cidade,
              uf: fundo?.uf,
            }}
            optional
          />
        </Grid>
      </Card>

      <Card
        title="Contato e responsável"
        subtitle="Pessoa que representa o fundo. Telefone com WhatsApp."
      >
        <Grid>
          <Field label="Nome do contato responsável">
            <input
              name="contatoResponsavel"
              defaultValue={fundo?.contatoResponsavel ?? ""}
              className="form-input"
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
          <Field label="Email comercial *">
            <input
              name="emailComercial"
              type="email"
              required
              defaultValue={fundo?.emailComercial ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Email para assinatura *">
            <input
              name="emailAssinatura"
              type="email"
              required
              defaultValue={fundo?.emailAssinatura ?? ""}
              placeholder="contratos@..."
              className="form-input"
            />
          </Field>
        </Grid>
      </Card>

      <Card
        title="Operação"
        subtitle="Taxa-base do fundo + contrato modelo. Cada operação pode ter taxa customizada na aprovação."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Taxa de juros base (% a.m.) *">
            <div className="flex items-stretch rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
              <input
                name="taxaMensalBase"
                required
                inputMode="decimal"
                placeholder="6,00"
                defaultValue={taxaInicial}
                className="flex-1 min-w-0 bg-bg h-12 px-4 text-fg placeholder:text-fg-dim outline-none tabular text-right"
              />
              <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-sm font-mono border-l border-border-strong shrink-0">
                % a.m.
              </span>
            </div>
            <p className="mt-1 text-[11px] text-fg-dim">
              Limites: 0,1% a 50% ao mês.
            </p>
          </Field>

          <Field label="Contrato modelo (PDF)">
            {contratoUrl ? (
              <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-success/50 bg-green-50 text-sm">
                <span className="size-5 rounded-full bg-success text-white text-[10px] flex items-center justify-center shrink-0">
                  ✓
                </span>
                <a
                  href={contratoUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex-1 truncate text-fg hover:text-accent"
                  title={contratoNome}
                >
                  {contratoNome || "Contrato"}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setContratoUrl("");
                    setContratoNome("");
                  }}
                  className="text-fg-dim hover:text-danger text-xs"
                  aria-label="Remover"
                >
                  ✕
                </button>
              </div>
            ) : uploading ? (
              <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-accent/50 bg-accent-soft text-sm">
                <div className="flex-1">
                  <div className="text-fg text-xs mb-1">Enviando…</div>
                  <div className="h-1 bg-bg-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <span className="font-mono text-xs text-accent tabular">
                  {Math.round(progress)}%
                </span>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-border-strong bg-bg hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer text-sm text-fg-muted">
                + Selecionar contrato
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
            )}
          </Field>
        </div>
      </Card>

      <button type="submit" disabled={pending} className="btn-primary !h-12 !px-6">
        {pending
          ? "Salvando..."
          : isEdit
            ? "Salvar alterações"
            : "Cadastrar fundo"}
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
