import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { AdminCharts } from "@/components/dashboard-charts";
import { formatBRL } from "@/lib/format";
import {
  getAdminMonthlyStats,
  getAdminStats,
  getAllOperacoes,
} from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Dashboard",
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [stats, recent, monthly] = await Promise.all([
    getAdminStats(),
    getAllOperacoes(),
    getAdminMonthlyStats(),
  ]);

  const recentes = recent.slice(0, 8);
  const pendentes = recent.filter((o) =>
    ["aguardando_aprovacao", "documentos_incompletos"].includes(o.status),
  );

  return (
    <AdminShell active="/admin" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">painel administrativo</div>
        <h1 className="text-display-md">
          Operação <span className="text-gradient-blue">geral</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Visão consolidada de todas as operações do sistema.
        </p>
      </div>

      {/* Gráficos — 12 meses */}
      <div className="mb-10">
        <AdminCharts data={monthly} />
      </div>

      {/* Stats top — 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <StatCard
          label="Pendentes aprovação"
          value={String(stats.pendentesAprovacao)}
          tone={stats.pendentesAprovacao > 0 ? "warn" : "default"}
          href="/admin/operacoes?status=aguardando_aprovacao"
        />
        <StatCard
          label="Aprovadas / ativas"
          value={String(stats.aprovadas)}
        />
        <StatCard
          label="Liquidadas"
          value={String(stats.liquidadas)}
        />
        <StatCard
          label="Recusadas"
          value={String(stats.recusadas)}
          href="/admin/operacoes?status=recusada"
        />
        <StatCard
          label="Total operações"
          value={String(stats.totalOperacoes)}
          href="/admin/operacoes"
        />
      </div>

      {/* Stats financeiros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Comissão total"
          value={formatBRL(stats.valorComissaoTotal)}
          sublabel="todas as operações"
        />
        <StatCard
          label="Já antecipado"
          value={formatBRL(stats.valorAntecipado)}
          sublabel="creditado a corretores"
          highlight
        />
        <StatCard
          label="A vencer"
          value={formatBRL(stats.aVencer)}
          sublabel="parcelas pendentes"
        />
        <StatCard
          label="Vencidas"
          value={formatBRL(stats.vencidas)}
          sublabel="atenção necessária"
          tone={stats.vencidas > 0 ? "danger" : "default"}
        />
      </div>

      {/* Pendentes alert */}
      {pendentes.length > 0 && (
        <div className="rounded-2xl border border-warn/40 bg-yellow-50 p-5 mb-6 flex items-start gap-4">
          <span className="size-9 rounded-full bg-warn/20 text-warn flex items-center justify-center text-xl shrink-0">
            ⏳
          </span>
          <div className="flex-1">
            <h2 className="font-bold">
              {pendentes.length}{" "}
              {pendentes.length === 1 ? "operação" : "operações"} aguardando análise
            </h2>
            <p className="mt-1 text-fg-muted text-sm">
              Total comissão pendente:{" "}
              {formatBRL(
                pendentes.reduce(
                  (s, o) => s + parseFloat(o.valorComissao),
                  0,
                ),
              )}
            </p>
          </div>
          <Link
            href="/admin/operacoes?status=aguardando_aprovacao"
            className="btn-primary !h-10 !px-4 shrink-0"
          >
            Analisar agora <span className="arrow">→</span>
          </Link>
        </div>
      )}

      {/* Operações recentes */}
      <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold tracking-tight">Operações recentes</h2>
          <Link
            href="/admin/operacoes"
            className="text-sm text-fg-muted hover:text-accent transition-colors"
          >
            Ver todas →
          </Link>
        </div>
        {recentes.length === 0 ? (
          <div className="px-6 py-12 text-center text-fg-muted">
            Nenhuma operação cadastrada ainda.
          </div>
        ) : (
          <ul>
            {recentes.map((op) => (
              <li key={op.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/operacoes/${op.id}`}
                  className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors group items-center"
                >
                  <div className="col-span-2 font-mono text-sm text-fg">
                    {op.numero}
                  </div>
                  <div className="hidden md:block col-span-3 text-sm text-fg truncate">
                    {op.corretorNome ?? "—"}
                    <div className="font-mono text-[10px] text-fg-dim">
                      {op.corretorEmail}
                    </div>
                  </div>
                  <div className="hidden md:block col-span-3 text-sm text-fg-muted truncate">
                    {op.construtoraNome ?? "—"}
                  </div>
                  <div className="col-span-5 md:col-span-2 text-right font-mono tabular text-sm text-fg font-semibold">
                    {formatBRL(parseFloat(op.valorPresente))}
                  </div>
                  <div className="col-span-3 md:col-span-2 flex justify-end">
                    <OperacaoStatusBadge status={op.status} />
                  </div>
                  <div className="hidden md:block col-span-1 text-right text-fg-dim group-hover:text-accent group-hover:translate-x-1 transition-all">
                    →
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  tone = "default",
  highlight = false,
  href,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "warn" | "danger";
  highlight?: boolean;
  href?: string;
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "danger"
        ? "border-danger/40 bg-red-50"
        : "border-border bg-bg-elev";
  const labelColor = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : tone === "danger"
        ? "text-danger"
        : "text-fg-dim";

  const content = (
    <div className={`rounded-2xl border p-4 md:p-5 ${baseClass} h-full transition-colors ${href ? "hover:border-accent cursor-pointer" : ""}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${labelColor}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-base sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-fg leading-tight break-words">
        {value}
      </div>
      {sublabel && <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sublabel}</div>}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
