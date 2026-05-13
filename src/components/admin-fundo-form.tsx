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

      <Card
        title="Encargos de atraso"
        subtitle="Cobrados automaticamente quando parcela vence. Padrão de mercado: multa 2% + juros 1%/mês."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Multa por atraso (%)">
            <input
              name="multaAtrasoPct"
              defaultValue={
                fundo
                  ? (parseFloat(fundo.multaAtrasoPct) * 100)
                      .toFixed(2)
                      .replace(".", ",")
                  : "2"
              }
              placeholder="2"
              className="form-input"
            />
            <p className="text-xs text-fg-dim mt-1">Aplicada uma vez sobre o valor da parcela.</p>
          </Field>
          <Field label="Juros de mora mensais (%)">
            <input
              name="jurosMoraMensalPct"
              defaultValue={
                fundo
                  ? (parseFloat(fundo.jurosMoraMensalPct) * 100)
                      .toFixed(2)
                      .replace(".", ",")
                  : "1"
              }
              placeholder="1"
              className="form-input"
            />
            <p className="text-xs text-fg-dim mt-1">Pro rata die a partir do vencimento.</p>
          </Field>
        </div>
      </Card>

      <CobrancaCard fundo={fundo} />

      <AssinaturaDigitalCard fundo={fundo} />

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

function CobrancaCard({ fundo }: { fundo?: Fundo }) {
  const [modo, setModo] = useState<string>(fundo?.boletosModo ?? "manual");

  return (
    <Card
      title="Cobrança / emissão de boleto"
      subtitle="Como esse fundo emite e baixa boletos. Escolha o modo abaixo."
    >
      <Field label="Modo de cobrança">
        <select
          name="boletosModo"
          value={modo}
          onChange={(e) => setModo(e.target.value)}
          className="form-input"
        >
          <option value="manual">
            Manual — admin gera e baixa direto no banco
          </option>
          <option value="api">
            API — fundo expõe API REST pra geração + webhook pra baixa
          </option>
          <option value="cnab">
            CNAB — gera arquivo de remessa, importa retorno em lote
          </option>
        </select>
      </Field>

      {modo === "api" && (
        <div className="space-y-3 mt-4 p-4 rounded-xl bg-bg border border-border">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-dim">
            configuração API
          </h4>
          <Field label="URL da API de geração">
            <input
              name="cobrancaApiUrl"
              defaultValue={fundo?.cobrancaApiUrl ?? ""}
              placeholder="https://api.banco.com/boletos"
              className="form-input font-mono text-xs"
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tipo de autenticação">
              <select
                name="cobrancaApiAuthTipo"
                defaultValue={fundo?.cobrancaApiAuthTipo ?? ""}
                className="form-input"
              >
                <option value="">— escolha —</option>
                <option value="api_key">API Key</option>
                <option value="basic">HTTP Basic Auth</option>
                <option value="oauth">OAuth 2.0 (Client Credentials)</option>
              </select>
            </Field>
            <Field label="Segredo do webhook (HMAC)">
              <input
                name="cobrancaWebhookSecret"
                defaultValue={fundo?.cobrancaWebhookSecret ?? ""}
                placeholder="aleatório, ≥32 chars"
                className="form-input font-mono text-xs"
              />
            </Field>
          </div>
          <Field label="Credenciais (JSON)">
            <textarea
              name="cobrancaApiCredenciais"
              defaultValue={
                fundo?.cobrancaApiCredenciais
                  ? JSON.stringify(fundo.cobrancaApiCredenciais, null, 2)
                  : ""
              }
              rows={4}
              placeholder={`Ex: { "apiKey": "..." }  ou  { "clientId": "...", "clientSecret": "..." }`}
              className="form-input font-mono text-xs"
            />
            <p className="text-xs text-fg-dim mt-1">
              Estrutura varia conforme tipo de auth. Mantenha em JSON válido.
            </p>
          </Field>
          <div className="rounded-lg border border-warn/40 bg-yellow-50 p-3 text-xs text-warn">
            ⚠ Integração específica por banco precisa ser implementada no
            código quando definir o provedor. O webhook receiver está em{" "}
            <code className="font-mono">/api/cobranca/webhook/[fundoId]</code>.
          </div>
        </div>
      )}

      {modo === "cnab" && (
        <div className="space-y-3 mt-4 p-4 rounded-xl bg-bg border border-border">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-dim">
            configuração CNAB
          </h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Layout">
              <select
                name="cnabLayout"
                defaultValue={fundo?.cnabLayout ?? "240"}
                className="form-input"
              >
                <option value="240">CNAB 240 (FEBRABAN)</option>
                <option value="400">CNAB 400 (legado)</option>
              </select>
            </Field>
            <Field label="Código do banco (3 dígitos)">
              <input
                name="cnabBancoCodigo"
                defaultValue={
                  fundo?.cnabBancoCodigo ?? fundo?.bancoCodigo ?? ""
                }
                placeholder="001 / 341 / 237..."
                className="form-input font-mono"
                maxLength={3}
              />
            </Field>
            <Field label="Carteira">
              <input
                name="cnabCarteira"
                defaultValue={fundo?.cnabCarteira ?? ""}
                placeholder="ex: 17"
                className="form-input font-mono"
              />
            </Field>
            <Field label="Convênio">
              <input
                name="cnabConvenio"
                defaultValue={fundo?.cnabConvenio ?? ""}
                placeholder="código convênio"
                className="form-input font-mono"
              />
            </Field>
            <Field label="Código do cedente">
              <input
                name="cnabCedenteCodigo"
                defaultValue={fundo?.cnabCedenteCodigo ?? ""}
                placeholder="código cedente"
                className="form-input font-mono"
              />
            </Field>
          </div>
          <div className="rounded-lg border border-success/40 bg-green-50 p-3 text-xs text-success">
            ✓ Layout 240 FEBRABAN suportado pra geração de remessa. Bancos
            específicos podem precisar ajustes em campos reservados — testar
            com arquivo real do banco antes de produção.
          </div>
        </div>
      )}

      {modo === "manual" && (
        <div className="rounded-lg border border-border bg-bg-card p-3 text-xs text-fg-muted">
          Modo manual: admin emite o boleto direto no banco do fundo e marca
          a parcela como paga quando o pagamento entrar.
        </div>
      )}
    </Card>
  );
}

