"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { formatBRL } from "@/lib/format";

type Row = {
  id: string;
  numero: string;
  status: string;
  valorComissao: string;
  valorPresente: string;
  counterpartyLabel: string | null;
  createdAt: Date | string;
};

export function PainelOperacoesTable({
  rows,
  counterpartyHeader,
  canClone = false,
}: {
  rows: Row[];
  counterpartyHeader: string;
  /** Quando true, mostra coluna "Clonar" linkando pra /painel/operacoes/nova?from=ID */
  canClone?: boolean;
}) {
  return (
    <DataTable<Row>
      rows={rows}
      getKey={(r) => r.id}
      initialSort={{ key: "createdAt", dir: "desc" }}
      emptyLabel="Nenhuma operação no período."
      minWidth={900}
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
          key: "counterparty",
          header: counterpartyHeader,
          sortable: true,
          sortValue: (r) => r.counterpartyLabel ?? "",
          render: (r) => (
            <span className="text-fg-muted truncate">
              {r.counterpartyLabel ?? "—"}
            </span>
          ),
        },
        {
          key: "valorComissao",
          header: "Comissão",
          align: "right",
          sortable: true,
          sortValue: (r) => parseFloat(r.valorComissao),
          render: (r) => (
            <span className="font-mono tabular text-fg-muted">
              {formatBRL(parseFloat(r.valorComissao))}
            </span>
          ),
          footer: (rs) =>
            sumBy(rs, (r) => parseFloat(r.valorComissao), formatBRL),
        },
        {
          key: "valorPresente",
          header: "Valor presente",
          align: "right",
          sortable: true,
          sortValue: (r) => parseFloat(r.valorPresente),
          render: (r) => (
            <span className="font-mono tabular text-fg font-semibold">
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
          key: "createdAt",
          header: "Criada",
          align: "right",
          sortable: true,
          sortValue: (r) => new Date(r.createdAt).getTime(),
          hideOnMobile: true,
          render: (r) => (
            <span className="font-mono text-[10px] text-fg-dim">
              {new Date(r.createdAt).toLocaleDateString("pt-BR")}
            </span>
          ),
        },
        ...(canClone
          ? [
              {
                key: "clone" as const,
                header: "",
                align: "right" as const,
                render: (r: Row) => (
                  <Link
                    href={`/painel/operacoes/nova?from=${r.id}`}
                    className="text-[10px] font-mono uppercase tracking-wider text-accent hover:underline whitespace-nowrap"
                    title="Criar nova operação a partir desta (mesma construtora, valores, parcelas)"
                  >
                    🔁 clonar
                  </Link>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
