"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveCompanyDataAction,
  type SaveCompanyState,
} from "@/lib/actions/onboarding";
import { maskCNPJ, maskCEP, maskPhone, UF_LIST } from "@/lib/cnpj";

type Props = {
  role: "corretor" | "imobiliaria" | "construtora";
  defaultName?: string;
};

export function OnboardingForm({ role, defaultName = "" }: Props) {
  const [state, action, pending] = useActionState<SaveCompanyState, FormData>(
    saveCompanyDataAction,
    null,
  );
  const router = useRouter();
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [telefone, setTelefone] = useState("");

  useEffect(() => {
    if (state?.ok) router.push(state.redirectTo);
  }, [state, router]);

  const isCorretor = role === "corretor";
  const isConstrutora = role === "construtora";

  return (
    <form action={action} className="space-y-5">
      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {state.error}
        </div>
      )}

      <Field
        name="nome"
        label="Seu nome (responsável)"
        required
        defaultValue={defaultName}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field
          name="razaoSocial"
          label={isCorretor ? "Razão social (ou seu nome)" : "Razão social"}
          required
        />
        <Field
          name="nomeFantasia"
          label="Nome fantasia (opcional)"
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
        />
      )}

      {isConstrutora && (
        <Field
          name="email"
          label="Email da empresa (opcional)"
          type="email"
          placeholder="contato@suaempresa.com.br"
        />
      )}

      <div className="border-t border-border pt-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-3">
          endereço
        </div>
        <div className="grid sm:grid-cols-3 gap-4 mb-4">
          <Field
            name="cep"
            label="CEP"
            value={cep}
            onChange={(e) => setCep(maskCEP(e.target.value))}
            required
            placeholder="00000-000"
            inputMode="numeric"
          />
          <Field
            name="cidade"
            label="Cidade"
            required
            className="sm:col-span-2"
          />
        </div>
        <Field name="endereco" label="Endereço completo" required />
        <div className="mt-4">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            UF<span className="ml-1 text-accent">*</span>
          </label>
          <select
            name="uf"
            required
            defaultValue=""
            className="w-full sm:w-32 h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg focus:border-accent outline-none transition-colors appearance-none cursor-pointer"
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
            {UF_LIST.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !w-full justify-center !h-12"
      >
        {pending ? "Salvando..." : "Continuar pra documentos"}
        <span className="arrow">→</span>
      </button>

      <p className="text-center text-xs text-fg-dim">
        Próxima etapa: upload do contrato social, comprovante de endereço e
        dados bancários.
      </p>
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
