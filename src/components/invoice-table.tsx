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
  | "valorOperacao"
  | "juros"
  | "custos"
  | "resultado"
  | "custoDinheiroFundo"
  | "saldoRepasse";

type SortDir = "asc" | "desc";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export function InvoiceTable({
  rows,
  totals,
}: {
  rows: InvoiceRow[];
  totals: {
    valorOperacao: number;
    juros: number;
    custos: number;
    resultado: number;
    custoDinheiroFundo: number;
    saldoRepasse: number;
  };
}) {
  const [sortKey, setSortKey] = useState<SortKey>("dataAprovacao");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // null pra fim
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
        Nenhuma operação encontrada no período + filtros selecionados.
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
              <SortableTh label="Imobiliária" keyof="imobiliariaNome" />
              <SortableTh label="Aprovado em" keyof="dataAprovacao" />
              <SortableTh
                label="Valor op."
                keyof="valorOperacao"
                align="right"
              />
              <SortableTh label="Juros" keyof="juros" align="right" />
              <SortableTh label="Custos" keyof="custos" align="right" />
              <SortableTh
                label="Resultado"
                keyof="resultado"
                align="right"
              />
              <SortableTh
                label="Custo dinheiro"
                keyof="custoDinheiroFundo"
                align="right"
              />
              <SortableTh
                label="Saldo repasse"
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
                </td>
                <td className="px-3 py-2.5 text-fg-muted truncate max-w-[140px]">
                  {r.fundoNome ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-fg-muted truncate max-w-[160px]">
                  {r.construtoraNome ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-fg-muted truncate max-w-[140px]">
                  {r.imobiliariaNome ?? "—"}
                </td>
                <td className="px-3 py-2.5 font-mono text-fg-muted">
                  {fmtDate(r.dataAprovacao)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg">
                  {formatBRL(r.valorOperacao)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg">
                  {formatBRL(r.juros)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-warn">
                  {formatBRL(r.custos)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono tabular text-fg font-semibold">
                  {formatBRL(r.resultado)}
                </td>
                <td
                  className="px-3 py-2.5 text-right font-mono tabular text-accent"
                  title={`Valor presente × ${(r.taxaMensalFundo * 100).toFixed(2)}% × ${r.prazoMeses} meses`}
                >
                  {formatBRL(r.custoDinheiroFundo)}
                </td>
                <td
                  className={`px-3 py-2.5 text-right font-mono tabular font-bold ${
                    r.saldoRepasse >= 0 ? "text-success" : "text-danger"
                  }`}
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
                colSpan={5}
                className="px-3 py-3 uppercase tracking-wider text-fg-dim text-[10px]"
              >
                Totais ({rows.length} ops)
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-fg">
                {formatBRL(totals.valorOperacao)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-fg">
                {formatBRL(totals.juros)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-warn">
                {formatBRL(totals.custos)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-fg">
                {formatBRL(totals.resultado)}
              </td>
              <td className="px-3 py-3 text-right tabular font-bold text-accent">
                {formatBRL(totals.custoDinheiroFundo)}
              </td>
              <td
                className={`px-3 py-3 text-right tabular font-bold ${
                  totals.saldoRepasse >= 0 ? "text-success" : "text-danger"
                }`}
              >
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