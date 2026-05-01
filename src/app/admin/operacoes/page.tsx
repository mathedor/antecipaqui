import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminOperacoesTable } from "@/components/admin-operacoes-table";
import {
  DateRangeFilter,
  OperacoesStatBoxes,
} from "@/components/operacoes-stats";
import {
  getAdminOperacoesStatBoxes,
  getAllOperacoes,
} from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Operações",
};

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação" },
  { value: "documentos_incompletos", label: "Docs incompletos" },
  { value: "pre_aprovada", label: "Pré-aprovadas" },
  { value: "analise_final", label: "Análise final" },
  { value: "enviada_para_assinatura", label: "Em assinatura" },
  { value: "enviada_para_pagamento", label: "Em pagamento" },
  { value: "realizada", label: "Realizadas" },
  { value: "recusada", label: "Recusadas" },
  { value: "cancelada", label: "Canceladas" },
];

type Search = {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
};

export default async function AdminOperacoesPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const statusFilter = params.status || undefined;
  const from = params.from;
  const to = params.to;

  const [stats, operacoes] = await Promise.all([
    getAdminOperacoesStatBoxes(),
    getAllOperacoes({ status: statusFilter, from, to }),
  ]);

  return (
    <AdminShell active="/admin/operacoes" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">operações</div>
        <h1 className="text-display-md">
          Todas as <span className="text-gradient-blue">operações</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          {operacoes.length}{" "}
          {operacoes.length === 1 ? "operação" : "operações"} no resultado
        </p>
      </div>

      {/* Stats agregados (sempre totais, não respeitam filtros) */}
      <OperacoesStatBoxes stats={stats} />

      {/* Filtro por data */}
      <DateRangeFilter preserveParams={["status"]} />

      {/* Filtros por status */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-16 shrink-0">
          Status
        </span>
        {STATUS_FILTERS.map((f) => {
          const active = (statusFilter ?? "") === f.value;
          const qs = new URLSearchParams();
          if (f.value) qs.set("status", f.value);
          if (from) qs.set("from", from);
          if (to) qs.set("to", to);
          const query = qs.toString();
          const href = `/admin/operacoes${query ? `?${query}` : ""}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={`chip ${active ? "chip-accent" : ""}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <AdminOperacoesTable rows={operacoes} />
    </AdminShell>
  );
}
