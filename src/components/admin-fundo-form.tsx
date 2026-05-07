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
import { sanitizeFileName } from "@/lib/sanitize-filename";
import { toBlobProxyHref } from "@/lib/blob-url";
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
    const safeName = sanitizeFileName(file.name);
    const path = `fundos/contratos/${Date.now()}-${safeName}`;
    try {
      console.log("[fundo-contrato-upload] iniciando", {
        originalName: file.name,
        safeName,
        path,
        type: file.type,
        size: file.size,
      });
      const blob = await upload(path, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: file.type || undefined,
        onUploadProgress: (e) => setProgress(e.percentage),
      });
      setContratoUrl(blob.url);
      setContratoNome(file.name);
      console.log("[fundo-contrato-upload] ok", blob.url);
    } catch (e) {
      console.error("[fundo-contrato-upload] erro", e, { path, type: file.type });
      const msg = (e as Error).message || "Erro desconhecido";
      await alertError(
        `${msg}\n\nArquivo: ${file.name}\nTipo: ${file.type || "desconhecido"}\nTamanho: ${(file.size / 1024).toFixed(0)}KB`,
        "Erro ao enviar contrato",
      );
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
  const custoFinanceiroInicial = fundo
    ? (parseFloat(fundo.custoFinanceiroPct ?? "0") * 100)
        .toFixed(2)
        .replace(".", ",")
    : "";
  const impostosInicial = fundo
    ? (parseFloat(fundo.impostosPct ?? "0") * 100).toFixed(2).replace(".", ",")
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
                  href={toBlobProxyHref(contratoUrl)}
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

      {/* === Rateio interno (Antecipaqui) === */}
      <Card
        title="Rateio interno · Antecipaqui"
        subtitle="Configura como o juros de cada operação desse fundo é dividido. Visível só pelo admin no relatório de Invoice."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Custo financeiro / % rateio (% sobre o juros)">
            <div className="flex items-stretch rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
              <input
                name="custoFinanceiroPct"
                inputMode="decimal"
                placeholder="40,00"
                defaultValue={custoFinanceiroInicial}
                className="flex-1 min-w-0 bg-bg h-12 px-4 text-fg placeholder:text-fg-dim outline-none tabular text-right"
              />
              <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-sm font-mono border-l border-border-strong shrink-0">
                %
              </span>
            </div>
            <p className="mt-1 text-[11px] text-fg-dim">
              Fatia do juros que retorna pra Antecipaqui (rateio).
            </p>
          </Field>

          <Field label="Impostos do fundo (% sobre o juros)">
            <div className="flex items-stretch rounded-xl border border-border-strong overflow-hidden focus-within:border-accent transition-colors">
              <input
                name="impostosPct"
                inputMode="decimal"
                placeholder="4,50"
                defaultValue={impostosInicial}
                className="flex-1 min-w-0 bg-bg h-12 px-4 text-fg placeholder:text-fg-dim outline-none tabular text-right"
              />
              <span className="bg-bg-soft px-3 flex items-center text-fg-muted text-sm font-mono border-l border-border-strong shrink-0">
                %
              </span>
            </div>
            <p className="mt-1 text-[11px] text-fg-dim">
              PIS / COFINS / IR sobre o juros recebido.
            </p>
          </Field>
        </div>
      </Card>

      {/* === Dados bancários === */}
      <Card
        title="Dados bancários"
        subtitle="Conta usada pelo fundo pra receber pagamentos das duplicatas e enviar recursos pras antecipações."
      >
        <Grid>
          <Field label="Banco (nome)">
            <input
              name="bancoNome"
              defaultValue={fundo?.bancoNome ?? ""}
              placeholder="Ex: Itaú Unibanco"
              className="form-input"
            />
          </Field>
          <Field label="Código (ISPB / 3 dígitos)">
            <input
              name="bancoCodigo"
              defaultValue={fundo?.bancoCodigo ?? ""}
              placeholder="Ex: 341"
              className="form-input font-mono"
            />
          </Field>
          <Field label="Agência">
            <input
              name="bancoAgencia"
              defaultValue={fundo?.bancoAgencia ?? ""}
              placeholder="0001-2"
              className="form-input font-mono"
            />
          </Field>
          <Field label="Conta">
            <input
              name="bancoConta"
              defaultValue={fundo?.bancoConta ?? ""}
              placeholder="12345-6"
              className="form-input font-mono"
            />
          </Field>
          <Field label="Chave PIX">
            <input
              name="bancoPix"
              defaultValue={fundo?.bancoPix ?? ""}
              placeholder="CNPJ, email, telefone ou chave aleatória"
              className="form-input font-mono"
            />
          </Field>
        </Grid>
      </Card>

      {/* === Configurações: emissor de boletos + sistema de gestão === */}
      <Card
        title="Configurações"
        subtitle="Integrações externas usadas pelas operações do fundo."
      >
        <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-dim mb-3">
          banco emissor de boletos
        </h4>
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <Field label="Banco emissor">
            <input
              name="boletosBancoNome"
              defaultValue={fundo?.boletosBancoNome ?? ""}
              placeholder="Ex: Bradesco"
              className="form-input"
            />
          </Field>
          <Field label="Link da API de geração">
            <input
              name="boletosApiUrl"
              type="url"
              defaultValue={fundo?.boletosApiUrl ?? ""}
              placeholder="https://api.banco.com.br/v1/boletos"
              className="form-input font-mono text-xs"
            />
          </Field>
        </div>

        <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-dim mb-1">
          sistema de comunicação
        </h4>
        <p className="text-xs text-fg-muted mb-3">Qual seu sistema de gestão?</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome do sistema">
            <input
              name="sistemaGestaoNome"
              defaultValue={fundo?.sistemaGestaoNome ?? ""}
              placeholder="Ex: Omie, Bling, Conta Azul, ERP próprio..."
              className="form-input"
            />
          </Field>
          <Field label="Link da documentação de integração">
            <input
              name="sistemaGestaoDocsUrl"
              type="url"
              defaultValue={fundo?.sistemaGestaoDocsUrl ?? ""}
              placeholder="https://developer.sistema.com/docs/operacoes"
              className="form-input font-mono text-xs"
            />
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
