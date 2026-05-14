"use client";

import { useEffect, useState } from "react";
import {
  maskCEP,
  maskCNPJ,
  maskCPF,
  maskPhone,
  unmaskCNPJ,
  unmaskCPF,
} from "@/lib/cnpj";
import { buscarCep } from "@/lib/cep";
import { lookupCompradorPorDocumento } from "@/lib/actions/corretor-velocidade";

export type CompradorInput = {
  tipoPessoa: "fisica" | "juridica";
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  cidade: string;
  uf: string;
};

export function novoCompradorVazio(): CompradorInput {
  return {
    tipoPessoa: "fisica",
    nome: "",
    documento: "",
    telefone: "",
    email: "",
    cep: "",
    endereco: "",
    cidade: "",
    uf: "",
  };
}

type Props = {
  /** Nome do hidden input que vai pro form (JSON). */
  inputName?: string;
  /** Estado controlado externo (quando o form precisa) ou interno (default). */
  value?: CompradorInput[];
  onChange?: (next: CompradorInput[]) => void;
  /** Default inicial pra modo não-controlado. */
  initial?: CompradorInput[];
};

export function CompradoresEditor({
  inputName = "compradores",
  value,
  onChange,
  initial,
}: Props) {
  const [internal, setInternal] = useState<CompradorInput[]>(
    () => initial ?? [novoCompradorVazio()],
  );
  const list = value ?? internal;
  const set = (next: CompradorInput[]) => {
    if (value) onChange?.(next);
    else {
      setInternal(next);
      onChange?.(next);
    }
  };

  function update(idx: number, patch: Partial<CompradorInput>) {
    set(list.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function add() {
    set([...list, novoCompradorVazio()]);
  }
  function remove(idx: number) {
    if (list.length === 1) {
      set([novoCompradorVazio()]);
    } else {
      set(list.filter((_, i) => i !== idx));
    }
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={inputName} value={JSON.stringify(list)} />
      {list.map((c, idx) => (
        <CompradorRow
          key={idx}
          idx={idx}
          c={c}
          update={(patch) => update(idx, patch)}
          remove={() => remove(idx)}
          canRemove={list.length > 1}
        />
      ))}
      <button
        type="button"
        onClick={add}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-accent/40 bg-accent-soft text-accent hover:bg-accent hover:text-white text-sm font-semibold transition-colors"
      >
        + Adicionar comprador
      </button>
    </div>
  );
}

function CompradorRow({
  idx,
  c,
  update,
  remove,
  canRemove,
}: {
  idx: number;
  c: CompradorInput;
  update: (patch: Partial<CompradorInput>) => void;
  remove: () => void;
  canRemove: boolean;
}) {
  const [cepBuscando, setCepBuscando] = useState(false);
  const [docBuscando, setDocBuscando] = useState(false);
  const [docPreenchido, setDocPreenchido] = useState(false);

  async function lookupDocumento() {
    const docDigits = c.documento.replace(/\D/g, "");
    const minLen = c.tipoPessoa === "fisica" ? 11 : 14;
    if (docDigits.length !== minLen) return;
    // Se já preencheu nome, não sobrescreve (evita perder edits)
    if (c.nome.trim().length > 0) return;
    setDocBuscando(true);
    try {
      const found = await lookupCompradorPorDocumento(docDigits);
      if (found) {
        update({
          nome: found.nome,
          telefone: found.telefone
            ? maskPhone(found.telefone)
            : c.telefone,
          email: found.email ?? c.email,
          endereco: found.endereco ?? c.endereco,
          cidade: found.cidade ?? c.cidade,
          uf: found.uf ?? c.uf,
          cep: found.cep ? maskCEP(found.cep) : c.cep,
        });
        setDocPreenchido(true);
        setTimeout(() => setDocPreenchido(false), 3000);
      }
    } catch {
      /* ignora */
    } finally {
      setDocBuscando(false);
    }
  }

  useEffect(() => {
    const cepDigits = c.cep.replace(/\D/g, "");
    if (cepDigits.length !== 8) return;
    let cancelado = false;
    setCepBuscando(true);
    buscarCep(cepDigits)
      .then((r) => {
        if (cancelado || !r) return;
        update({
          endereco: r.logradouro ?? c.endereco,
          cidade: r.cidade ?? c.cidade,
          uf: r.uf ?? c.uf,
        });
      })
      .finally(() => {
        if (!cancelado) setCepBuscando(false);
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.cep]);

  const docPlaceholder = c.tipoPessoa === "fisica" ? "000.000.000-00" : "00.000.000/0000-00";
  const nomeLabel = c.tipoPessoa === "fisica" ? "Nome completo" : "Razão social";
  const docLabel = c.tipoPessoa === "fisica" ? "CPF" : "CNPJ";

  return (
    <div className="rounded-xl border border-border bg-bg-elev p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
          comprador #{String(idx + 1).padStart(2, "0")}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={remove}
            className="text-fg-dim hover:text-danger text-xs font-mono uppercase tracking-wider"
            title="Remover comprador"
          >
            remover ×
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Tipo *">
          <select
            value={c.tipoPessoa}
            onChange={(e) =>
              update({
                tipoPessoa: e.target.value as "fisica" | "juridica",
                documento: "",
              })
            }
            className="form-input"
          >
            <option value="fisica">Pessoa física</option>
            <option value="juridica">Pessoa jurídica</option>
          </select>
        </Field>
        <Field label={`${nomeLabel} *`}>
          <input
            required
            value={c.nome}
            onChange={(e) => update({ nome: e.target.value })}
            placeholder={c.tipoPessoa === "fisica" ? "Nome do comprador" : "Razão social"}
            className="form-input"
          />
        </Field>
        <Field label={`${docLabel} *`}>
          <input
            required
            value={c.documento}
            onChange={(e) => {
              const masked =
                c.tipoPessoa === "fisica"
                  ? maskCPF(e.target.value)
                  : maskCNPJ(e.target.value);
              update({ documento: masked });
            }}
            placeholder={docPlaceholder}
            inputMode="numeric"
            className="form-input font-mono"
            onBlur={(e) => {
              // normaliza pra digits-only no submit (form lê o valor como está)
              if (c.tipoPessoa === "fisica") {
                const d = unmaskCPF(e.target.value);
                if (d.length === 11) update({ documento: maskCPF(d) });
              } else {
                const d = unmaskCNPJ(e.target.value);
                if (d.length === 14) update({ documento: maskCNPJ(d) });
              }
              // Auto-fill se o comprador já apareceu em op anterior do corretor
              lookupDocumento();
            }}
          />
          {docBuscando && (
            <span className="text-[10px] text-fg-dim font-mono">
              buscando histórico...
            </span>
          )}
          {docPreenchido && (
            <span className="text-[10px] text-success font-mono">
              ✓ preenchido do histórico
            </span>
          )}
        </Field>
        <Field label="Telefone (WhatsApp) *">
          <input
            required
            value={c.telefone}
            onChange={(e) => update({ telefone: maskPhone(e.target.value) })}
            placeholder="(11) 99999-9999"
            inputMode="tel"
            className="form-input"
          />
        </Field>
        <Field label="Email *">
          <input
            required
            type="email"
            value={c.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="email@exemplo.com"
            className="form-input"
          />
        </Field>
        <Field label="CEP">
          <input
            value={c.cep}
            onChange={(e) => update({ cep: maskCEP(e.target.value) })}
            placeholder="00000-000"
            inputMode="numeric"
            className="form-input"
          />
          {cepBuscando && (
            <span className="text-[10px] text-fg-dim font-mono">
              buscando...
            </span>
          )}
        </Field>
        <Field label="Endereço">
          <input
            value={c.endereco}
            onChange={(e) => update({ endereco: e.target.value })}
            className="form-input"
          />
        </Field>
        <Field label="Cidade">
          <input
            value={c.cidade}
            onChange={(e) => update({ cidade: e.target.value })}
            className="form-input"
          />
        </Field>
        <Field label="UF">
          <input
            value={c.uf}
            onChange={(e) => update({ uf: e.target.value.toUpperCase() })}
            maxLength={2}
            className="form-input uppercase"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}