"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { InvoiceRow } from "@/lib/actions/invoice";
import { formatBRL } from "@/lib/format";

type SortKey =
  | "operacaoNumero"
  | "fundoNome"
  | "construtoraNome"
  | "imobiliariaNome"
  | "dataAprovacao"
  | "valorComissaoTotal"
  | "pagoNoPeriodo"
  | "pctPago"
  | "juros"
  | "custos"
  | "custoDinheiroFundo"
  | "spread"
  | "saldoRepasse";

type SortDir = "asc" | "desc";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(1).replace(".", ",")}%`;
}

export function InvoiceTable({
  rows,
  totals,
}: {
  rows: InvoiceRow[];
  totals: {
    valorComissaoTotal: number;
    pagoNoPeriodo: number;
    juros: number;
    custos: number;
    custoDinheiroFundo: number;
    spread: number;
    resultadoOpAQ: number;
    saldoRepasse: number;
  };
}) {
  const [sortKey, setSortKey] = useState<SortKey>("pagoNoPeriodo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv), "pt-BR")
        : String(bv).localeCompare(String(av), "pt-BR");
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const SortableTh = ({
    label,
    keyof: k,
    align = "left",
  }: {
    label: string;
    keyof: SortKey;
    align?: "left" | "right";
  }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`px-3 py-2 cursor-pointer hover:bg-bg-card transition-colors select-none ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className="text-fg-dim text-[9px] w-2 inline-block">
          {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
        </span>
      </span>
    </th>
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
        Nenhuma operação com parcela paga no período + filtros selecionados.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-border bg-bg-card">
            <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
              <SortableTh label="Operação" keyof="operacaoNumero" />
              <SortableTh label="Fundo" keyof="fundoNome" />
              <SortableTh label="Construtora" keyof="construtoraNome" />
              <SortableTh
                label="Valor op."
                keyof="valorComissaoTotal"
                align="right"
              />
              <SortableTh
                label="Pago no período"
                keyof="pagoNoPeriodo"
                align="right"
              />
              <SortableTh label="% pago" keyof="pctPago" align="right" />
              <SortableTh label="Juros" keyof="juros" align="right" />
              <SortableTh
                label="Custo $"
                keyof="custoDinheiroFundo"
                align="right"
              />
              <SortableTh label="Spread" keyof="spread" align="right" />
              <SortableTh label="Custos" keyof="custos" align="right" />
              <SortableTh
                label="Repasse devido"
                keyof="saldoRepasse"
                align="right"
              />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr
                key={r.operacaoId}
                className={`border-b border-border last:border-0 hover:bg-bg-card transition-colors ${
                  i % 2 === 1 ? "bg-bg/30" : ""
                }`}
              >
                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-fg">
                  {r.operacaoNumero}
                  <div className="text-[9px] text-fg-dim">
                    aprov {fmtDate(r.dataAprovacao)}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-fg-muted truncate max-w-[140px]">
                  {r.fundoNome ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-fg-muted truncate max-w-[160px]">
                  {r.construtoraNome ?? "—"}
                  {r.imobiliariaNome && (
                    <div className="text-[9px] text-fg-dim truncate">
                      {r.imobiliariaNome}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg">
                  {formatBRL(r.valorComissaoTotal)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg font-semibold">
                  {formatBRL(r.pagoNoPeriodo)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg-muted">
                  {fmtPct(r.pctPago)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg-muted">
                  {formatBRL(r.juros)}
                </td>
                <td
                  className="px-3 py-2.5 text-right font-mono tabular text-accent"
                  title={`VP × ${(r.taxaMensalFundo * 100).toFixed(2)}% × ${r.prazoMeses}m`}
                >
                  {formatBRL(r.custoDinheiroFundo)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg">
                  {formatBRL(r.spread)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-warn">
                  {formatBRL(r.custos)}
                </td>
                <td
                  className="px-3 py-2.5 text-right font-mono tabular font-bold text-success"
                  title={`Resultado op inteira × % pago = ${formatBRL(r.resultadoOpAQ)} × ${fmtPct(r.pctPago)}`}
                >
                  {formatBRL(r.saldoRepasse)}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <Link
                    href={`/admin/operacoes/${r.operacaoId}`}
                    className="text-accent hover:underline text-[10px] font-mono"
                    title="Ver operação"
                  >
                    ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-border-strong bg-bg-card">
            <tr className="font-mono text-xs">
              <td
                colSpan={3}
                className="px-3 py-3 uppercase tracking-wider text-fg-dim text-[10px]"
              >
                Totais ({rows.length} ops)
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-fg">
                {formatBRL(totals.valorComissaoTotal)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-fg">
                {formatBRL(totals.pagoNoPeriodo)}
              </td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3 text-right tabular font-bold text-fg">
                {formatBRL(totals.juros)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-accent">
                {formatBRL(totals.custoDinheiroFundo)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-fg">
                {formatBRL(totals.spread)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-warn">
                {formatBRL(totals.custos)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-success">
                {formatBRL(totals.saldoRepasse)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
