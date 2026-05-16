"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  cadastrarImobiliariaExpress,
  type CadastrarImobExpressResult,
} from "@/lib/actions/comercial-cadastrar-imob";

export function CadastrarImobExpressForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CadastrarImobExpressResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const [nomeCorretor, setNomeCorretor] = useState("");
  const [emailCorretor, setEmailCorretor] = useState("");
  const [telefoneCorretor, setTelefoneCorretor] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [creci, setCreci] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const submit = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const r = await cadastrarImobiliariaExpress({
          nomeCorretor,
          emailCorretor,
          telefoneCorretor,
          razaoSocial,
          nomeFantasia,
          cnpj,
          creci,
          cep,
          endereco,
          cidade,
          uf,
        });
        if (!r.ok) {
          setError(r.error ?? "Erro desconhecido");
        } else {
          setResult(r);
        }
      } catch (e) {
        setError((e as Error).message);
      }
    });
  };

  if (result?.ok) {
    return <SuccessPanel result={result} onNew={() => setResult(null)} />;
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Section title="Dados do corretor (vira o login da imobiliária)">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nome completo *">
            <input
              type="text"
              value={nomeCorretor}
              onChange={(e) => setNomeCorretor(e.target.value)}
              required
              className="form-input"
            />
          </Field>
          <Field label="Email *">
            <input
              type="email"
              value={emailCorretor}
              onChange={(e) => setEmailCorretor(e.target.value)}
              required
              className="form-input"
            />
          </Field>
          <Field label="Telefone (com DDD) *">
            <input
              type="tel"
              value={telefoneCorretor}
              onChange={(e) => setTelefoneCorretor(e.target.value)}
              required
              placeholder="(11) 99999-9999"
              className="form-input"
            />
          </Field>
          <Field label="CRECI (opcional)">
            <input
              type="text"
              value={creci}
              onChange={(e) => setCreci(e.target.value)}
              className="form-input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Dados da imobiliária">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Razão social *">
            <input
              type="text"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              required
              className="form-input"
            />
          </Field>
          <Field label="Nome fantasia">
            <input
              type="text"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              className="form-input"
            />
          </Field>
          <Field label="CNPJ *">
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              required
              placeholder="00.000.000/0000-00"
              className="form-input"
            />
          </Field>
          <Field label="CEP">
            <input
              type="text"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="00000-000"
              className="form-input"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Endereço">
              <input
                type="text"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua, número, complemento"
                className="form-input"
              />
            </Field>
          </div>
          <Field label="Cidade">
            <input
              type="text"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className="form-input"
            />
          </Field>
          <Field label="UF">
            <input
              type="text"
              value={uf}
              onChange={(e) =>
                setUf(e.target.value.toUpperCase().slice(0, 2))
              }
              maxLength={2}
              className="form-input"
            />
          </Field>
        </div>
      </Section>

      {error && (
        <div className="rounded-2xl border border-danger/40 bg-red-50 p-4 text-danger text-sm font-semibold">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !h-12 !px-6 disabled:opacity-50"
      >
        {pending ? "Cadastrando..." : "Cadastrar e gerar WhatsApp"}
      </button>
    </form>
  );
}

function SuccessPanel({
  result,
  onNew,
}: {
  result: CadastrarImobExpressResult;
  onNew: () => void;
}) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedSenha, setCopiedSenha] = useState(false);

  const copy = async (
    text: string,
    setter: (v: boolean) => void,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-success bg-green-50 p-6 md:p-7">
        <div className="text-3xl mb-2">🎉</div>
        <h2 className="text-2xl font-bold text-success mb-1">
          Imobiliária cadastrada
        </h2>
        <p className="text-sm text-fg-muted">
          {result.reaproveitouUser
            ? "O email já tinha conta na Antecipaqui — só vinculei a nova imobiliária à sua carteira."
            : "Login criado. Mande o WhatsApp abaixo pro corretor entrar."}
        </p>
      </div>

      {!result.reaproveitouUser && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-3">
            credenciais geradas
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-muted font-mono uppercase tracking-wider w-14">
                email
              </span>
              <code className="flex-1 font-mono text-sm bg-bg-card px-2 py-1.5 rounded">
                {result.email}
              </code>
              <button
                type="button"
                onClick={() =>
                  copy(result.email ?? "", setCopiedEmail)
                }
                className="text-xs font-semibold px-2.5 py-1 rounded bg-fg text-bg hover:bg-fg/90"
              >
                {copiedEmail ? "✓" : "copiar"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-fg-muted font-mono uppercase tracking-wider w-14">
                senha
              </span>
              <code className="flex-1 font-mono text-sm bg-bg-card px-2 py-1.5 rounded">
                {result.senhaTemp}
              </code>
              <button
                type="button"
                onClick={() =>
                  copy(result.senhaTemp ?? "", setCopiedSenha)
                }
                className="text-xs font-semibold px-2.5 py-1 rounded bg-fg text-bg hover:bg-fg/90"
              >
                {copiedSenha ? "✓" : "copiar"}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-fg-muted mt-3">
            ⚠️ Anote ou copie agora — a senha não vai aparecer de novo.
            O corretor pode trocar depois pelo perfil.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {result.whatsappLink && (
          <a
            href={result.whatsappLink}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-success text-white text-sm font-semibold hover:bg-success/90"
          >
            💬 Abrir WhatsApp com mensagem pronta
          </a>
        )}
        <Link
          href={`/painel/operacoes/nova`}
          className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-accent bg-accent-soft text-accent text-sm font-semibold hover:bg-accent hover:text-white"
        >
          + Cadastrar primeira operação pra essa imob
        </Link>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 h-12 px-5 rounded-xl border border-border bg-bg-elev text-fg text-sm font-semibold hover:border-accent hover:text-accent"
        >
          Cadastrar outra
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <h3 className="font-bold tracking-tight text-base mb-4">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono block">
        {label}
      </span>
      {children}
    </label>
  );
}
