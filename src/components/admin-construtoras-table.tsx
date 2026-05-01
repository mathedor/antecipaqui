"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { AdminRowActions } from "@/components/admin-row-actions";
import { AdminCobrarButton } from "@/components/admin-cobrar-button";
import { formatBRL } from "@/lib/format";

type Row = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  ownerUserId: string | null;
  isActive: boolean;
  cadastroCompleto: boolean;
  docsFaltando: string[];
  totalOperacoes: number;
  valorOperado: number;
};

export function AdminConstrutorasTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable<Row>
      rows={rows}
      getKey={(r) => r.id}
      initialSort={{ key: "valorOperado", dir: "desc" }}
      emptyLabel="Nenhuma construtora com os filtros atuais."
      minWidth={900}
      columns={[
        {
          key: "razaoSocial",
          header: "Razão social",
          sortable: true,
          sortValue: (r) => r.razaoSocial,
          render: (r) => (
            <Link
              href={`/admin/construtoras/${r.id}`}
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
          key: "totalOperacoes",
          header: "Ops",
          align: "right",
          sortable: true,
          sortValue: (r) => r.totalOperacoes,
          hideOnMobile: true,
          render: (r) => (
            <span className="font-mono tabular text-fg-muted">
              {r.totalOperacoes}
            </span>
          ),
          footer: (rs) =>
            rs.reduce((s, r) => s + r.totalOperacoes, 0).toLocaleString("pt-BR"),
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
          key: "responsavel",
          header: "Resp.",
          align: "center",
          hideOnMobile: true,
          render: (r) => (
            <span className="text-xs text-fg-muted">
              {r.ownerUserId ? "✓" : "—"}
            </span>
          ),
        },
        {
          key: "cadastro",
          header: "Cadastro",
          render: (r) => (
            <CadastroBadge
              cadastroCompleto={r.cadastroCompleto}
              isActive={r.isActive}
              docsFaltando={r.docsFaltando}
            />
          ),
        },
      ]}
      rowActions={(r) => (
        <AdminRowActions
          viewHref={`/admin/construtoras/${r.id}`}
          editHref={`/admin/construtoras/${r.id}/editar`}
        >
          {!r.cadastroCompleto && (
            <AdminCobrarButton target="construtora" id={r.id} />
          )}
        </AdminRowActions>
      )}
    />
  );
}

function CadastroBadge({
  cadastroCompleto,
  isActive,
  docsFaltando,
}: {
  cadastroCompleto: boolean;
  isActive: boolean;
  docsFaltando: string[];
}) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-red-50 text-danger border-danger/40">
        ⛔ bloqueada
      </span>
    );
  }
  if (cadastroCompleto) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-green-50 text-success border-green-200">
        ✓ completo
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-yellow-50 text-warn border-yellow-200"
      title={
        docsFaltando.length > 0
          ? `Falta: ${docsFaltando.join(", ")}`
          : "Pendente"
      }
    >
      ⚠ pendente
    </span>
  );
}
