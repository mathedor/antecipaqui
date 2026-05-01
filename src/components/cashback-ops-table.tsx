"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { formatBRL } from "@/lib/format";

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

type Row = {
  id: string;
  numero: string;
  status: string;
  valorPresente: string;
  cashbackValor: string | null;
  cashbackPercent: string | null;
  cashbackSacadoEm: Date | string | null;
};

export function CashbackOpsTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable<Row>
      rows={rows}
      getKey={(r) => r.id}
      initialSort={{ key: "cashbackValor", dir: "desc" }}
      emptyLabel="Nenhuma operação com cashback ainda."
      minWidth={780}
      columns={[
        {
          key: "numero",
          header: "Número",
          sortable: true,
          sortValue: (r) => r.numero,
          render: (r) => (
            <Link
              href={`/painel/operacoes/${r.id}`}
              className="font-mono text-fg hover:text-accent"
            >
              {r.numero}
            </Link>
          ),
        },
        {
          key: "valorPresente",
          header: "VP",
          align: "right",
          sortable: true,
          sortValue: (r) => parseFloat(r.valorPresente),
          render: (r) => (
            <span className="font-mono tabular text-fg-muted">
              {formatBRL(parseFloat(r.valorPresente))}
            </span>
          ),
          footer: (rs) =>
            sumBy(rs, (r) => parseFloat(r.valorPresente), formatBRL),
        },
        {
          key: "status",
          header: "Status",
          sortable: true,
          sortValue: (r) => r.status,
          render: (r) => <OperacaoStatusBadge status={r.status} />,
        },
        {
          key: "cashbackValor",
          header: "Cashback",
          align: "right",
          sortable: true,
          sortValue: (r) => parseFloat(r.cashbackValor ?? "0"),
          render: (r) => (
            <div>
              <div className="font-mono tabular text-sm font-bold text-success">
                {formatBRL(parseFloat(r.cashbackValor ?? "0"))}
              </div>
              <div className="text-[10px] text-fg-dim font-mono">
                {(parseFloat(r.cashbackPercent ?? "0") * 100)
                  .toFixed(2)
                  .replace(".", ",")}
                %
              </div>
            </div>
          ),
          footer: (rs) =>
            sumBy(rs, (r) => parseFloat(r.cashbackValor ?? "0"), formatBRL),
        },
        {
          key: "cashbackStatus",
          header: "Saque",
          align: "right",
          sortable: true,
          sortValue: (r) => (r.cashbackSacadoEm ? "sacado" : "disponivel"),
          render: (r) =>
            r.cashbackSacadoEm ? (
              <span className="text-fg-dim text-[10px] font-mono">
                sacado {formatDate(r.cashbackSacadoEm)}
              </span>
            ) : (
              <span className="text-success text-[10px] font-mono">
                disponível
              </span>
            ),
        },
      ]}
    />
  );
}
