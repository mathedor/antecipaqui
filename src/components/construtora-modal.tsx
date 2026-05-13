"use client";

import { forwardRef, useActionState, useEffect, useRef, useState } from "react";
import {
  createConstrutoraAction,
  type CreateConstrutoraState,
} from "@/lib/actions/operacoes";
import { lookupCnpj } from "@/lib/actions/corretor-velocidade";
import { CepAddressFields } from "@/components/cep-address-fields";
import { maskCNPJ, maskPhone } from "@/lib/cnpj";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (construtoraId: string) => void;
};

export function ConstrutoraModal({ open, onClose, onCreated }: Props) {
  const [state, action, pending] = useActionState<
    CreateConstrutoraState,
    FormData
  >(createConstrutoraAction, null);
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillMsg, setAutoFillMsg] = useState<string | null>(null);
  const razaoRef = useRef<HTMLInputElement | null>(null);
  const fantasiaRef = useRef<HTMLInputElement | null>(null);
  const cepRef = useRef<HTMLInputElement | null>(null);
  const enderecoRef = useRef<HTMLInputElement | null>(null);
  const cidadeRef = useRef<HTMLInputElement | null>(null);
  const ufRef = useRef<HTMLInputElement | null>(null);

  async function onCnpjChange(v: string) {
    const masked = maskCNPJ(v);
    setCnpj(masked);
    const digits = masked.replace(/\D/g, "");
    if (digits.length === 14) {
      setAutoFilling(true);
      setAutoFillMsg(null);
      try {
        const r = await lookupCnpj(digits);
        if (r.ok) {
          if (razaoRef.current && !razaoRef.current.value)
            razaoRef.current.value = r.data.razao_social ?? "";
          if (fantasiaRef.current && r.data.nome_fantasia)
            fantasiaRef.current.value = r.data.nome_fantasia;
          if (cepRef.current && r.data.cep)
            cepRef.current.value = r.data.cep;
          if (enderecoRef.current && r.data.logradouro)
            enderecoRef.current.value = r.data.logradouro;
          if (cidadeRef.current && r.data.municipio)
            cidadeRef.current.value = r.data.municipio;
          if (ufRef.current && r.data.uf) ufRef.current.value = r.data.uf;
          setAutoFillMsg("Preenchido pela Receita Federal");
        } else {
          setAutoFillMsg(null);
        }
      } catch {
        setAutoFillMsg(null);
      } finally {
        setAutoFilling(false);
      }
    }
  }

  useEffect(() => {
    if (state?.ok) {
      onCreated(state.construtoraId);
    }
  }, [state, onCreated]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: "opacity 300ms ease",
      }}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar"
        className="absolute inset-0 w-full h-full bg-fg/60 backdrop-blur-sm cursor-default"
      />
      <div
        className="relative w-full max-w-lg rounded-3xl border border-border bg-bg-elev shadow-2xl overflow-hidden"
        style={{
          transform: open ? "translateY(0) scale(1)" : "translateY(-12px) scale(0.96)",
          transition: "transform 400ms cubic-bezier(0.16,1,0.3,1)",
          maxHeight: "calc(100dvh - 2rem)",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="p-7 md:p-8 overflow-y-auto" style={{ maxHeight: "calc(100dvh - 2rem)" }}>
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
                cadastro rápido
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Nova construtora
              </h2>
              <p className="mt-2 text-sm text-fg-muted">
                Dados básicos pra vincular à operação. A construtora vai receber
                convite pra completar o cadastro depois.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="size-9 rounded-full border border-border flex items-center justify-center text-fg-muted hover:border-accent hover:text-accent transition-colors"
            >
              ✕
            </button>
          </div>

          <form action={action} className="space-y-4">
            {state && !state.ok && (
              <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
                {state.error}
              </div>
            )}
            <Input
              name="cnpj"
              label="CNPJ"
              required
              value={cnpj}
              onChange={(e) => onCnpjChange(e.target.value)}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
            />
            {autoFilling && (
              <p className="text-xs text-fg-dim">
                Consultando Receita Federal...
              </p>
            )}
            {autoFillMsg && (
              <p className="text-xs text-success">✓ {autoFillMsg}</p>
            )}
            <Input
              ref={razaoRef}
              name="razaoSocial"
              label="Razão social"
              required
            />
            <Input
              ref={fantasiaRef}
              name="nomeFantasia"
              label="Nome fantasia (opcional)"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                name="telefone"
                label="Telefone comercial"
                required
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                type="tel"
              />
              <Input
                name="email"
                label="Email"
                required
                type="email"
                placeholder="contato@..."
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <CepAddressFields optional />
            </div>
            <p className="text-[11px] text-fg-dim leading-relaxed">
              A construtora vai receber um email automático com convite pra
              completar o cadastro (contrato social, comprovante de endereço)
              pra que as operações possam seguir normalmente.
            </p>
            <button
              type="submit"
              disabled={pending}
              className="btn-primary !w-full justify-center !h-11"
            >
              {pending ? "Salvando..." : "Cadastrar e usar"}
              <span className="arrow">→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

const Input = forwardRef<
  HTMLInputElement,
  {
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputMode?: "numeric" | "text" | "tel" | "email";
  }
>(function Input(
  {
    label,
    name,
    type = "text",
    required,
    placeholder,
    value,
    onChange,
    inputMode,
  },
  ref,
) {
  const controlled = value !== undefined;
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      <input
        ref={ref}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        value={controlled ? value : undefined}
        onChange={onChange}
        inputMode={inputMode}
        className="w-full h-11 rounded-xl bg-bg border border-border-strong px-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors"
      />
    </div>
  );
});
