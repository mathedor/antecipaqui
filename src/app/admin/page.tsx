import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { AdminCharts } from "@/components/dashboard-charts";
import { ActionCenter } from "@/components/dashboards/action-center";
import { PipelineFunnel } from "@/components/dashboards/pipeline";
import { SourcingBoard } from "@/components/dashboards/sourcing-board";
import { formatBRL, formatBRLcompact } from "@/lib/format";
import {
  getAdminMonthlyStats,
  getAdminStats,
  getAllOperacoes,
} from "@/lib/actions/admin";
import { getFinanceiroMetrics } from "@/lib/actions/financeiro-metrics";
import { getAdminInsights } from "@/lib/actions/admin-insights";
import {
  getAdminActionCenter,
  getAdminPipeline,
  getAdminSourcing,
} from "@/lib/actions/dashboards";

export const metadata = {
  title: "Admin · Dashboard",
};

export default async function AdminPage() {
  const admin = await requireAdmin();
  const [
    stats,
    recent,
    monthly,
    fin,
    insights,
    actionCenter,
    pipeline,
    sourcing,
  ] = await Promise.all([
    getAdminStats(),
    getAllOperacoes(),
    getAdminMonthlyStats(),
    getFinanceiroMetrics(),
    getAdminInsights(),
    getAdminActionCenter(),
    getAdminPipeline(),
    getAdminSourcing(8),
  ]);

  const recentes = recent.slice(0, 6);

  return (
    <AdminShell active="/admin" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">painel administrativo</div>
        <h1 className="text-display-md">
          Operação <span className="text-gradient-blue">geral</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          O que precisa de você agora, status do pipeline e direcionamento de
          operações pra fundos.
        </p>
      </div>

      {/* 1. ACTION CENTER — o que resolver agora */}
      <ActionCenter
        items={actionCenter}
        title="Pendências urgentes"
        subtitle="Ordenado por severidade. Clique pra abrir cada lista."
      />

      {/* 2. PIPELINE — onde estão as ops */}
      <PipelineFunnel stages={pipeline} />

      {/* 3. SOURCING — direcionamento de ops pra fundos */}
      <SourcingBoard ops={sourcing} />

      {/* 4. KPIs financeiros core */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="VP comprado"
          value={formatBRLcompact(stats.valorComissaoTotal)}
          sublabel="todas as operações"
          href="/admin/relatorios/indices"
        />
        <StatCard
          label="Já antecipado"
          value={formatBRLcompact(stats.valorAntecipado)}
          sublabel="creditado a corretores"
          highlight
          href="/admin/relatorios/indices"
        />
        <StatCard
          label="A vencer"
          value={formatBRLcompact(stats.aVencer)}
          sublabel="parcelas pendentes"
          href="/admin/relatorios/daily"
        />
        <StatCard
          label="Vencidas"
          value={formatBRLcompact(stats.vencidas)}
          sublabel="inadimplência"
          tone={stats.vencidas > 0 ? "danger" : "default"}
          href="/admin/relatorios/inadimplentes"
        />
      </div>

      {/* 5. Saúde do funil (insights) */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <InsightCard
          label="Tempo médio aprovação"
          value={
            insights.tempoMedioAprovacaoH != null
              ? `${insights.tempoMedioAprovacaoH.toFixed(1)}h`
              : "—"
          }
          sub="últimos 90 dias"
        />
        <InsightCard
          label="Auto-aprovação fundo"
          value={
            insights.pctAprovacaoAutomatica != null
              ? `${(insights.pctAprovacaoAutomatica * 100).toFixed(0)}%`
              : "—"
          }
          sub="via regras dos fundos"
        />
        <InsightCard
          label="Docs IA: alta confiança"
          value={
            insights.pctDocsOk != null
              ? `${(insights.pctDocsOk * 100).toFixed(0)}%`
              : "—"
          }
          sub={
            insights.qtdDocsRevisao > 0
              ? `${insights.qtdDocsRevisao} pra revisar`
              : "todos validados"
          }
          tone={insights.qtdDocsRevisao > 0 ? "warn" : "default"}
        />
        <InsightCard
          label="Spread efetivo médio"
          value={
            insights.spreadMedio != null
              ? `${(insights.spreadMedio * 100).toFixed(0)}%`
              : "—"
          }
          sub="resultado AQ / juros"
        />
      </section>

      {/* 6. Margem efetiva + Forecast (faz parte da "saúde financeira") */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
                margem efetiva · 90 dias
              </div>
              <h3 className="text-lg font-bold tracking-tight">
                Spread como % do juros gerado
              </h3>
            </div>
            <span
              className={`font-mono tabular text-3xl font-bold ${
                fin.margemEfetiva >= 0.5
                  ? "text-success"
                  : fin.margemEfetiva >= 0.25
                    ? "text-fg"
                    : "text-warn"
              }`}
            >
              {(fin.margemEfetiva * 100).toFixed(1).replace(".", ",")}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-fg-dim font-mono uppercase tracking-wider text-[9px]">
                Juros gerado
              </div>
              <div className="font-mono tabular text-fg font-semibold">
                {formatBRL(fin.jurosUltimos90d)}
              </div>
            </div>
            <div>
              <div className="text-fg-dim font-mono uppercase tracking-wider text-[9px]">
                Virou spread
              </div>
              <div className="font-mono tabular text-fg font-semibold">
                {formatBRL(fin.spreadUltimos90d)}
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-fg-muted leading-relaxed">
            Quanto da taxa cobrada vira margem real pra AQ (após custo do
            dinheiro do fundo). Caindo = fundos cobrando mais caro.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="mb-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
              forecast · próximos 6 meses
            </div>
            <h3 className="text-lg font-bold tracking-tight">
              Receita esperada de repasses
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Resultado AQ × % a vencer das parcelas
            </p>
          </div>
          <div className="space-y-1.5">
            {fin.forecast.map((m) => {
              const max = Math.max(...fin.forecast.map((x) => x.valor), 1);
              const pct = (m.valor / max) * 100;
              return (
                <div key={m.ym} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim w-12 shrink-0">
                    {m.label}
                  </span>
                  <div className="flex-1 h-5 bg-bg-card rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono tabular text-xs text-fg font-semibold w-24 text-right shrink-0">
                    {formatBRL(m.valor)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              Total 6m
            </span>
            <span className="font-mono tabular text-base font-bold text-success">
              {formatBRL(fin.forecast.reduce((s, m) => s + m.valor, 0))}
            </span>
          </div>
        </div>
      </section>

      {/* 7. Histórico — gráfico 12m */}
      <section className="mb-8">
        <div className="mb-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            série histórica · 12 meses
          </div>
        </div>
        <AdminCharts data={monthly} />
      </section>

      {/* 8. Operações recentes */}
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
    <div
      className={`rounded-2xl border p-4 md:p-5 ${baseClass} h-full transition-colors ${href ? "hover:border-accent cursor-pointer" : ""}`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${labelColor}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight text-fg leading-tight break-words">
        {value}
      </div>
      {sublabel && (
        <div className="text-[10px] md:text-xs text-fg-muted mt-1">
          {sublabel}
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function InsightCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn";
}) {
  const cls =
    tone === "warn" ? "border-warn/40 bg-yellow-50" : "border-border bg-bg-elev";
  const labelCls = tone === "warn" ? "text-warn" : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${cls}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${labelCls}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-2xl font-bold tracking-tight text-fg">
        {value}
      </div>
      {sub && <div className="text-[10px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
