import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getCorretorFinanceiro } from "@/lib/actions/corretor-financeiro";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Forecast pessoal · Painel" };
export const dynamic = "force-dynamic";

export default async function CorretorForecastPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "corretor" && user.role !== "imobiliaria")
    redirect("/painel");

  const data = await getCorretorFinanceiro();
  if (!data) {
    return (
      <PainelShell role="corretor" userName={user.nome} active="/painel/forecast-corretor">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Sem dados disponíveis
          </h1>
        </div>
      </PainelShell>
    );
  }

  const max = Math.max(...data.forecast.map((m) => m.valorAVencer), 1);

  return (
    <PainelShell role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"} userName={user.nome} active="/painel/forecast-corretor">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel · forecast pessoal</div>
        <h1 className="text-display-md">
          Sua <span className="text-gradient-blue">grana</span> nos próximos meses
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Visão do que entra/saiu: parcelas a vencer das suas operações + o
          que já recebeu via antecipação esse ano + quanto pagou em juros pra
          adiantar.
        </p>
      </div>

      {/* KPIs topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="A receber 6 meses"
          value={formatBRL(data.totalForecast)}
          sub={`${data.forecast.reduce((s, m) => s + m.qtdParcelas, 0)} parcelas`}
          highlight
        />
        <KpiCard
          label="Total a receber"
          value={formatBRL(data.totalAReceber)}
          sub="todas as parcelas pendentes"
        />
        <KpiCard
          label="Já antecipado este ano"
          value={formatBRL(data.totalAntecipadoYTD)}
          tone="success"
        />
        <KpiCard
          label="Custo da antecipação"
          value={formatBRL(data.custoTotalAntecipacaoYTD)}
          sub={`média ${(data.custoMedioPct * 100).toFixed(1).replace(".", ",")}% da comissão`}
          tone="warn"
        />
      </div>

      {/* Forecast detalhado */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <h2 className="text-lg font-bold tracking-tight mb-1">
          Recebimentos por mês
        </h2>
        <p className="text-xs text-fg-muted mb-5">
          Soma das parcelas de comissão a vencer das operações que você
          tem ativas (pagas pela construtora ao fundo, no fluxo de
          antecipação ativa).
        </p>

        <div className="space-y-3">
          {data.forecast.map((m, i) => {
            const pct = (m.valorAVencer / max) * 100;
            const isCurrent = i === 0;
            return (
              <div
                key={m.ym}
                className={`rounded-xl border p-4 ${
                  isCurrent
                    ? "border-accent/40 bg-accent-soft"
                    : "border-border bg-bg"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-fg-dim font-semibold w-14">
                      {m.label}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold bg-accent text-white">
                        atual
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular text-base font-bold text-fg">
                      {formatBRL(m.valorAVencer)}
                    </div>
                    <div className="text-[10px] text-fg-muted">
                      {m.qtdParcelas} parcela
                      {m.qtdParcelas === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-bg-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <h3 className="font-bold mb-2">Quer antecipar mais?</h3>
        <p className="text-sm text-fg-muted mb-3">
          Cadastre uma nova operação ou veja como funciona a antecipação.
        </p>
        <Link
          href="/painel/operacoes/nova"
          className="btn-primary !h-11 !px-5 inline-flex items-center gap-2"
        >
          + Nova operação
        </Link>
      </div>
    </PainelShell>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  tone?: "default" | "success" | "warn";
}) {
  const cls = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "success"
        ? "border-success/40 bg-green-50"
        : "border-border bg-bg-elev";
  const labelCls = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${cls}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${labelCls}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-xl md:text-2xl font-bold tracking-tight text-fg">
        {value}
      </div>
      {sub && <div className="text-[10px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