export function AssinaturaDigitalCard({ fundo }: { fundo?: Fundo }) {
  const [usaPadrao, setUsaPadrao] = useState<boolean>(
    fundo?.assinaturaUsaPadrao ?? true,
  );

  return (
    <Card
      title="Assinatura digital do contrato"
      subtitle="Como esse fundo coleta assinaturas no contrato gerado por operação."
    >
      <Field label="Sistema de assinatura">
        <select
          name="assinaturaUsaPadrao"
          value={usaPadrao ? "true" : "false"}
          onChange={(e) => setUsaPadrao(e.target.value === "true")}
          className="form-input"
        >
          <option value="true">Usar o padrão Antecipaqui (ZapSign)</option>
          <option value="false">Usar sistema próprio do fundo</option>
        </select>
      </Field>

      {!usaPadrao && (
        <div className="space-y-3 mt-4 p-4 rounded-xl bg-bg border border-border">
          <h4 className="font-mono text-[11px] uppercase tracking-wider text-fg-dim">
            sistema próprio do fundo
          </h4>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nome do sistema">
              <input
                name="assinaturaSistema"
                defaultValue={fundo?.assinaturaSistema ?? ""}
                placeholder="D4Sign / Clicksign / AutentiQue / próprio..."
                className="form-input"
              />
            </Field>
            <Field label="URL da API">
              <input
                name="assinaturaApiUrl"
                type="url"
                defaultValue={fundo?.assinaturaApiUrl ?? ""}
                placeholder="https://api.sistema.com/v1/documents"
                className="form-input font-mono text-xs"
              />
            </Field>
          </div>
          <Field label="Credenciais (JSON)">
            <textarea
              name="assinaturaApiCredenciais"
              defaultValue={
                fundo?.assinaturaApiCredenciais
                  ? JSON.stringify(fundo.assinaturaApiCredenciais, null, 2)
                  : ""
              }
              rows={4}
              placeholder={`Ex: { "apiKey": "..." }  ou  { "token": "..." }  ou  { "clientId": "...", "clientSecret": "..." }`}
              className="form-input font-mono text-xs"
            />
            <p className="text-xs text-fg-dim mt-1">
              Estrutura depende do sistema. Mantenha JSON válido.
            </p>
          </Field>
          <div className="rounded-lg border border-warn/40 bg-yellow-50 p-3 text-xs text-warn">
            ⚠ Integração específica de cada provedor precisa ser implementada
            no código quando o fundo definir. Hoje envio padrão usa ZapSign.
          </div>
        </div>
      )}
    </Card>
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
