import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getFundoCaixa } from "@/lib/actions/fundo-caixa";
import { getConstrutoraByOwnerId } from "@/lib/actions/operacoes";
import { db } from "@/db";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Forecast" };
export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role === "construtora") return <ConstrutoraForecast user={user} />;
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

/* ============================================================
   FORECAST DA CONSTRUTORA — quanto ela vai pagar nos próximos 12m
   ============================================================ */

function fmtMonth(monthStr: string) {
  const [y, m] = monthStr.split("-").map((s) => parseInt(s, 10));
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

async function ConstrutoraForecast({ user }: { user: { id: string; nome: string | null } }) {
  const construtora = await getConstrutoraByOwnerId(user.id);
  if (!construtora) redirect("/painel/onboarding");

  const result = await db.execute(sql`
    SELECT
      to_char(p.vencimento, 'YYYY-MM') AS mes,
      COUNT(*)::int AS qtd_parcelas,
      COALESCE(SUM(p.valor)::float, 0) AS total,
      COUNT(DISTINCT o.id)::int AS qtd_ops
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.construtora_id = ${construtora.id}::uuid
      AND p.status = 'a_vencer'
      AND p.vencimento >= date_trunc('month', CURRENT_DATE)
      AND p.vencimento <= CURRENT_DATE + INTERVAL '12 months'
    GROUP BY to_char(p.vencimento, 'YYYY-MM')
    ORDER BY mes ASC
  `);

  const rows = (result as unknown as {
    rows: { mes: string; qtd_parcelas: number; total: number; qtd_ops: number }[];
  }).rows ?? [];

  const total12m = rows.reduce((s, r) => s + r.total, 0);
  const maxMes = rows.reduce((max, r) => (r.total > max ? r.total : max), 0);
  const pesados = rows.filter((r) => maxMes > 0 && r.total / maxMes >= 0.8);

  const proximos30 = await db.execute(sql`
    SELECT COALESCE(SUM(p.valor)::float, 0) AS total, COUNT(*)::int AS qtd
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.construtora_id = ${construtora.id}::uuid
      AND p.status = 'a_vencer'
      AND p.vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  `);
  const next30 = (proximos30 as unknown as {
    rows: { total: number; qtd: number }[];
  }).rows[0] ?? { total: 0, qtd: 0 };

  return (
    <PainelShell role="construtora" userName={user.nome} active="/painel/forecast">
      <div className="mb-8">
        <div className="eyebrow mb-2">painel · construtora</div>
        <h1 className="text-display-md">
          Projeção de <span className="text-gradient-blue">pagamento</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Quanto sua construtora deve pagar à Antecipaqui nos próximos 12
          meses. Use pra planejar caixa.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <KpiCard
          label="Próximos 30 dias"
          value={formatBRL(next30.total)}
          tone={next30.total > 0 ? "warn" : "default"}
        />
        <KpiCard label="Total 12 meses" value={formatBRL(total12m)} highlight />
        <KpiCard
          label="Pico mensal"
          value={formatBRL(maxMes)}
          tone={maxMes > 0 ? "warn" : "default"}
        />
      </div>

      {pesados.length > 0 && (
        <div className="rounded-2xl border border-warn/40 bg-yellow-50 p-5 mb-8 flex items-start gap-3">
          <span className="text-2xl">⚠</span>
          <div>
            <h3 className="font-bold text-warn">Meses pesados detectados</h3>
            <p className="text-sm text-fg-muted mt-1">
              {pesados.map((p) => fmtMonth(p.mes)).join(", ")} têm
              concentração alta de parcelas. Planeje caixa com antecedência ou
              negocie escalonamento via chat.
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-5xl mb-3">📭</div>
          <h2 className="text-xl font-bold">Nada a pagar nos próximos 12m</h2>
          <p className="mt-2 text-fg-muted">
            Não há parcelas a vencer pra sua construtora na janela analisada.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-bold">Distribuição mês a mês</h2>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const pct = maxMes > 0 ? (r.total / maxMes) * 100 : 0;
              return (
                <li
                  key={r.mes}
                  className="grid grid-cols-12 gap-3 px-6 py-3 items-center"
                >
                  <div className="col-span-2 font-mono text-sm text-fg uppercase">
                    {fmtMonth(r.mes)}
                  </div>
                  <div className="col-span-7">
                    <div className="h-2 rounded-full bg-bg-card overflow-hidden">
                      <div
                        className={`h-full ${
                          pct >= 80 ? "bg-warn" : "bg-accent"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <div className="font-mono tabular text-sm text-fg font-bold">
                      {formatBRL(r.total)}
                    </div>
                    <div className="text-[10px] font-mono text-fg-dim">
                      {r.qtd_parcelas} parcela(s) · {r.qtd_ops} op(s)
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-8 flex gap-3 flex-wrap">
        <Link href="/painel/duplicatas" className="btn-primary !h-11 !px-5">
          Ver duplicatas
        </Link>
        <Link
          href="/painel/risco"
          className="h-11 px-5 rounded-xl border border-border-strong text-fg font-semibold hover:border-accent transition-colors inline-flex items-center"
        >
          Análise de risco
        </Link>
      </div>
    </PainelShell>
  );
}
