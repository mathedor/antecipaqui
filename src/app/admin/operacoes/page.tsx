import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { formatBRL } from "@/lib/format";
import { getAllOperacoes } from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Operações",
};

const STATUS_FILTERS = [
  { value: "", label: "Todas" },
  { value: "em_analise", label: "Em análise" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "em_assinatura", label: "Em assinatura" },
  { value: "ativa", label: "Ativas" },
  { value: "recusada", label: "Recusadas" },
  { value: "liquidada", label: "Liquidadas" },
];

type Search = { searchParams: Promise<{ status?: string }> };

export default async function AdminOperacoesPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const statusFilter = params.status || undefined;
  const operacoes = await getAllOperacoes(statusFilter);

  return (
    <AdminShell active="/admin/operacoes" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">operações</div>
        <h1 className="text-display-md">
          Todas as <span className="text-gradient-blue">operações</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          {operacoes.length}{" "}
          {operacoes.length === 1 ? "operação" : "operações"}
          {statusFilter ? ` filtradas por ${statusFilter}` : ""}
        </p>
      </div>

      {/* Filtros por status */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => {
          const active = (statusFilter ?? "") === f.value;
          const href = f.value
            ? `/admin/operacoes?status=${f.value}`
            : "/admin/operacoes";
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
            <div className="col-span-3">Corretor</div>
            <div className="col-span-3">Construtora</div>
            <div className="col-span-1 text-right">Comissão</div>
            <div className="col-span-1 text-right">VP</div>
            <div className="col-span-2">Status</div>
          </div>
          <ul>
            {operacoes.map((op) => (
              <li key={op.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/operacoes/${op.id}`}
                  className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors group items-center"
                >
                  <div className="col-span-2 font-mono text-sm text-fg">
                    {op.numero}
                  </div>
                  <div className="col-span-5 md:col-span-3 text-sm truncate">
                    <div className="text-fg truncate">{op.corretorNome ?? "—"}</div>
                    <div className="font-mono text-[10px] text-fg-dim truncate">
                      {op.corretorEmail}
                    </div>
                  </div>
                  <div className="hidden md:block col-span-3 text-sm text-fg-muted truncate">
                    {op.construtoraNome ?? "—"}
                  </div>
                  <div className="hidden md:block col-span-1 text-right font-mono tabular text-xs text-fg-muted">
                    {formatBRL(parseFloat(op.valorComissao))}
                  </div>
                  <div className="hidden md:block col-span-1 text-right font-mono tabular text-xs text-fg font-semibold">
                    {formatBRL(parseFloat(op.valorPresente))}
                  </div>
                  <div className="col-span-5 md:col-span-2 flex justify-end md:justify-start">
                    <OperacaoStatusBadge status={op.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  );
}
