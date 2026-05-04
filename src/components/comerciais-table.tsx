"use client";

import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { AdminRowActions } from "@/components/admin-row-actions";
import { ExportCsvButton } from "@/components/export-csv-button";
import { maskCNPJ, maskCPF } from "@/lib/cnpj";

type Row = {
  id: string;
  tipoPessoa: string;
  nomeCompleto: string;
  apelido: string | null;
  documento: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  uf: string | null;
  isActive: boolean;
  ownerUserId: string | null;
};

function fmtDoc(r: Row) {
  return r.tipoPessoa === "fisica" ? maskCPF(r.documento) : maskCNPJ(r.documento);
}

export function ComerciaisTable({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportCsvButton
          filename={`comerciais-${new Date().toISOString().slice(0, 10)}`}
          headers={[
            "Tipo",
            "Nome / Razão social",
            "Apelido / Fantasia",
            "Documento",
            "Email",
            "Telefone",
            "Cidade/UF",
            "Login",
          ]}
          getRows={() =>
            rows.map((r) => [
              r.tipoPessoa === "fisica" ? "PF" : "PJ",
              r.nomeCompleto,
              r.apelido ?? "",
              fmtDoc(r),
              r.email,
              r.telefone ?? "",
              [r.cidade, r.uf].filter(Boolean).join(" / "),
              r.ownerUserId ? "ok" : "pendente",
            ])
          }
        />
      </div>
      <DataTable<Row>
        rows={rows}
        getKey={(r) => r.id}
        initialSort={{ key: "nomeCompleto", dir: "asc" }}
        emptyLabel="Nenhum comercial cadastrado ainda."
        minWidth={900}
        columns={[
          {
            key: "tipoPessoa",
            header: "Tipo",
            sortable: true,
            sortValue: (r) => r.tipoPessoa,
            render: (r) => (
              <span
                className={`chip text-[10px] ${
                  r.tipoPessoa === "fisica"
                    ? "bg-accent-soft text-accent border-accent/30"
                    : "bg-violet-50 text-violet-700 border-violet-200"
                }`}
              >
                {r.tipoPessoa === "fisica" ? "PF" : "PJ"}
              </span>
            ),
          },
          {
            key: "nomeCompleto",
            header: "Nome / Razão social",
            sortable: true,
            sortValue: (r) => r.nomeCompleto,
            render: (r) => (
              <Link
                href={`/admin/comerciais/${r.id}`}
                className="block text-fg hover:text-accent"
              >
                <div className="font-semibold truncate">{r.nomeCompleto}</div>
                {r.apelido && (
                  <div className="text-fg-muted text-xs truncate">{r.apelido}</div>
                )}
              </Link>
            ),
          },
          {
            key: "documento",
            header: "Documento",
            sortable: true,
            sortValue: (r) => r.documento,
            hideOnMobile: true,
            render: (r) => (
              <span className="font-mono text-xs text-fg-muted">{fmtDoc(r)}</span>
            ),
          },
          {
            key: "email",
            header: "Email",
            sortable: true,
            sortValue: (r) => r.email,
            hideOnMobile: true,
            render: (r) => (
              <span className="font-mono text-xs text-fg-muted truncate block max-w-[220px]">
                {r.email}
              </span>
            ),
          },
          {
            key: "cidade",
            header: "Cidade",
            sortable: true,
            sortValue: (r) => r.cidade ?? "",
            hideOnMobile: true,
            render: (r) => (
              <span className="text-xs text-fg-muted">
                {[r.cidade, r.uf].filter(Boolean).join(" / ") || "—"}
              </span>
            ),
          },
          {
            key: "login",
            header: "Login",
            align: "center",
            sortable: true,
            sortValue: (r) => (r.ownerUserId ? "ok" : "pend"),
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
            viewHref={`/admin/comerciais/${r.id}`}
            editHref={`/admin/comerciais/${r.id}/editar`}
          />
        )}
      />
    </div>
  );
}
