"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { formatBRL } from "@/lib/format";

export type StatBoxes = {
  totalOperacoes: number;
  valorTotalAntecipado: number;
  operacoesNoMes: number;
  pendentesAprovacao: number;
};

/* ============================================================
   StatBoxes — 4 cards no topo da listagem
   ============================================================ */
export function OperacoesStatBoxes({ stats }: { stats: StatBoxes }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      <StatCard label="Total de operações" value={String(stats.totalOperacoes)} />
      <StatCard
        label="Valor total antecipado"
        value={formatBRL(stats.valorTotalAntecipado)}
        highlight
      />
      <StatCard label="Operações no mês" value={String(stats.operacoesNoMes)} />
      <StatCard
        label="Pendentes de aprovação"
        value={String(stats.pendentesAprovacao)}
        tone={stats.pendentesAprovacao > 0 ? "warn" : "default"}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "warn";
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : "border-border bg-bg-elev";
  const valueColor = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : "text-fg";
  return (
    <div className={`rounded-2xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-xl md:text-2xl font-bold tracking-tight ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================================================
   DateRangeFilter — presets + custom (atualiza ?from=&to=)
   ============================================================ */
const PRESETS = [
  { value: "all", label: "Todas" },
  { value: "month", label: "Este mês" },
  { value: "90d", label: "Últimos 3 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "custom", label: "Customizado" },
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

export function DateRangeFilter({
  preserveParams = [],
}: {
  /** Outras query params que devem ser preservadas no URL ao mudar a data */
  preserveParams?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const from = params.get("from");
  const to = params.get("to");
  const initialPreset = detectPreset(from, to);

  const [preset, setPreset] = useState(initialPreset);
  const [customFrom, setCustomFrom] = useState(from ?? "");
  const [customTo, setCustomTo] = useState(to ?? "");

  function pushWith(newFrom: string | null, newTo: string | null) {
    const qs = new URLSearchParams();
    for (const p of preserveParams) {
      const v = params.get(p);
      if (v) qs.set(p, v);
    }
    if (newFrom) qs.set("from", newFrom);
    if (newTo) qs.set("to", newTo);
    const query = qs.toString();
    router.push(`${pathname}${query ? `?${query}` : ""}`);
  }

  function handlePreset(p: string) {
    setPreset(p);
    if (p === "all") return pushWith(null, null);
    if (p === "month") return pushWith(monthStartISO(), todayISO());
    if (p === "90d") return pushWith(daysAgoISO(90), todayISO());
    if (p === "12m") return pushWith(daysAgoISO(365), todayISO());
    // custom: aguarda inputs
  }

  function handleApplyCustom() {
    if (!customFrom && !customTo) return;
    pushWith(customFrom || null, customTo || null);
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-elev p-4 mb-5">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-16 shrink-0">
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
            onClick={handleApplyCustom}
            disabled={!customFrom && !customTo}
            className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark transition-colors disabled:opacity-60"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
