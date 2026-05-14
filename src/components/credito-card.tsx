"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  consultarCredito,
  type ConsultaCreditoResultado,
} from "@/lib/actions/credito";
import { useFeedback } from "@/components/feedback-provider";

const RISCO_BADGE: Record<
  ConsultaCreditoResultado["risco"],
  { bg: string; label: string }
> = {
  baixo: { bg: "bg-green-50 text-success", label: "Baixo risco" },
  medio: { bg: "bg-yellow-50 text-warn", label: "Risco médio" },
  alto: { bg: "bg-orange-50 text-warn", label: "Risco alto" },
  critico: { bg: "bg-red-50 text-danger", label: "Risco crítico" },
};

function fmtDoc(d: string) {
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14)
    return d.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  return d;
}

function fmtDT(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Card de consulta de crédito.
 *  Mostrado no detalhe da operação pro admin/fundo. */
export function CreditoCard({
  documento,
  label,
  operacaoId,
  initial,
}: {
  documento: string;
  label: string;
  operacaoId?: string;
  initial?: ConsultaCreditoResultado | null;
}) {
  const router = useRouter();
  const { alertError } = useFeedback();
  const [data, setData] = useState<ConsultaCreditoResultado | null>(
    initial ?? null,
  );
  const [loading, setLoading] = useState(false);

  async function fazerConsulta(force = false) {
    setLoading(true);
    try {
      const r = await consultarCredito(documento, {
        operacaoId,
        forceRefresh: force,
      });
      if (!r.ok) {
        await alertError(r.error);
        return;
      }
      setData(r.data);
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="font-bold mb-1">Análise de crédito · {label}</h3>
          <div className="text-xs text-fg-muted font-mono">{fmtDoc(documento)}</div>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs uppercase font-bold ${
                RISCO_BADGE[data.risco].bg
              }`}
            >
              {RISCO_BADGE[data.risco].label}
            </span>
            <span className="font-mono text-2xl font-bold">{data.score}</span>
            <span className="text-xs text-fg-dim">/1000</span>
          </div>
        )}
      </div>

      {data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 text-sm">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim">
                Restrições / apontamentos
              </div>
              <div
                className={`font-mono text-lg font-bold ${
                  data.restricoes > 0 ? "text-danger" : "text-success"
                }`}
              >
                {data.restricoes}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim">
                Provedor
              </div>
              <div className="font-mono text-sm">{data.provedor}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-mono text-fg-dim">
                Última consulta
              </div>
              <div className="font-mono text-sm">{fmtDT(data.consultadoEm)}</div>
            </div>
          </div>

          {data.cached && (
            <p className="text-[10px] text-fg-dim italic mb-3">
              ⓘ Dados em cache (válidos por 30 dias). Forçar refresh consulta
              novamente o provedor.
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => fazerConsulta(true)}
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {loading ? "Consultando..." : "🔄 Consultar de novo"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-fg-muted mb-3">
            Sem consulta de crédito desse documento ainda.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => fazerConsulta(false)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-60"
          >
            {loading ? "Consultando..." : "🔍 Consultar crédito"}
          </button>
        </>
      )}

      <p className="text-[10px] text-fg-dim italic mt-3">
        ⓘ Hoje usando provider stub (score determinístico por hash do
        documento). Integração com Serasa/Boa Vista vai substituir quando
        contratada — schema e cache já preparados.
      </p>
    </section>
  );
}
