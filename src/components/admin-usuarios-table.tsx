"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { AdminRowActions } from "@/components/admin-row-actions";
import { AdminCobrarButton } from "@/components/admin-cobrar-button";
import { formatBRL } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Admin",
};

type Row = {
  id: string;
  email: string;
  nome: string | null;
  role: string;
  isActive: boolean;
  cadastroCompleto: boolean;
  docsFaltando: string[];
  totalOperacoes: number;
  valorOperado: number;
};

export function AdminUsuariosTable({ rows }: { rows: Row[] }) {
  return (
    <DataTable<Row>
      rows={rows}
      getKey={(r) => r.id}
      initialSort={{ key: "valorOperado", dir: "desc" }}
      emptyLabel="Nenhum usuário com os filtros atuais."
      minWidth={900}
      columns={[
        {
          key: "nome",
          header: "Nome",
          sortable: true,
          sortValue: (r) => r.nome ?? "",
          render: (r) => (
            <Link
              href={`/admin/usuarios/${r.id}`}
              className="block text-fg hover:text-accent"
            >
              <div className="font-semibold truncate">
                {r.nome ?? "(sem nome)"}
              </div>
            </Link>
          ),
        },
        {
          key: "email",
          header: "Email",
          sortable: true,
          sortValue: (r) => r.email,
          hideOnMobile: true,
          render: (r) => (
            <span className="font-mono text-xs text-fg-muted">{r.email}</span>
          ),
        },
        {
          key: "role",
          header: "Tipo",
          sortable: true,
          sortValue: (r) => ROLE_LABEL[r.role] ?? r.role,
          render: (r) => (
            <span className="text-fg-muted">
              {ROLE_LABEL[r.role] ?? r.role}
            </span>
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
          hideOnMobile: true,
          render: (r) => (
            <span className="font-mono tabular text-fg font-semibold">
              {formatBRL(r.valorOperado)}
            </span>
          ),
          footer: (rs) => sumBy(rs, (r) => r.valorOperado, formatBRL),
        },
        {
          key: "cadastro",
          header: "Cadastro",
          render: (r) => (
            <CadastroBadge
              cadastroCompleto={r.cadastroCompleto}
              isActive={r.isActive}
              role={r.role}
              docsFaltando={r.docsFaltando}
            />
          ),
        },
      ]}
      rowActions={(r) => (
        <AdminRowActions
          viewHref={`/admin/usuarios/${r.id}`}
          editHref={`/admin/usuarios/${r.id}/editar`}
        >
          {!r.cadastroCompleto && r.role !== "admin" && (
            <AdminCobrarButton target="user" id={r.id} />
          )}
        </AdminRowActions>
      )}
    />
  );
}

function CadastroBadge({
  cadastroCompleto,
  isActive,
  role,
  docsFaltando,
}: {
  cadastroCompleto: boolean;
  isActive: boolean;
  role: string;
  docsFaltando: string[];
}) {
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-red-50 text-danger border-danger/40">
        ⛔ bloqueado
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono bg-bg-card text-fg-dim border-border">
        admin
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
