"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { formatBRL } from "@/lib/format";

const STATUS = {
  a_vencer: {
    label: "A vencer",
    className: "bg-bg-soft text-fg-muted border-border",
  },
  vencida: {
    label: "Vencida",
    className: "bg-red-50 text-danger border-red-200",
  },
  paga: {
    label: "Paga",
    className: "bg-green-50 text-success border-green-200",
  },
} as const;

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function isOverdue(vencimento: string, status: string) {
  if (status !== "a_vencer") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const v = new Date(vencimento + "T00:00:00");
  return v < today;
}

type Row = {
  parcelaId: string;
  numero: number;
  vencimento: string;
  valor: string;
  pagoValor?: string | null;
  statusParcela: string;
  operacaoId: string;
  operacaoNumero: string;
  corretorNome: string | null;
};

export function DuplicatasTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable<Row>
      rows={rows}
      getKey={(r) => r.parcelaId}
      initialSort={{ key: "vencimento", dir: "asc" }}
      emptyLabel="Nenhuma duplicata encontrada."
      minWidth={900}
      columns={[
        {
          key: "numero",
          header: "#",
          align: "left",
          sortable: true,
          sortValue: (r) => r.numero,
          render: (r) => (
            <span className="font-mono text-xs text-fg-dim">
              #{String(r.numero).padStart(2, "0")}
            </span>
          ),
        },
        {
          key: "vencimento",
          header: "Vencimento",
          sortable: true,
          sortValue: (r) => r.vencimento,
          render: (r) => (
            <span className="text-fg">{formatDate(r.vencimento)}</span>
          ),
        },
        {
          key: "operacao",
          header: "Operação",
          sortable: true,
          sortValue: (r) => r.operacaoNumero,
          hideOnMobile: true,
          render: (r) => (
            <Link
              href={`/painel/operacoes/${r.operacaoId}`}
              className="font-mono text-sm text-fg-muted hover:text-accent"
            >
              {r.operacaoNumero}
            </Link>
          ),
        },
        {
          key: "corretor",
          header: "Imobiliária / Corretor",
          sortable: true,
          sortValue: (r) => r.corretorNome ?? "",
          hideOnMobile: true,
          render: (r) => (
            <span className="text-fg-muted truncate">
              {r.corretorNome ?? "—"}
            </span>
          ),
        },
        {
          key: "valor",
          header: "Valor",
          align: "right",
          sortable: true,
          sortValue: (r) => parseFloat(r.valor),
          render: (r) => (
            <span className="font-mono tabular text-fg font-semibold">
              {formatBRL(parseFloat(r.valor))}
            </span>
          ),
          footer: (rs) => sumBy(rs, (r) => parseFloat(r.valor), formatBRL),
        },
        {
          key: "status",
          header: "Status",
          align: "right",
          sortable: true,
          sortValue: (r) => {
            const s = isOverdue(r.vencimento, r.statusParcela)
              ? "vencida"
              : r.statusParcela;
            return s;
          },
          render: (r) => {
            const overdue = isOverdue(r.vencimento, r.statusParcela);
            const effective = overdue ? "vencida" : r.statusParcela;
            const s =
              STATUS[effective as keyof typeof STATUS] ?? STATUS.a_vencer;
            return (
              <div className="flex items-center justify-end gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider font-mono font-semibold ${s.className}`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {s.label}
                </span>
                {r.statusParcela === "paga" && (
                  <Link
                    href={`/painel/duplicatas/${r.parcelaId}/recibo`}
                    className="text-[10px] font-mono uppercase tracking-wider text-accent hover:underline whitespace-nowrap"
                  >
                    recibo ↗
                  </Link>
                )}
              </div>
            );
          },
        },
      ]}
    />
  );
}
