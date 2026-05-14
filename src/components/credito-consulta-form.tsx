"use client";

import { useState } from "react";
import {
  consultarCredito,
  type ConsultaCreditoResultado,
} from "@/lib/actions/credito";
import { useFeedback } from "@/components/feedback-provider";

function maskDoc(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

const RISCO_BADGE: Record<
  ConsultaCreditoResultado["risco"],
  { bg: string; label: string }
> = {
  baixo: { bg: "bg-green-50 text-success", label: "Baixo risco" },
  medio: { bg: "bg-yellow-50 text-warn", label: "Risco médio" },
  alto: { bg: "bg-orange-50 text-warn", label: "Risco alto" },
  critico: { bg: "bg-red-50 text-danger", label: "Risco crítico" },
};

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

export function CreditoConsultaForm() {
  const { alertError } = useFeedback();
  const [doc, setDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsultaCreditoResultado | null>(null);

  async function consultar(force = false) {
    setLoading(true);
    try {
      const r = await consultarCredito(doc, { forceRefresh: force });
      if (!r.ok) {
        await alertError(r.error);
        return;
      }
      setResult(r.data);
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-bg-elev p-5">
        <h3 className="font-bold mb-3">Consultar documento</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            consultar(false);
          }}
          className="flex gap-2 flex-wrap items-end"
        >
          <div className="flex-1 min-w-[260px]">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              CPF ou CNPJ
            </label>
            <input
              value={doc}
              onChange={(e) => setDoc(maskDoc(e.target.value))}
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="form-input font-mono"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || doc.replace(/\D/g, "").length < 11}
            className="h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
          >
            {loading ? "Consultando..." : "🔍 Consultar"}
          </button>
        </form>
      </section>

      {result && (
        <section className="rounded-2xl border border-border bg-bg-elev p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <div className="text-xs text-fg-dim font-mono">
                {result.documento}
              </div>
              <div className="text-xs text-fg-muted mt-0.5">
                {result.tipoPessoa === "pf" ? "Pessoa física" : "Pessoa jurídica"}
                {" · "}
                Consultado em {fmtDT(result.consultadoEm)}
                {result.cached && " · cache"}
              </div>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs uppercase font-bold ${
                RISCO_BADGE[result.risco].bg
              }`}
            >
              {RISCO_BADGE[result.risco].label}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
                Score
              </div>
              <div className="font-mono text-3xl font-bold">{result.score}</div>
              <div className="text-xs text-fg-dim font-mono">/1000</div>
            </div>
            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
                Restrições
              </div>
              <div
                className={`font-mono text-3xl font-bold ${
                  result.restricoes > 0 ? "text-danger" : "text-success"
                }`}
              >
                {result.restricoes}
              </div>
              <div className="text-xs text-fg-dim">
                {result.restricoes > 0 ? "apontamentos ativos" : "sem apontamentos"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-bg p-4">
              <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim mb-1">
                Provedor
              </div>
              <div className="font-mono text-lg font-bold">{result.provedor}</div>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => consultar(true)}
            className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {loading ? "..." : "🔄 Forçar nova consulta"}
          </button>
        </section>
      )}

      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs text-warn">
        ⚠ Hoje usando <strong>stub provider</strong> que gera score
        determinístico baseado em hash do documento. Integração real com
        Serasa/Boa Vista substitui esse stub sem mudar a UI — schema + cache
        já preparados.
      </div>
    </div>
  );
}
