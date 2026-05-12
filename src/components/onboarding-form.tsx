"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveCompanyDataAction,
  type SaveCompanyState,
} from "@/lib/actions/onboarding";
import { maskCNPJ, maskCEP, maskPhone, UF_LIST } from "@/lib/cnpj";
import { buscarCep, unmaskCep } from "@/lib/cep";
import { FileUploadField, type UploadedBlob } from "./file-upload-field";
import { useFeedback } from "@/components/feedback-provider";

type InitialValues = {
  nome: string;
  telefone: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  creci: string;
  email: string;
  cep: string;
  endereco: string;
  cidade: string;
  uf: string;
  bancoNome: string;
  bancoCodigo: string;
  bancoAgencia: string;
  bancoConta: string;
};

type InitialDocs = {
  contratoSocial: { url: string; name: string } | null;
  comprovanteEndereco: { url: string; name: string } | null;
  creci: { url: string; name: string } | null;
};

type Props = {
  role: "corretor" | "imobiliaria" | "construtora";
  initialValues?: Partial<InitialValues>;
  initialDocs?: InitialDocs;
};

const EMPTY_VALUES: InitialValues = {
  nome: "",
  telefone: "",
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  creci: "",
  email: "",
  cep: "",
  endereco: "",
  cidade: "",
  uf: "",
  bancoNome: "",
  bancoCodigo: "",
  bancoAgencia: "",
  bancoConta: "",
};

