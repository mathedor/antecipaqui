"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { AdminRowActions } from "@/components/admin-row-actions";
import { NotificarWhatsappRowActions } from "@/components/notificar-whatsapp-button";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { ExportCsvButton } from "@/components/export-csv-button";
import { formatBRL } from "@/lib/format";

type Row = {
  id: string;
  numero: string;
  status: string;
  valorPresente: string;
  valorComissao: string;
  corretorNome: string | null;
  corretorEmail: string | null;
  corretorTelefone: string | null;
  construtoraNome: string | null;
  construtoraTelefone: string | null;
};

export function AdminOperacoesTable({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportCsvButton
          filename={`operacoes-${new Date().toISOString().slice(0, 10)}`}
          headers={[
            "Número",
            "Status",
            "Imobiliária / Corretor",
            "Email corretor",
            "Construtora",
            "Comissão (R$)",
            "Valor presente (R$)",
          ]}
          getRows={() =>
            rows.map((r) => [
              r.numero,
              r.status,
              r.corretorNome ?? "",
              r.corretorEmail ?? "",
              r.construtoraNome ?? "",
              parseFloat(r.valorComissao).toFixed(2),
              parseFloat(r.valorPresente).toFixed(2),
            ])
          }
        />
      </div>
      <DataTable<Row>
      rows={rows}
      getKey={(r) => r.id}
      initialSort={{ key: "valorPresente", dir: "desc" }}
      emptyLabel="Nenhuma operação encontrada."
      minWidth={1000}
      columns={[
        {
          key: "numero",
          header: "Número",
          sortable: true,
          sortValue: (r) => r.numero,
          render: (r) => (
            <Link
              href={`/admin/operacoes/${r.id}`}
              className="font-mono text-fg hover:text-accent"
            >
              {r.numero}
            </Link>
          ),
        },
        {
          key: "corretor",
          header: "Imobiliária / Corretor",
          sortable: true,
          sortValue: (r) => r.corretorNome ?? "",
          render: (r) => (
            <div className="truncate">
              <div className="text-fg truncate">{r.corretorNome ?? "—"}</div>
              <div className="font-mono text-[10px] text-fg-dim truncate">
                {r.corretorEmail ?? ""}
              </div>
            </div>
          ),
        },
        {
          key: "construtora",
          header: "Construtora",
          sortable: true,
          sortValue: (r) => r.construtoraNome ?? "",
          hideOnMobile: true,
          render: (r) => (
            <span className="text-fg-muted truncate">
              {r.construtoraNome ?? "—"}
            </span>
          ),
        },
        {
          key: "valorComissao",
          header: "Comissão",
          align: "right",
          sortable: true,
          sortValue: (r) => parseFloat(r.valorComissao),
          hideOnMobile: true,
          render: (r) => (
            <span className="font-mono tabular text-xs text-fg-muted">
              {formatBRL(parseFloat(r.valorComissao))}
            </span>
          ),
          footer: (rs) =>
            sumBy(rs, (r) => parseFloat(r.valorComissao), formatBRL),
        },
        {
          key: "valorPresente",
          header: "VP",
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
      ]}
      rowActions={(r) => (
        <>
          <NotificarWhatsappRowActions
            operacao={{
              numero: r.numero,
              status: r.status,
              valorPresente: parseFloat(r.valorPresente),
              valorComissao: parseFloat(r.valorComissao),
              construtoraNome: r.construtoraNome,
              corretorNome: r.corretorNome,
            }}
            corretor={{ phone: r.corretorTelefone, nome: r.corretorNome }}
            construtora={{
              phone: r.construtoraTelefone,
              nome: r.construtoraNome,
            }}
          />
          <AdminRowActions
            viewHref={`/admin/operacoes/${r.id}`}
            editHref={`/admin/operacoes/${r.id}/editar`}
          />
        </>
      )}
    />
    </div>
  );
}
