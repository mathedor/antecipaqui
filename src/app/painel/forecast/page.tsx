import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getFundoCaixa } from "@/lib/actions/fundo-caixa";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Forecast · Painel do fundo" };
export const dynamic = "force-dynamic";

export default async function FundoForecastPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "fundo") redirect("/painel");

  const data = await getFundoCaixa();
  if (!data) {
    return (
      <PainelShell role="fundo" userName={user.nome} active="/painel/forecast">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Fundo não vinculado
          </h1>
        </div>
      </PainelShell>
    );
  }

  const max = Math.max(...data.meses.map((m) => m.bruto), 1);

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/forecast">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo · forecast</div>
        <h1 className="text-display-md">
          Fluxo de <span className="text-gradient-blue">caixa</span> 6 meses
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Projeção de recebimentos baseada nas parcelas a vencer das operações
          ativas. <strong>Bruto</strong> = total que a construtora paga.{" "}
          <strong>Sua parte</strong> = custo do dinheiro + 50% do spread.{" "}
          <strong>Parte AQ</strong> = custos + 50% do spread (vai pra
          Antecipaqui via fatura).
        </p>
      </div>

      {/* KPIs topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Recebido este mês"
          value={formatBRL(data.recebidoMesAtual)}
          tone="success"
        />
        <KpiCard
          label="Bruto a receber 6m"
          value={formatBRL(data.totalBruto)}
          highlight
        />
        <KpiCard
          label="Sua parte 6m"
          value={formatBRL(data.totalParteFundo)}
          tone="success"
        />
        <KpiCard
          label="Repassar à AQ 6m"
          value={formatBRL(data.totalParteAQ)}
        />
      </div>

      {/* Forecast detalhado */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <h2 className="text-lg font-bold tracking-tight mb-1">
          Recebimentos por mês
        </h2>
        <p className="text-xs text-fg-muted mb-5">
          Considera parcelas com status &quot;a vencer&quot; ou &quot;vencida&quot; de operações
          em pagamento ou realizadas.
        </p>

        <div className="space-y-3">
          {data.meses.map((m, i) => {
            const pct = (m.bruto / max) * 100;
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
                    {m.vencidasNoMes > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold bg-red-50 text-danger border border-danger/30">
                        {m.vencidasNoMes} vencida
                        {m.vencidasNoMes === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-mono tabular text-base font-bold text-fg">
                      {formatBRL(m.bruto)}
                    </div>
                    <div className="text-[10px] text-fg-muted">
                      {m.qtdParcelas} parcela
                      {m.qtdParcelas === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>
                <div className="h-2 bg-bg-card rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex-1">
                    <span className="text-fg-dim">Sua parte: </span>
                    <span className="font-mono tabular text-success font-semibold">
                      {formatBRL(m.parteFundo)}
                    </span>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-fg-dim">Repassar AQ: </span>
                    <span className="font-mono tabular text-fg">
                      {formatBRL(m.parteAQ)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-fg-muted">
        <Link href="/painel" className="text-accent hover:underline">
          ← voltar ao painel
        </Link>
        {" · "}
        <Link href="/painel/faturas" className="text-accent hover:underline">
          ver faturas a pagar →
        </Link>
      </p>
    </PainelShell>
  );
}

function KpiCard({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
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
    </div>
  );
}
