"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecapDados, RecapPeriodo } from "@/lib/recaps";
import { gerarRecapAction } from "@/lib/actions/recaps";
import { useFeedback } from "@/components/feedback-provider";

type Recap = {
  id: string;
  periodo: RecapPeriodo;
  inicio: string;
  fim: string;
  geradoEm: Date | string;
  dados: RecapDados;
};

type Filtros = {
  periodo?: RecapPeriodo;
  from?: string;
  to?: string;
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDateBR(s: string | Date) {
  const d = typeof s === "string" ? new Date(s + (s.length === 10 ? "T00:00:00" : "")) : s;
  return d.toLocaleDateString("pt-BR");
}

function fmtDT(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const PERIODO_LABEL: Record<RecapPeriodo, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

const PERIODO_EMOJI: Record<RecapPeriodo, string> = {
  diario: "📅",
  semanal: "🗓️",
  mensal: "📆",
};

export function RecapsManager({
  recaps,
  escopo,
  filtros,
}: {
  recaps: Recap[];
  escopo: "admin" | "fundo";
  filtros: Filtros;
}) {
  const router = useRouter();
  const { alertError, alertSuccess } = useFeedback();
  const [aberto, setAberto] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState<RecapPeriodo | "">(filtros.periodo ?? "");
  const [from, setFrom] = useState(filtros.from ?? "");
  const [to, setTo] = useState(filtros.to ?? "");
  const [genPeriodo, setGenPeriodo] = useState<RecapPeriodo>("diario");
  const [genData, setGenData] = useState(
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    setGerando(true);
    try {
      const r = await gerarRecapAction({
        periodo: genPeriodo,
        data: genData,
        escopo,
      });
      if (r.ok) {
        await alertSuccess(
          `Recap gerado: ${r.inicio}${r.inicio !== r.fim ? ` → ${r.fim}` : ""}`,
          "Pronto",
        );
        router.refresh();
      } else {
        await alertError(r.error);
      }
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setGerando(false);
    }
  }

  function aplicar() {
    const sp = new URLSearchParams();
    if (periodo) sp.set("periodo", periodo);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const url = sp.toString() ? `?${sp.toString()}` : "";
    router.push(url || ".");
  }

  function limpar() {
    setPeriodo("");
    setFrom("");
    setTo("");
    router.push(".");
  }

  return (
    <div className="space-y-6">
      {/* Gerar sob demanda */}
      <section className="rounded-2xl border border-accent/30 bg-accent-soft p-5">
        <h3 className="font-bold mb-3">⚡ Gerar recap pra qualquer data</h3>
        <p className="text-xs text-fg-muted mb-3">
          Útil pra revisitar uma data específica ou backfill antes do cron começar a rodar.
        </p>
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Tipo
            </label>
            <select
              value={genPeriodo}
              onChange={(e) => setGenPeriodo(e.target.value as RecapPeriodo)}
              className="form-input"
            >
              <option value="diario">Diário</option>
              <option value="semanal">Semanal (seg→dom)</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Data de referência (qualquer dia do período)
            </label>
            <input
              type="date"
              value={genData}
              onChange={(e) => setGenData(e.target.value)}
              className="form-input"
            />
          </div>
          <button
            type="button"
            onClick={gerar}
            disabled={gerando}
            className="h-10 px-4 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
          >
            {gerando ? "Gerando..." : "Gerar recap"}
          </button>
        </div>
      </section>

      {/* Filtros */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5">
        <div className="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as RecapPeriodo | "")}
              className="form-input"
            >
              <option value="">Todos</option>
              <option value="diario">Diário</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              De
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Até
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={aplicar}
              className="flex-1 h-10 px-4 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
            >
              Filtrar
            </button>
            <button
              type="button"
              onClick={limpar}
              className="h-10 px-3 rounded-lg border border-border text-xs hover:border-accent"
            >
              Limpar
            </button>
          </div>
        </div>
      </section>

      {/* Lista */}
      <section>
        <h3 className="font-bold mb-3">
          {recaps.length} recap{recaps.length === 1 ? "" : "s"} encontrado
          {recaps.length === 1 ? "" : "s"}
        </h3>
        {recaps.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
            Nenhum recap salvo ainda. Os recaps são gerados automaticamente:
            <ul className="mt-3 text-xs space-y-1">
              <li>📅 <strong>Diário</strong>: todos os dias às 00:30</li>
              <li>🗓️ <strong>Semanal</strong>: segundas (cobre seg→dom anterior)</li>
              <li>📆 <strong>Mensal</strong>: dia 1 (cobre o mês anterior)</li>
            </ul>
          </div>
        ) : (
          <ul className="space-y-2">
            {recaps.map((r) => {
              const isAberto = aberto === r.id;
              return (
                <li
                  key={r.id}
                  className="rounded-2xl border border-border bg-bg-elev overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setAberto(isAberto ? null : r.id)}
                    className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-bg-card transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">
                        {PERIODO_EMOJI[r.periodo]}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold">
                          {PERIODO_LABEL[r.periodo]} —{" "}
                          {fmtDateBR(r.inicio)}
                          {r.inicio !== r.fim && ` → ${fmtDateBR(r.fim)}`}
                        </div>
                        <div className="text-[10px] text-fg-dim font-mono mt-0.5">
                          {r.dados.opsNovas.qtd} op
                          {r.dados.opsNovas.qtd === 1 ? "" : "s"} ·{" "}
                          {fmtBRL(r.dados.opsNovas.valor)} · gerado{" "}
                          {fmtDT(r.geradoEm)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-accent shrink-0">
                      {isAberto ? "ocultar ↑" : "ver ↓"}
                    </span>
                  </button>

                  {isAberto && <RecapDetalhe d={r.dados} escopo={escopo} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function RecapDetalhe({
  d,
  escopo,
}: {
  d: RecapDados;
  escopo: "admin" | "fundo";
}) {
  return (
    <div className="border-t border-border p-5 space-y-4 bg-bg-card">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi
          label="Operações novas"
          value={`${d.opsNovas.qtd}`}
          sub={fmtBRL(d.opsNovas.valor)}
        />
        <Kpi
          label="Operações realizadas"
          value={`${d.opsRealizadas.qtd}`}
          sub={fmtBRL(d.opsRealizadas.valor)}
        />
        <Kpi
          label="Aprovadas pelo fundo"
          value={`${d.totalAprovado.qtd}`}
          sub={fmtBRL(d.totalAprovado.valor)}
          tone="success"
        />
        <Kpi
          label="Recusadas"
          value={`${d.totalRecusado.qtd}`}
          sub={fmtBRL(d.totalRecusado.valor)}
          tone="danger"
        />
        <Kpi
          label="Inadimplência no período"
          value={fmtBRL(d.inadimplencia.vencidoNoPeriodo)}
          sub={`${fmtBRL(d.inadimplencia.acumulado)} acumulado`}
          tone="warn"
        />
        <Kpi
          label="Novos corretores"
          value={`${d.novosCorretores}`}
          sub={`${d.prazoMedioAnaliseHoras.toFixed(1)}h prazo médio análise`}
        />
      </div>

      {escopo === "admin" && d.aprovacoes.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-[0.18em] text-fg-dim font-mono mb-2">
            Aprovações por fundo
          </h4>
          <ul className="space-y-1.5">
            {d.aprovacoes.map((a) => (
              <li
                key={a.fundoId}
                className="flex items-center justify-between text-sm border border-border rounded-lg p-2.5 bg-bg"
              >
                <span className="truncate">{a.fundoNome}</span>
                <span className="font-mono text-xs shrink-0 ml-2">
                  {a.qtd} op{a.qtd === 1 ? "" : "s"} · {fmtBRL(a.valor)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="text-fg-dim font-mono uppercase tracking-[0.15em] text-[10px] mb-1">
            Antecipações solicitadas
          </div>
          <div className="text-lg font-bold">{d.antecipacoes.solicitadas}</div>
        </div>
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="text-fg-dim font-mono uppercase tracking-[0.15em] text-[10px] mb-1">
            Aprovadas
          </div>
          <div className="text-lg font-bold text-success">
            {d.antecipacoes.aprovadas}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-bg p-3">
          <div className="text-fg-dim font-mono uppercase tracking-[0.15em] text-[10px] mb-1">
            Recusadas
          </div>
          <div className="text-lg font-bold text-danger">
            {d.antecipacoes.recusadas}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([JSON.stringify(d, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `recap-${d.periodo}-${d.inicio}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="text-xs text-accent hover:underline"
        >
          ↓ exportar JSON
        </button>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "danger" | "warn";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "warn"
          ? "text-warn"
          : "text-fg";
  return (
    <div className="rounded-xl border border-border bg-bg p-3">
      <div className="text-[10px] uppercase tracking-[0.15em] text-fg-dim font-mono mb-1.5">
        {label}
      </div>
      <div className={`text-xl font-bold ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
