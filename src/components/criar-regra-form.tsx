"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import {
  criarRegraAction,
  simularRegraAction,
  type RegraState,
  type SimularRegraResult,
} from "@/lib/actions/fundo-mesa";

function parseTaxaPct(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = parseFloat(v.replace("%", "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return n >= 0.5 ? n / 100 : n;
}

function parseInt0(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseValor(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseUuids(raw: string): string[] | null {
  const v = raw.trim();
  if (!v) return null;
  const ids = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : null;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function CriarRegraForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<RegraState, FormData>(
    criarRegraAction,
    null,
  );
  const [sim, setSim] = useState<SimularRegraResult | null>(null);
  const [simPending, startSim] = useTransition();

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
        ✓ Regra criada. Recarregue a página pra ajustar se necessário.
      </div>
    );
  }

  function simular() {
    const f = formRef.current;
    if (!f) return;
    const fd = new FormData(f);
    const input = {
      taxaMinima: parseTaxaPct(String(fd.get("taxaMinima") || "")),
      prazoMaximoMeses: parseInt0(String(fd.get("prazoMaximoMeses") || "")),
      valorMaximoComissao: parseValor(
        String(fd.get("valorMaximoComissao") || ""),
      ),
      construtorasIds: parseUuids(String(fd.get("construtorasIds") || "")),
    };
    startSim(async () => {
      const r = await simularRegraAction(input);
      setSim(r);
    });
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Nome da regra" required>
          <input
            name="nome"
            placeholder="Ex: Construtoras top, prazo curto"
            required
            maxLength={100}
            className="form-input"
          />
        </Field>
        <Field
          label="Taxa mínima da operação (% a.m.)"
          help="Vazio = qualquer taxa"
        >
          <input
            name="taxaMinima"
            inputMode="decimal"
            placeholder="Ex: 5,5"
            className="form-input"
          />
        </Field>
        <Field
          label="Prazo máximo (parcelas)"
          help="Vazio = qualquer prazo"
        >
          <input
            name="prazoMaximoMeses"
            inputMode="numeric"
            placeholder="Ex: 6"
            className="form-input"
          />
        </Field>
        <Field
          label="Valor máximo da comissão (R$)"
          help="Vazio = qualquer valor"
        >
          <input
            name="valorMaximoComissao"
            inputMode="decimal"
            placeholder="Ex: 100000"
            className="form-input"
          />
        </Field>
      </div>

      <Field
        label="Construtoras permitidas (IDs separados por vírgula)"
        help="Vazio = qualquer construtora. Use IDs da página da construtora no painel admin (use só se quiser allowlist)."
      >
        <input
          name="construtorasIds"
          placeholder="Ex: uuid1, uuid2, uuid3"
          className="form-input"
        />
      </Field>

      {sim && sim.ok && (
        <div className="rounded-xl border border-accent/40 bg-accent-soft p-4 space-y-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="font-bold text-fg">
              📊 Resultado da simulação (últimas {sim.totalAvaliadas} ops dos
              últimos 90 dias)
            </div>
            <div className="text-2xl font-bold tabular text-accent">
              {sim.totalAtendidas}{" "}
              <span className="text-xs font-mono text-fg-muted">
                / {sim.totalAvaliadas} ({sim.percentual.toFixed(1)}%)
              </span>
            </div>
          </div>
          <p className="text-xs text-fg-muted">
            {sim.totalAtendidas === 0
              ? "Nenhuma op atenderia. Critérios provavelmente estão muito restritivos — afrouxe taxa/prazo/valor."
              : sim.percentual > 70
                ? "Atenção: regra está MUITO permissiva — vai auto-aprovar quase tudo. Considere apertar critérios."
                : sim.percentual > 30
                  ? "Boa cobertura. Regra captura uma fatia significativa sem ser agressiva demais."
                  : "Critérios bem específicos — só captura ops bem qualificadas."}
          </p>
          {sim.exemplos.length > 0 && (
            <div className="space-y-1 mt-2">
              <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim">
                exemplos (até 5)
              </div>
              {sim.exemplos.map((ex) => (
                <div
                  key={ex.numero}
                  className="flex items-center justify-between gap-2 text-xs font-mono text-fg bg-bg/60 rounded px-2 py-1"
                >
                  <span className="font-bold">{ex.numero}</span>
                  <span className="text-fg-muted truncate flex-1">
                    {ex.construtoraNome ?? "—"}
                  </span>
                  <span>{fmtBRL(ex.valorComissao)}</span>
                  <span>{ex.numeroParcelas}p</span>
                  <span>{(ex.taxaMensalOp * 100).toFixed(2)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {sim && !sim.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {sim.error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={simular}
          disabled={simPending}
          className="h-11 px-5 rounded-lg border-2 border-accent text-accent text-sm font-bold hover:bg-accent-soft disabled:opacity-60"
        >
          {simPending ? "Simulando…" : "🧪 Simular nas últimas 90 ops"}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="btn-primary !h-11 !px-5"
        >
          {pending ? "Salvando..." : "+ Criar regra"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>
      {children}
      {help && <p className="mt-1 text-[10px] text-fg-muted">{help}</p>}
    </div>
  );
}
