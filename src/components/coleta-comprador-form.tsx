"use client";

import { useState } from "react";
import { submeterColetaComprador } from "@/lib/actions/corretor-velocidade";
import { maskCNPJ, maskPhone, maskCEP } from "@/lib/cnpj";
import { buscarCep } from "@/lib/cep";

function maskCpfCnpj(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return maskCNPJ(d);
}

export function ColetaCompradorForm({ token }: { token: string }) {
  const [tipoPessoa, setTipoPessoa] = useState<"fisica" | "juridica">(
    "fisica",
  );
  const [documento, setDocumento] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onCepChange(v: string) {
    const masked = maskCEP(v);
    setCep(masked);
    const clean = masked.replace(/\D/g, "");
    if (clean.length === 8) {
      try {
        const r = await buscarCep(clean);
        if (r) {
          setEndereco(r.logradouro);
          setCidade(r.cidade);
          setUf(r.uf);
        }
      } catch {
        /* ignora */
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const r = await submeterColetaComprador(token, {
        tipoPessoa,
        nome,
        documento,
        telefone,
        email,
        endereco,
        cidade,
        uf,
        cep,
      });
      if (r.ok) setSuccess(true);
      else setError(r.error);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-success/40 bg-green-50 p-6 text-center">
        <div className="text-3xl mb-2">✓</div>
        <h2 className="font-bold mb-1">Pronto!</h2>
        <p className="text-sm text-fg-muted">
          Dados enviados. O corretor recebe e continua a operação. Pode
          fechar essa página.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-bg-elev p-6 space-y-4"
    >
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTipoPessoa("fisica")}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold border ${
            tipoPessoa === "fisica"
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-fg-muted"
          }`}
        >
          Pessoa física
        </button>
        <button
          type="button"
          onClick={() => setTipoPessoa("juridica")}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold border ${
            tipoPessoa === "juridica"
              ? "border-accent bg-accent-soft text-accent"
              : "border-border text-fg-muted"
          }`}
        >
          Pessoa jurídica
        </button>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          {tipoPessoa === "fisica" ? "CPF" : "CNPJ"}
        </label>
        <input
          value={documento}
          onChange={(e) => setDocumento(maskCpfCnpj(e.target.value))}
          className="form-input font-mono"
          required
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          {tipoPessoa === "fisica" ? "Nome completo" : "Razão social"}
        </label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="form-input"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Telefone
          </label>
          <input
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            className="form-input font-mono"
            inputMode="tel"
            required
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            CEP
          </label>
          <input
            value={cep}
            onChange={(e) => onCepChange(e.target.value)}
            className="form-input font-mono"
            placeholder="00000-000"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Endereço
          </label>
          <input
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Cidade
          </label>
          <input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            UF
          </label>
          <input
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            className="form-input font-mono uppercase"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar dados"}
      </button>

      <p className="text-xs text-fg-dim text-center">
        Esses dados serão usados apenas pra emitir os boletos da sua compra.
        Antecipaqui é parceira do corretor e da construtora.
      </p>
    </form>
  );
}
