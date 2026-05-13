"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { upload } from "@vercel/blob/client";
import {
  editFundoSelfAction,
  type FundoState,
} from "@/lib/actions/fundos";
import { CepAddressFields } from "@/components/cep-address-fields";
import { useFeedback } from "@/components/feedback-provider";
import { maskPhone } from "@/lib/cnpj";
import { sanitizeFileName } from "@/lib/sanitize-filename";
import { toBlobProxyHref } from "@/lib/blob-url";
import { AssinaturaDigitalCard } from "@/components/admin-fundo-form";
import type { Fundo } from "@/db/schema";

type Props = {
  fundo: Fundo;
};

export function FundoSelfEditForm({ fundo }: Props) {
  const router = useRouter();
  const clerk = useClerk();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<FundoState, FormData>(
    editFundoSelfAction,
    null,
  );

  const [telefone, setTelefone] = useState(
    fundo.telefone ? maskPhone(fundo.telefone) : "",
  );

  const [contratoUrl, setContratoUrl] = useState(fundo.contratoUrl ?? "");
  const [contratoNome, setContratoNome] = useState(fundo.contratoNome ?? "");
  const [contratoUploading, setContratoUploading] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      alertSuccess("Dados atualizados.", "Salvo");
      router.refresh();
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao salvar");
    }
  }, [state, alertSuccess, alertError, router]);

  async function handleContrato(file: File) {
    setContratoUploading(true);
    try {
      const path = `fundos/${fundo.id}/contrato/${sanitizeFileName(file.name)}`;
      const blob = await upload(path, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
      });
      setContratoUrl(blob.pathname);
      setContratoNome(file.name);
    } catch (e) {
      await alertError((e as Error).message, "Erro no upload");
    } finally {
      setContratoUploading(false);
    }
  }

  return (
    <form action={action} className="space-y-6">
      <Card
        title="Dados gerais"
        subtitle="Nome fantasia, contato e endereço. Razão social/CNPJ/taxa só admin altera."
      >
        <div className="grid grid-cols-12 gap-3">
          <RO label="Razão social" value={fundo.razaoSocial} className="col-span-8" />
          <RO label="CNPJ" mono value={fundo.cnpj} className="col-span-4" />
          <RO
            label="Taxa-base (custo do dinheiro)"
            mono
            value={`${(parseFloat(fundo.taxaMensalBase) * 100).toFixed(2).replace(".", ",")}% a.m.`}
            className="col-span-6"
          />
          <Field label="Nome fantasia" className="col-span-6">
            <input
              name="nomeFantasia"
              defaultValue={fundo.nomeFantasia ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Contato responsável" className="col-span-6">
            <input
              name="contatoResponsavel"
              defaultValue={fundo.contatoResponsavel ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Telefone" className="col-span-6">
            <input
              name="telefone"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              className="form-input"
            />
          </Field>
          <Field label="Email comercial" className="col-span-6">
            <input
              name="emailComercial"
              type="email"
              defaultValue={fundo.emailComercial ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Email para assinatura" className="col-span-6">
            <input
              name="emailAssinatura"
              type="email"
              defaultValue={fundo.emailAssinatura ?? ""}
              className="form-input"
            />
          </Field>
        </div>
      </Card>

      <Card title="Endereço">
        <CepAddressFields
          initial={{
            cep: fundo.cep ?? "",
            endereco: fundo.endereco ?? "",
            cidade: fundo.cidade ?? "",
            uf: fundo.uf ?? "",
          }}
          prefix=""
        />
      </Card>

      <Card title="Dados bancários para recebimento">
        <div className="grid grid-cols-12 gap-3">
          <Field label="Banco" className="col-span-6">
            <input
              name="bancoNome"
              defaultValue={fundo.bancoNome ?? ""}
              className="form-input"
            />
          </Field>
          <Field label="Código (3 dígitos)" className="col-span-3">
            <input
              name="bancoCodigo"
              defaultValue={fundo.bancoCodigo ?? ""}
              maxLength={3}
              className="form-input font-mono"
            />
          </Field>
          <Field label="Agência" className="col-span-3">
            <input
              name="bancoAgencia"
              defaultValue={fundo.bancoAgencia ?? ""}
              className="form-input font-mono"
            />
          </Field>
          <Field label="Conta" className="col-span-6">
            <input
              name="bancoConta"
              defaultValue={fundo.bancoConta ?? ""}
              className="form-input font-mono"
            />
          </Field>
          <Field label="Chave Pix" className="col-span-6">
            <input
              name="bancoPix"
              defaultValue={fundo.bancoPix ?? ""}
              placeholder="CNPJ, email ou aleatória"
              className="form-input font-mono"
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Contrato modelo"
        subtitle="Será usado como base para gerar o contrato de cada operação."
      >
        <input type="hidden" name="contratoUrl" value={contratoUrl} />
        <input type="hidden" name="contratoNome" value={contratoNome} />
        <div className="space-y-2">
          <input
            type="file"
            accept="application/pdf,.doc,.docx"
            disabled={contratoUploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleContrato(f);
            }}
            className="block w-full text-sm text-fg file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-dark"
          />
          {contratoUploading && (
            <div className="text-xs text-fg-dim">Enviando...</div>
          )}
          {contratoUrl && (
            <div className="text-xs">
              ✓ <strong className="font-mono">{contratoNome}</strong> —{" "}
              <a
                href={toBlobProxyHref(contratoUrl)}
                target="_blank"
                rel="noopener"
                className="text-accent hover:underline"
              >
                visualizar
              </a>
            </div>
          )}
        </div>
      </Card>

      <AssinaturaDigitalCard fundo={fundo} />

      <Card
        title="Conta e senha"
        subtitle="Senha, métodos de login. Abre o painel oficial Clerk."
      >
        <button
          type="button"
          onClick={() => clerk.openUserProfile()}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-semibold text-sm transition-colors"
        >
          🔒 Trocar senha · gerenciar conta
        </button>
      </Card>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !h-12 !px-6"
      >
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
      {subtitle && <p className="text-xs text-fg-muted mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}

function RO({
  label,
  value,
  mono = false,
  className = "",
}: {
  label: string;
  value: string | null;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      <div
        className={`form-input opacity-60 cursor-not-allowed ${mono ? "font-mono" : ""}`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
