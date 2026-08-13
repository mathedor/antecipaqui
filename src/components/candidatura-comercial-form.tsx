"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  candidaturaComercialAction,
  type CandidaturaComercialState,
} from "@/lib/actions/comercial-candidatura";
import { CepAddressFields } from "@/components/cep-address-fields";
import { maskCNPJ, maskCPF, maskPhone } from "@/lib/cnpj";

export function CandidaturaComercialForm() {
  const [state, action, pending] = useActionState<
    CandidaturaComercialState,
    FormData
  >(candidaturaComercialAction, null);

  const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">("fisica");
  const [documento, setDocumento] = useState("");
  const [telefone, setTelefone] = useState("");

  function handleDocChange(raw: string) {
    setDocumento(tipoPessoa === "fisica" ? maskCPF(raw) : maskCNPJ(raw));
  }

  function handleTipoChange(tp: "fisica" | "juridica") {
    setTipoPessoa(tp);
    setDocumento("");
  }

  if (state?.ok) {
    return (
      <section className="rounded-2xl border border-accent/40 bg-bg-elev p-8 md:p-10 text-center">
        <div className="text-4xl mb-4" aria-hidden>
          ✅
        </div>
        <h2 className="text-2xl font-bold mb-3">
          Recebemos sua solicitação, {state.nome}!
        </h2>
        <p className="text-fg-muted leading-relaxed max-w-lg mx-auto">
          Sua ficha caiu direto na mesa do administrador da Antecipaqui. Assim
          que for aprovada você recebe um e-mail com o convite pra criar sua
          senha — e seu login já abre o <b>painel do comercial</b>, com mapa de
          prospects, pipeline, comissões e o seu link de convite.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/apresentacao/comercial"
            className="h-12 px-6 rounded-xl border border-border text-fg font-bold text-sm inline-flex items-center hover:border-accent transition"
          >
            Ver o que você vai encontrar no painel
          </Link>
          <Link
            href="/"
            className="h-12 px-6 rounded-xl bg-accent text-white font-bold text-sm inline-flex items-center hover:bg-accent-dark transition"
          >
            Voltar ao início
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form action={action} className="space-y-6">
      {state && !state.ok && (
        <div
          role="alert"
          className="rounded-xl border border-danger/50 bg-danger/5 px-5 py-4 text-sm text-danger leading-relaxed"
        >
          {state.error}
        </div>
      )}

      <Card
        title="Você vai atuar como"
        subtitle="Pessoa física recebe como autônomo; pessoa jurídica emite nota pela própria empresa. Dá pra mudar depois."
      >
        <div className="flex gap-2">
          {(["fisica", "juridica"] as const).map((tp) => (
            <label
              key={tp}
              className={`chip cursor-pointer transition-colors hover:border-accent ${
                tipoPessoa === tp ? "chip-accent" : ""
              }`}
            >
              <input
                type="radio"
                name="tipoPessoa"
                value={tp}
                checked={tipoPessoa === tp}
                onChange={() => handleTipoChange(tp)}
                className="hidden"
              />
              {tp === "fisica" ? "Pessoa Física" : "Pessoa Jurídica"}
            </label>
          ))}
        </div>
      </Card>

      <Card title={tipoPessoa === "fisica" ? "Seus dados" : "Sua empresa"}>
        <Grid>
          <Field
            label={tipoPessoa === "fisica" ? "Nome completo *" : "Razão social *"}
          >
            <input name="nomeCompleto" required className="form-input" />
          </Field>
          <Field
            label={tipoPessoa === "fisica" ? "Como te chamam" : "Nome fantasia"}
          >
            <input name="apelido" className="form-input" />
          </Field>
          <Field label={tipoPessoa === "fisica" ? "CPF *" : "CNPJ *"}>
            <input
              name="documento"
              required
              value={documento}
              onChange={(e) => handleDocChange(e.target.value)}
              inputMode="numeric"
              placeholder={
                tipoPessoa === "fisica" ? "000.000.000-00" : "00.000.000/0000-00"
              }
              className="form-input font-mono"
            />
          </Field>
          <CepAddressFields />
        </Grid>
      </Card>

      <Card
        title="Contato"
        subtitle="O e-mail vira o seu login. Use um que você acessa todo dia — é por ele que o convite chega."
      >
        <Grid>
          <Field label="E-mail *">
            <input
              name="email"
              type="email"
              required
              className="form-input font-mono text-xs"
            />
          </Field>
          <Field label="Telefone / WhatsApp *">
            <input
              name="telefone"
              required
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              inputMode="tel"
              placeholder="(00) 00000-0000"
              className="form-input"
            />
          </Field>
        </Grid>
      </Card>

      <Card
        title="Sua experiência"
        subtitle="Conta rapidinho: já atuou no mercado imobiliário? Tem relacionamento com imobiliárias ou construtoras? Isso acelera a análise."
      >
        <textarea
          name="experiencia"
          rows={5}
          maxLength={2000}
          placeholder="Ex: trabalho há 6 anos com corretagem em Balneário Camboriú, tenho contato direto com 12 imobiliárias e 3 construtoras da região…"
          className="form-input resize-y"
        />
      </Card>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !h-12 !px-6 w-full sm:w-auto"
      >
        {pending ? "Enviando…" : "Enviar solicitação"}
      </button>

      <p className="text-xs text-fg-dim leading-relaxed">
        Ao enviar, você concorda que a Antecipaqui use esses dados pra analisar
        sua entrada no time comercial. Cadastro gratuito, sem exclusividade e
        sem meta obrigatória. Já tem acesso?{" "}
        <Link href="/entrar" className="text-accent hover:underline">
          Entrar
        </Link>
        .
      </p>
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
      {subtitle ? (
        <p className="text-xs text-fg-muted mb-5 leading-relaxed">{subtitle}</p>
      ) : (
        <div className="mb-5" />
      )}
      <div className="space-y-4">{children}</div>
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
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
  );
}
