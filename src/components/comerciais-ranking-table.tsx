"use client";

import Link from "next/link";
import { DataTable, sumBy } from "@/components/data-table";
import { ExportCsvButton } from "@/components/export-csv-button";
import { formatBRL } from "@/lib/format";

type Row = {
  id: string;
  nome: string;
  apelido: string | null;
  tipoPessoa: string;
  email: string;
  qtdOperacoes: number;
  qtdRealizadas: number;
  volumeOperado: number;
  comissoesIntermediadas: number;
  jurosTotal: number;
  lucroLiquido: number;
  comissaoComercial: number;
};

export function ComerciaisRankingTable({ rows }: { rows: Row[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportCsvButton
          filename={`comerciais-desempenho-${new Date().toISOString().slice(0, 10)}`}
          headers={[
            "Comercial",
            "Tipo",
            "Email",
            "Operações",
            "Realizadas",
            "Volume operado (R$)",
            "Juros gerados (R$)",
            "Lucro líquido (R$)",
            "Comissão comercial (R$)",
          ]}
          getRows={() =>
            rows.map((r) => [
              r.apelido ?? r.nome,
              r.tipoPessoa === "fisica" ? "PF" : "PJ",
              r.email,
              r.qtdOperacoes,
              r.qtdRealizadas,
              r.volumeOperado.toFixed(2),
              r.jurosTotal.toFixed(2),
              r.lucroLiquido.toFixed(2),
              r.comissaoComercial.toFixed(2),
            ])
          }
        />
      </div>
      <DataTable<Row>
        rows={rows}
        getKey={(r) => r.id}
        initialSort={{ key: "volumeOperado", dir: "desc" }}
        emptyLabel="Nenhum comercial com operações."
        minWidth={1100}
        columns={[
          {
            key: "nome",
            header: "Comercial",
            sortable: true,
            sortValue: (r) => r.apelido ?? r.nome,
            render: (r) => (
              <Link
                href={`/admin/comerciais/${r.id}`}
                className="block text-fg hover:text-accent"
              >
                <div className="font-semibold truncate">
                  {r.apelido ?? r.nome}
                </div>
                {r.apelido && (
                  <div className="text-fg-muted text-xs truncate">{r.nome}</div>
                )}
              </Link>
            ),
          },
          {
            key: "tipoPessoa",
            header: "Tipo",
            sortable: true,
            sortValue: (r) => r.tipoPessoa,
            hideOnMobile: true,
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
            key: "qtdOperacoes",
            header: "Ops",
            align: "right",
            sortable: true,
            sortValue: (r) => r.qtdOperacoes,
            render: (r) => (
              <div className="text-right">
                <div className="font-mono tabular text-fg font-semibold">
                  {r.qtdOperacoes}
                </div>
                <div className="font-mono text-[10px] text-success">
                  {r.qtdRealizadas} realizadas
                </div>
              </div>
            ),
            footer: (rs) =>
              rs.reduce((s, r) => s + r.qtdOperacoes, 0).toLocaleString("pt-BR"),
          },
          {
            key: "volumeOperado",
            header: "Volume",
            align: "right",
            sortable: true,
            sortValue: (r) => r.volumeOperado,
            render: (r) => (
              <span className="font-mono tabular text-fg font-semibold">
                {formatBRL(r.volumeOperado)}
              </span>
            ),
            footer: (rs) => sumBy(rs, (r) => r.volumeOperado, formatBRL),
          },
          {
            key: "jurosTotal",
            header: "Juros gerados",
            align: "right",
            sortable: true,
            sortValue: (r) => r.jurosTotal,
            hideOnMobile: true,
            render: (r) => (
              <span className="font-mono tabular text-warn">
                {formatBRL(r.jurosTotal)}
              </span>
            ),
            footer: (rs) => sumBy(rs, (r) => r.jurosTotal, formatBRL),
          },
          {
            key: "lucroLiquido",
            header: "Lucro líquido",
            align: "right",
            sortable: true,
            sortValue: (r) => r.lucroLiquido,
            hideOnMobile: true,
            render: (r) => (
              <span className="font-mono tabular text-fg-muted">
                {formatBRL(r.lucroLiquido)}
              </span>
            ),
            footer: (rs) => sumBy(rs, (r) => r.lucroLiquido, formatBRL),
          },
          {
            key: "comissaoComercial",
            header: "Comissão (10%)",
            align: "right",
            sortable: true,
            sortValue: (r) => r.comissaoComercial,
            render: (r) => (
              <span className="font-mono tabular text-success font-bold">
                {formatBRL(r.comissaoComercial)}
              </span>
            ),
            footer: (rs) => sumBy(rs, (r) => r.comissaoComercial, formatBRL),
          },
        ]}
      />
    </div>
  );
}
