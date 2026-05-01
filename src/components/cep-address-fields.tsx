"use client";

import { useState } from "react";
import { maskCEP } from "@/lib/cnpj";
import { buscarCep, unmaskCep } from "@/lib/cep";

type Props = {
  /** Prefixo dos names dos inputs (ex: "" → cep/endereco/cidade/uf;
   *  "imob" → imobCep/imobEndereco/imobCidade/imobUf). */
  prefix?: string;
  initial?: {
    cep?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  /** Se true, aceita campos vazios (uso em forms de edição). */
  optional?: boolean;
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const fieldName = (prefix: string, base: string) =>
  prefix ? `${prefix}${cap(base)}` : base;

/**
 * Bloco reusável: CEP com lookup ViaCEP que preenche endereço/cidade/UF.
 * Os campos são controlados via state local e submetidos como inputs normais
 * (pra funcionar com forms server-side).
 */
export function CepAddressFields({
  prefix = "",
  initial = {},
  optional = false,
}: Props) {
  const [cep, setCep] = useState(initial.cep ? maskCEP(initial.cep) : "");
  const [endereco, setEndereco] = useState(initial.endereco ?? "");
  const [cidade, setCidade] = useState(initial.cidade ?? "");
  const [uf, setUf] = useState(initial.uf ?? "");
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleCepChange(raw: string) {
    const masked = maskCEP(raw);
    setCep(masked);
    setErro(null);
    if (unmaskCep(masked).length === 8) {
      setBuscando(true);
      const info = await buscarCep(masked);
      setBuscando(false);
      if (!info) {
        setErro("CEP não encontrado");
        return;
      }
      if (info.logradouro) setEndereco(info.logradouro);
      if (info.cidade) setCidade(info.cidade);
      if (info.uf) setUf(info.uf);
    }
  }

  return (
    <>
      <Field label={`CEP${optional ? "" : " *"}`}>
        <input
          name={fieldName(prefix, "cep")}
          value={cep}
          onChange={(e) => handleCepChange(e.target.value)}
          placeholder="00000-000"
          inputMode="numeric"
          required={!optional}
          className="form-input"
        />
        {buscando && (
          <p className="mt-1 text-[10px] font-mono text-fg-dim">buscando…</p>
        )}
        {erro && (
          <p className="mt-1 text-[10px] font-mono text-danger">{erro}</p>
        )}
      </Field>
      <Field label={`Endereço${optional ? "" : " *"}`}>
        <input
          name={fieldName(prefix, "endereco")}
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          required={!optional}
          className="form-input"
        />
      </Field>
      <Field label={`Cidade${optional ? "" : " *"}`}>
        <input
          name={fieldName(prefix, "cidade")}
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          required={!optional}
          className="form-input"
        />
      </Field>
      <Field label={`UF${optional ? "" : " *"}`}>
        <input
          name={fieldName(prefix, "uf")}
          value={uf}
          onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))}
          maxLength={2}
          required={!optional}
          className="form-input uppercase"
        />
      </Field>
    </>
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
