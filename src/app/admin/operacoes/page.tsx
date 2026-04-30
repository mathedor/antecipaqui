import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminRowActions } from "@/components/admin-row-actions";
import { NotificarWhatsappRowActions } from "@/components/notificar-whatsapp-button";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import {
  DateRangeFilter,
  OperacoesStatBoxes,
} from "@/components/operacoes-stats";
import { formatBRL } from "@/lib/format";
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

      {operacoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <p className="text-fg-muted">Nenhuma operação encontrada.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border bg-bg-card">
            <div className="col-span-2">Número</div>
            <div className="col-span-3">Imobiliária / Corretor</div>
            <div className="col-span-2">Construtora</div>
            <div className="col-span-1 text-right">VP</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>
          <ul>
            {operacoes.map((op) => (
              <li
                key={op.id}
                className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors items-center border-b border-border last:border-0"
              >
                <Link
                  href={`/admin/operacoes/${op.id}`}
                  className="col-span-2 font-mono text-sm text-fg hover:text-accent"
                >
                  {op.numero}
                </Link>
                <div className="col-span-5 md:col-span-3 text-sm truncate">
                  <div className="text-fg truncate">{op.corretorNome ?? "—"}</div>
                  <div className="font-mono text-[10px] text-fg-dim truncate">
                    {op.corretorEmail}
                  </div>
                </div>
                <div className="hidden md:block col-span-2 text-sm text-fg-muted truncate">
                  {op.construtoraNome ?? "—"}
                </div>
                <div className="hidden md:block col-span-1 text-right font-mono tabular text-xs text-fg font-semibold">
                  {formatBRL(parseFloat(op.valorPresente))}
                </div>
                <div className="col-span-5 md:col-span-2 flex justify-end md:justify-start">
                  <OperacaoStatusBadge status={op.status} />
                </div>
                <div className="hidden md:flex col-span-2 justify-end items-center gap-1.5">
                  <NotificarWhatsappRowActions
                    operacao={{
                      numero: op.numero,
                      status: op.status,
                      valorPresente: parseFloat(op.valorPresente),
                      valorComissao: parseFloat(op.valorComissao),
                      construtoraNome: op.construtoraNome,
                      corretorNome: op.corretorNome,
                    }}
                    corretor={{
                      phone: op.corretorTelefone,
                      nome: op.corretorNome,
                    }}
                    construtora={{
                      phone: op.construtoraTelefone,
                      nome: op.construtoraNome,
                    }}
                  />
                  <AdminRowActions
                    viewHref={`/admin/operacoes/${op.id}`}
                    editHref={`/admin/operacoes/${op.id}/editar`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  );
}
