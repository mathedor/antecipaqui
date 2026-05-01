"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { AdminRowActions } from "@/components/admin-row-actions";
import { ExportCsvButton } from "@/components/export-csv-button";
import { formatBRL } from "@/lib/format";

type Row = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  taxaMensalBase: string;
  isActive: boolean;
  contatoResponsavel: string | null;
  emailComercial: string | null;
  ownerUserId: string | null;
  qtdOperacoes: number;
  valorOperado: number;
};

export function AdminFundosTable({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportCsvButton
          filename={`fundos-${new Date().toISOString().slice(0, 10)}`}
          headers={[
            "Razão social",
            "CNPJ",
            "Taxa base (% a.m.)",
            "Contato",
            "Email",
            "Login criado",
            "Operações",
            "Valor operado (R$)",
            "Status",
          ]}
          getRows={() =>
            rows.map((r) => [
              r.razaoSocial,
              r.cnpj,
              (parseFloat(r.taxaMensalBase) * 100).toFixed(2),
              r.contatoResponsavel ?? "",
              r.emailComercial ?? "",
              r.ownerUserId ? "sim" : "não",
              r.qtdOperacoes,
              r.valorOperado.toFixed(2),
              r.isActive ? "ativo" : "inativo",
            ])
          }
        />
      </div>
      <DataTable<Row>
        rows={rows}
        getKey={(r) => r.id}
        initialSort={{ key: "valorOperado", dir: "desc" }}
        emptyLabel="Nenhum fundo cadastrado ainda."
        minWidth={900}
        columns={[
          {
            key: "razaoSocial",
            header: "Razão social",
            sortable: true,
            sortValue: (r) => r.razaoSocial,
            render: (r) => (
              <Link
                href={`/admin/fundos/${r.id}`}
                className="block text-fg hover:text-accent"
              >
                <div className="font-semibold truncate">{r.razaoSocial}</div>
                {r.nomeFantasia && (
                  <div className="text-fg-muted text-xs truncate">
                    {r.nomeFantasia}
                  </div>
                )}
              </Link>
            ),
          },
          {
            key: "cnpj",
            header: "CNPJ",
            sortable: true,
            sortValue: (r) => r.cnpj,
            hideOnMobile: true,
            render: (r) => (
              <span className="font-mono text-xs text-fg-muted">{r.cnpj}</span>
            ),
          },
          {
            key: "taxa",
            header: "Taxa base",
            align: "right",
            sortable: true,
            sortValue: (r) => parseFloat(r.taxaMensalBase),
            render: (r) => (
              <span className="font-mono tabular text-fg font-semibold">
                {(parseFloat(r.taxaMensalBase) * 100)
                  .toFixed(2)
                  .replace(".", ",")}
                %
              </span>
            ),
          },
          {
            key: "qtdOperacoes",
            header: "Ops",
            align: "right",
            sortable: true,
            sortValue: (r) => r.qtdOperacoes,
            render: (r) => (
              <span className="font-mono tabular text-fg-muted">
                {r.qtdOperacoes}
              </span>
            ),
            footer: (rs) =>
              rs
                .reduce((s, r) => s + r.qtdOperacoes, 0)
                .toLocaleString("pt-BR"),
          },
          {
            key: "valorOperado",
            header: "Valor operado",
            align: "right",
            sortable: true,
            sortValue: (r) => r.valorOperado,
            render: (r) => (
              <span className="font-mono tabular text-fg font-semibold">
                {formatBRL(r.valorOperado)}
              </span>
            ),
            footer: (rs) => sumBy(rs, (r) => r.valorOperado, formatBRL),
          },
          {
            key: "login",
            header: "Login",
            align: "center",
            hideOnMobile: true,
            render: (r) => (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${
                  r.ownerUserId
                    ? "bg-green-50 text-success border-green-200"
                    : "bg-yellow-50 text-warn border-yellow-200"
                }`}
              >
                {r.ownerUserId ? "✓ ok" : "⚠ pendente"}
              </span>
            ),
          },
        ]}
        rowActions={(r) => (
          <AdminRowActions
            viewHref={`/admin/fundos/${r.id}`}
            editHref={`/admin/fundos/${r.id}/editar`}
          />
        )}
      />
    </div>
  );
}
