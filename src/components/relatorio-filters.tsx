"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

const PRESETS = [
  { value: "all", label: "Todo período" },
  { value: "month", label: "Este mês" },
  { value: "90d", label: "Últimos 3 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "custom", label: "Personalizado" },
];

const STATUS_OPERACAO = [
  { value: "", label: "Todos os status" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "documentos_incompletos", label: "Docs incompletos" },
  { value: "pre_aprovada", label: "Pré-aprovada" },
  { value: "analise_final", label: "Análise final" },
  { value: "enviada_para_assinatura", label: "Em assinatura" },
  { value: "enviada_para_pagamento", label: "Em pagamento" },
  { value: "realizada", label: "Realizada" },
  { value: "recusada", label: "Recusada" },
  { value: "cancelada", label: "Cancelada" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function monthStartISO() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function daysAgoISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function detectPreset(from?: string | null, to?: string | null) {
  if (!from && !to) return "all";
  if (from === monthStartISO() && (to === todayISO() || !to)) return "month";
  if (from === daysAgoISO(90) && (to === todayISO() || !to)) return "90d";
  if (from === daysAgoISO(365) && (to === todayISO() || !to)) return "12m";
  return "custom";
}

export function RelatorioFilters({
  /** "construtora" | "imobiliaria" | "fundo" — muda só o label do status do cadastro */
  tipoCadastro,
  /** Lista de fundos pra dropdown. Se vazio, esconde o filtro. */
  fundos = [],
}: {
  tipoCadastro: "construtora" | "imobiliaria" | "fundo";
  fundos?: Array<{ id: string; razaoSocial: string; nomeFantasia: string | null }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const from = params.get("from");
  const to = params.get("to");
  const cadastroStatus = params.get("cadastroStatus") ?? "";
  const operacaoStatus = params.get("operacaoStatus") ?? "";
  const fundoId = params.get("fundoId") ?? "";

  const initialPreset = detectPreset(from, to);
  const [preset, setPreset] = useState(initialPreset);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function pushWith(updates: Record<string, string | null>) {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") qs.delete(k);
      else qs.set(k, v);
    }
    const query = qs.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  function handlePreset(p: string) {
    setPreset(p);
    if (p === "all") return pushWith({ from: null, to: null });
    if (p === "month")
      return pushWith({ from: monthStartISO(), to: todayISO() });
    if (p === "90d")
      return pushWith({ from: daysAgoISO(90), to: todayISO() });
    if (p === "12m")
      return pushWith({ from: daysAgoISO(365), to: todayISO() });
  }

  function applyCustom() {
    if (!customFrom && !customTo) return;
    pushWith({ from: customFrom || null, to: customTo || null });
  }

  const labelEntidade =
    tipoCadastro === "construtora"
      ? "Construtora"
      : tipoCadastro === "fundo"
        ? "Fundo"
        : "Imobiliária / Corretor";

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 mb-6 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-20 shrink-0">
          Período
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => handlePreset(p.value)}
            className={`chip transition-colors hover:border-accent ${
              preset === p.value ? "chip-accent" : ""
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex items-end gap-3 flex-wrap pt-2 border-t border-border">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
              De
            </label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-10 rounded-lg bg-bg border border-border-strong px-3 text-sm text-fg focus:border-accent outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-fg-dim mb-1 font-mono">
              Até
            </label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-10 rounded-lg bg-bg border border-border-strong px-3 text-sm text-fg focus:border-accent outline-none transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customFrom && !customTo}
            className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            Aplicar
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-20 shrink-0">
          {labelEntidade}
        </span>
        <button
          type="button"
          onClick={() => pushWith({ cadastroStatus: null })}
          className={`chip transition-colors hover:border-accent ${
            cadastroStatus === "" ? "chip-accent" : ""
          }`}
        >
          Todos
        </button>
        <button
          type="button"
          onClick={() => pushWith({ cadastroStatus: "ativo" })}
          className={`chip transition-colors hover:border-accent ${
            cadastroStatus === "ativo" ? "chip-accent" : ""
          }`}
        >
          Ativos
        </button>
        <button
          type="button"
          onClick={() => pushWith({ cadastroStatus: "inativo" })}
          className={`chip transition-colors hover:border-accent ${
            cadastroStatus === "inativo" ? "chip-accent" : ""
          }`}
        >
          Inativos / bloqueados
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-20 shrink-0">
          Status op.
        </span>
        <select
          value={operacaoStatus}
          onChange={(e) =>
            pushWith({ operacaoStatus: e.target.value || null })
          }
          className="h-9 rounded-lg bg-bg border border-border-strong px-3 text-sm text-fg focus:border-accent outline-none transition-colors max-w-xs"
        >
          {STATUS_OPERACAO.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {fundos.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-20 shrink-0">
            Fundo
          </span>
          <select
            value={fundoId}
            onChange={(e) => pushWith({ fundoId: e.target.value || null })}
            className="h-9 rounded-lg bg-bg border border-border-strong px-3 text-sm text-fg focus:border-accent outline-none transition-colors max-w-xs"
          >
            <option value="">Todos</option>
            {fundos.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nomeFantasia ?? f.razaoSocial}
              </option>
            ))}
            <option value="_no_fundo_">— sem fundo —</option>
          </select>
        </div>
      )}
    </section>
  );
}