export function OnboardingForm({
  role,
  initialValues,
  initialDocs,
}: Props) {
  const [state, action, pending] = useActionState<SaveCompanyState, FormData>(
    saveCompanyDataAction,
    null,
  );
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  // Se a action retornou values (caso de erro), prioriza eles. Senão usa
  // o que veio do server (DB) ou vazio.
  const submitted =
    state && !state.ok && state.values ? state.values : null;
  const init = {
    ...EMPTY_VALUES,
    ...initialValues,
    ...(submitted ?? {}),
  };

  // Docs: prioriza submitted (do action), depois initialDocs (do DB)
  function docInitial(
    urlKey: string,
    nameKey: string,
    fallback: { url: string; name: string } | null,
  ) {
    const url = submitted?.[urlKey];
    if (url) return { url, name: submitted?.[nameKey] ?? "arquivo" };
    return fallback;
  }
  const initContratoSocial = docInitial(
    "doc_contrato_social",
    "doc_contrato_social_nome",
    initialDocs?.contratoSocial ?? null,
  );
  const initComprovEnd = docInitial(
    "doc_comprovante_endereco",
    "doc_comprovante_endereco_nome",
    initialDocs?.comprovanteEndereco ?? null,
  );
  const initCreci = docInitial(
    "doc_creci",
    "doc_creci_nome",
    initialDocs?.creci ?? null,
  );

  // Campos com máscara — controlled, com defaults persistidos do server
  const [cnpj, setCnpj] = useState(init.cnpj ? maskCNPJ(init.cnpj) : "");
  const [cep, setCep] = useState(init.cep ? maskCEP(init.cep) : "");
  const [endereco, setEndereco] = useState(init.endereco);
  const [cidade, setCidade] = useState(init.cidade);
  const [uf, setUf] = useState(init.uf);
  const [cepBuscando, setCepBuscando] = useState(false);
  const [cepErro, setCepErro] = useState<string | null>(null);

  // Quando CEP fica com 8 dígitos, busca automaticamente
  async function handleCepChange(raw: string) {
    const masked = maskCEP(raw);
    setCep(masked);
    setCepErro(null);
    if (unmaskCep(masked).length === 8) {
      setCepBuscando(true);
      const info = await buscarCep(masked);
      setCepBuscando(false);
      if (!info) {
        setCepErro("CEP não encontrado");
        return;
      }
      // Só preenche se o campo está vazio (não sobrescreve digitação manual)
      if (info.logradouro && !endereco) setEndereco(info.logradouro);
      if (info.cidade) setCidade(info.cidade);
      if (info.uf) setUf(info.uf);
    }
  }
  const [telefone, setTelefone] = useState(
    init.telefone ? maskPhone(init.telefone) : "",
  );

  const [docContratoSocial, setDocContratoSocial] =
    useState<UploadedBlob | null>(
      initContratoSocial
        ? {
            url: initContratoSocial.url,
            pathname: initContratoSocial.url,
            size: 0,
            name: initContratoSocial.name,
          }
        : null,
    );
  const [docComprovEndereco, setDocComprovEndereco] =
    useState<UploadedBlob | null>(
      initComprovEnd
        ? {
            url: initComprovEnd.url,
            pathname: initComprovEnd.url,
            size: 0,
            name: initComprovEnd.name,
          }
        : null,
    );
  const [docCreci, setDocCreci] = useState<UploadedBlob | null>(
    initCreci
      ? {
          url: initCreci.url,
          pathname: initCreci.url,
          size: 0,
          name: initCreci.name,
        }
      : null,
  );

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        "Seu cadastro foi enviado pra análise. Vamos avisar por email assim que aprovarmos.",
        "Cadastro completo",
      ).then(() => router.push(state.redirectTo));
    } else if (state && !state.ok) {
      alertError(state.error, "Erro no envio");
    }
  }, [state, router, alertSuccess, alertError]);

  const isCorretor = role === "corretor";
  const isConstrutora = role === "construtora";
  const hasInitial = Boolean(initialValues && (init.razaoSocial || init.cnpj));

  return (
    <form action={action} className="space-y-5">
      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {state.error}
        </div>
      )}
      {hasInitial && !state && (
        <div className="rounded-xl border border-accent/30 bg-accent-soft text-accent p-4 text-sm">
          Cadastro recuperado — atualize os campos que faltavam ou estão
          incorretos e envie de novo.
        </div>
      )}

      <Field
        name="nome"
        label="Seu nome (responsável)"
        required
        defaultValue={init.nome}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="razaoSocial"
          label={isCorretor ? "Razão social (ou seu nome)" : "Razão social"}
          required
          defaultValue={init.razaoSocial}
        />
        <Field
          name="nomeFantasia"
          label="Nome fantasia (opcional)"
          defaultValue={init.nomeFantasia}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="cnpj"
          label="CNPJ"
          value={cnpj}
          onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
          required
          placeholder="00.000.000/0000-00"
          inputMode="numeric"
        />
        <Field
          name="telefone"
          label="Telefone (WhatsApp)"
          value={telefone}
          onChange={(e) => setTelefone(maskPhone(e.target.value))}
          required
          placeholder="(00) 00000-0000"
          type="tel"
        />
      </div>

      {!isConstrutora && (
        <Field
          name="creci"
          label={isCorretor ? "CRECI (responsável técnico)" : "CRECI da imobiliária"}
          defaultValue={init.creci}
        />
      )}

      {isConstrutora && (
        <Field
          name="email"
          label="Email da empresa (opcional)"
          type="email"
          placeholder="contato@suaempresa.com.br"
          defaultValue={init.email}
        />
      )}

      {/* Dados bancários — só pra corretor/imobiliária (recebe a antecipação) */}
      {!isConstrutora && (
        <div className="border-t border-border pt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-3">
            dados bancários (recebimento)
          </div>
          <p className="text-xs text-fg-muted mb-4">
            Onde o valor da antecipação cai. Esses dados aparecem na cláusula
            3ª do contrato de cessão.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              name="bancoNome"
              label="Banco"
              required
              placeholder="Ex: Banco C6 S.A."
              defaultValue={init.bancoNome}
            />
            <Field
              name="bancoCodigo"
              label="Código (3 dígitos)"
              placeholder="336"
              inputMode="numeric"
              defaultValue={init.bancoCodigo}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field
              name="bancoAgencia"
              label="Agência"
              required
              placeholder="0001"
              inputMode="numeric"
              defaultValue={init.bancoAgencia}
            />
            <Field
              name="bancoConta"
              label="Conta corrente"
              required
              placeholder="40574449-8"
              defaultValue={init.bancoConta}
            />
          </div>
        </div>
      )}

      <div className="border-t border-border pt-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-3">
          endereço
        </div>
        <p className="text-xs text-fg-muted mb-3">
          Digite o CEP e os campos abaixo são preenchidos automaticamente.
        </p>
        <div className="mb-4">
          <Field
            name="cep"
            label={`CEP${cepBuscando ? " · buscando…" : ""}`}
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            required
            placeholder="00000-000"
            inputMode="numeric"
            className="sm:max-w-xs"
          />
          {cepErro && (
            <p className="mt-1 text-xs text-warn">{cepErro} — preencha manual abaixo.</p>
          )}
        </div>
        <Field
          name="endereco"
          label="Endereço completo"
          required
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
        />
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <Field
            name="cidade"
            label="Cidade"
            required
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="sm:col-span-2"
          />
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              UF<span className="ml-1 text-accent">*</span>
            </label>
            <select
              name="uf"
              required
              value={uf}
              onChange={(e) => setUf(e.target.value)}
              className="w-full h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors appearance-none cursor-pointer"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1.5L6 6.5L11 1.5' stroke='%235a6571' stroke-width='1.5' fill='none'/></svg>\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 16px center",
              }}
            >
              <option value="" disabled>
                UF
              </option>
              {UF_LIST.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* DOCUMENTOS KYC */}
      <div className="border-t border-border pt-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-4">
          documentos KYC
        </div>
        <div className="space-y-4">
          <FileUploadField
            label="Contrato social"
            name="doc_contrato_social"
            required
            tipo="contrato_social"
            folder="kyc/contrato-social"
            description="Última alteração contratual atualizada na Junta Comercial."
            initial={initContratoSocial}
            onChange={setDocContratoSocial}
          />
          <FileUploadField
            label="Comprovante de endereço"
            name="doc_comprovante_endereco"
            required
            tipo="comprovante_endereco"
            folder="kyc/comprovante-endereco"
            description="Conta de luz, água, telefone ou contrato de locação — últimos 90 dias."
            initial={initComprovEnd}
            onChange={setDocComprovEndereco}
          />
          {!isConstrutora && (
            <FileUploadField
              label="Comprovante de CRECI"
              name="doc_creci"
              required
              tipo="creci"
              folder="kyc/creci"
              description="Carteira ou certidão de regularidade do CRECI."
              initial={initCreci}
              onChange={setDocCreci}
            />
          )}
          {/* Hidden inputs com nome do arquivo (pra exibir lindo no painel admin) */}
          <input
            type="hidden"
            name="doc_contrato_social_nome"
            value={docContratoSocial?.name ?? ""}
          />
          <input
            type="hidden"
            name="doc_comprovante_endereco_nome"
            value={docComprovEndereco?.name ?? ""}
          />
          <input
            type="hidden"
            name="doc_creci_nome"
            value={docCreci?.name ?? ""}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !w-full justify-center !h-12"
      >
        {pending ? "Salvando..." : "Concluir cadastro"}
        <span className="arrow">→</span>
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  value,
  onChange,
  inputMode,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputMode?: "numeric" | "text" | "tel" | "email";
  className?: string;
}) {
  const controlled = value !== undefined;
  return (
    <div className={className}>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={controlled ? undefined : defaultValue}
        value={controlled ? value : undefined}
        onChange={onChange}
        inputMode={inputMode}
        className="w-full h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors"
      />
    </div>
  );
}
