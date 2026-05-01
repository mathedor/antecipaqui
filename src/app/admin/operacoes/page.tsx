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
import { listFundosForSelector } from "@/lib/actions/fundos";

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
  searchParams: Promise<{
    status?: string;
    from?: string;
    to?: string;
    q?: string;
    minValor?: string;
    maxValor?: string;
    fundoId?: string;
  }>;
};

export default async function AdminOperacoesPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const statusFilter = params.status || undefined;
  const from = params.from;
  const to = params.to;
  const q = params.q;
  const minValor = params.minValor ? parseFloat(params.minValor) : undefined;
  const maxValor = params.maxValor ? parseFloat(params.maxValor) : undefined;
  const fundoId = params.fundoId || undefined;

  const [stats, operacoes, fundos] = await Promise.all([
    getAdminOperacoesStatBoxes(),
    getAllOperacoes({
      status: statusFilter,
      from,
      to,
      q,
      minValor,
      maxValor,
      fundoId,
    }),
    listFundosForSelector(),
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

      {/* Busca + range de valor + fundo */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 md:p-5 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3"
      >
        <div className="md:col-span-2">
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            Buscar (número, construtora, corretor, email)
          </label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Ex: OP-2026 ou nome..."
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            Fundo
          </label>
          <select
            name="fundoId"
            defaultValue={fundoId ?? ""}
            className="form-input"
          >
            <option value="">Todos</option>
            {fundos.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nomeFantasia ?? f.razaoSocial}
              </option>
            ))}
            <option value="_no_fundo_">— sem fundo —</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            VP min (R$)
          </label>
          <input
            name="minValor"
            type="number"
            step="100"
            defaultValue={params.minValor ?? ""}
            placeholder="0"
            className="form-input"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            VP max (R$)
          </label>
          <input
            name="maxValor"
            type="number"
            step="100"
            defaultValue={params.maxValor ?? ""}
            placeholder="∞"
            className="form-input"
          />
        </div>
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {from && <input type="hidden" name="from" value={from} />}
        {to && <input type="hidden" name="to" value={to} />}
        <div className="md:col-span-5 flex items-center gap-2">
          <button type="submit" className="btn-primary !h-10 !px-5">
            Filtrar
          </button>
          {(q || params.minValor || params.maxValor || fundoId) && (
            <Link
              href={`/admin/operacoes${
                statusFilter ? `?status=${statusFilter}` : ""
              }`}
              className="text-fg-muted hover:text-fg text-sm"
            >
              limpar busca
            </Link>
          )}
        </div>
      </form>

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
          if (q) qs.set("q", q);
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

      <AdminOperacoesTable rows={operacoes} fundos={fundos} />
    </AdminShell>
  );
}
