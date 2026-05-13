import Link from "next/link";
import { PainelShell } from "@/components/painel-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { getFundoDashboard } from "@/lib/actions/fundos";
import { getFundoRisco } from "@/lib/actions/fundo-risco";
import { getOpsAguardandoFundo } from "@/lib/actions/fundo-mesa";
import { getFundoBenchmark } from "@/lib/actions/fundo-benchmark";
import { formatBRL } from "@/lib/format";
import type { User } from "@/db/schema";

export async function FundoDashboard({ user }: { user: User }) {
  const [data, risco, pendentes, benchmark] = await Promise.all([
    getFundoDashboard(),
    getFundoRisco(),
    getOpsAguardandoFundo(),
    getFundoBenchmark(),
  ]);

  if (!data) {
    return (
      <PainelShell role="fundo" userName={user.nome} active="/painel">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Fundo não vinculado
          </h1>
          <p className="text-fg-muted">
            Sua conta ainda não está vinculada a nenhum fundo. Avise o admin
            pra completar a configuração.
          </p>
        </div>
      </PainelShell>
    );
  }

  const { fundo, operacoes, totals, construtoras, imobiliarias } = data;
  const ultimas = operacoes.slice(0, 8);
  const alertasConcentracao = risco
    ? [...risco.porConstrutora, ...risco.porImobiliaria].filter(
        (c) => c.status !== "ok",
      )
    : [];

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo</div>
        <h1 className="text-display-md">
          Olá, <span className="text-gradient-blue">{fundo.nomeFantasia ?? fundo.razaoSocial}</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Suas operações, construtoras parceiras e fluxo financeiro.
        </p>
      </div>

      {/* KPIs financeiros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="A vencer"
          value={formatBRL(totals.valorAVencer)}
          sub="parcelas pendentes"
          highlight
        />
        <Stat
          label="Vencidas"
          value={formatBRL(totals.valorVencido)}
          sub="atenção necessária"
          tone="warn"
        />
        <Stat
          label="Faturado no mês"
          value={formatBRL(totals.faturadoNoMes)}
          sub="parcelas pagas neste mês"
          tone="success"
        />
        <Stat
          label="Lucro do fundo"
          value={formatBRL(totals.lucroAcumulado)}
          sub="custo do dinheiro + 50% do spread"
        />
      </div>

      {/* KPIs gerais */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <Stat
          label="Operações"
          value={String(totals.qtdOperacoes)}
          sub={`${operacoes.length} no total`}
        />
        <Stat
          label="Construtoras"
          value={String(construtoras.length)}
          sub="distintas operadas"
        />
        <Stat
          label="Imobiliárias"
          value={String(imobiliarias.length)}
          sub="distintas operadas"
        />
      </div>

      {/* Ops aguardando decisão */}
      {pendentes && pendentes.length > 0 && (
        <div className="rounded-2xl border border-accent/40 bg-accent-soft p-5 mb-6 flex items-start gap-4">
          <span className="size-9 rounded-full bg-accent text-white flex items-center justify-center text-xl shrink-0">
            🎯
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-accent">
              {pendentes.length} operaç
              {pendentes.length === 1 ? "ão aguardando" : "ões aguardando"}{" "}
              sua aprovação
            </h2>
            <p className="mt-1 text-fg-muted text-sm">
              Mesa de decisão com score da construtora, badges de IA e
              detalhamento financeiro consolidado.
            </p>
          </div>
          <Link
            href="/painel/aprovar"
            className="btn-primary !h-10 !px-4 shrink-0"
          >
            Decidir agora →
          </Link>
        </div>
      )}

      {/* Alertas de concentração */}
      {alertasConcentracao.length > 0 && (
        <div className="rounded-2xl border border-warn/40 bg-yellow-50 p-5 mb-6 flex items-start gap-4">
          <span className="size-9 rounded-full bg-warn/20 text-warn flex items-center justify-center text-xl shrink-0">
            ⚠
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-warn">
              {alertasConcentracao.length} alerta
              {alertasConcentracao.length === 1 ? "" : "s"} de concentração
            </h2>
            <p className="mt-1 text-fg-muted text-sm">
              {alertasConcentracao
                .slice(0, 3)
                .map(
                  (a) =>
                    `${a.nome} (${(a.pct * 100).toFixed(0)}%)`,
                )
                .join(", ")}
              {alertasConcentracao.length > 3 &&
                ` e mais ${alertasConcentracao.length - 3}`}
              .
            </p>
          </div>
          <Link
            href="/painel/risco"
            className="btn-primary !h-10 !px-4 shrink-0 !bg-warn hover:!bg-warn/90"
          >
            Ver análise de risco →
          </Link>
        </div>
      )}

      {/* Benchmark vs CDI */}
      {benchmark && benchmark.parcelasPagas > 0 && (
        <div
          className={`rounded-2xl border p-5 md:p-6 mb-6 ${
            benchmark.spreadPp >= 0
              ? "border-success/40 bg-green-50"
              : "border-warn/40 bg-yellow-50"
          }`}
        >
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
                rentabilidade · últimos 90 dias
              </div>
              <h2 className="text-lg font-bold tracking-tight">
                {benchmark.spreadPp >= 0
                  ? "Você está batendo o CDI"
                  : "Você está abaixo do CDI"}
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {benchmark.parcelasPagas} parcela
                {benchmark.parcelasPagas === 1 ? "" : "s"} paga
                {benchmark.parcelasPagas === 1 ? "" : "s"} · prazo médio{" "}
                {benchmark.prazoMedio.toFixed(1)}m
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-baseline gap-4">
                <div>
                  <div className="font-mono text-[10px] text-fg-dim">
                    Sua taxa
                  </div>
                  <div
                    className={`font-mono tabular text-2xl font-bold ${
                      benchmark.spreadPp >= 0 ? "text-success" : "text-warn"
                    }`}
                  >
                    {(benchmark.rentabilidadeAoMes * 100)
                      .toFixed(2)
                      .replace(".", ",")}
                    %
                    <span className="text-xs text-fg-muted font-normal ml-0.5">
                      a.m.
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-fg-dim">CDI</div>
                  <div className="font-mono tabular text-2xl font-bold text-fg-muted">
                    {(benchmark.cdiAoMes * 100).toFixed(2).replace(".", ",")}%
                    <span className="text-xs text-fg-muted font-normal ml-0.5">
                      a.m.
                    </span>
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-fg-dim">
                    Spread
                  </div>
                  <div
                    className={`font-mono tabular text-2xl font-bold ${
                      benchmark.spreadPp >= 0 ? "text-success" : "text-warn"
                    }`}
                  >
                    {benchmark.spreadPp >= 0 ? "+" : ""}
                    {(benchmark.spreadPp * 100).toFixed(2).replace(".", ",")}
                    pp
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão extrato contábil */}
      <div className="mb-6 flex justify-end">
        <a
          href={`/api/painel/extrato-contabil?ano=${new Date().getFullYear()}&mes=${String(new Date().getMonth() + 1).padStart(2, "0")}`}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border bg-bg-elev text-fg text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
          title="Baixa CSV com decomposição contábil das parcelas pagas no mês atual"
        >
          📊 Extrato contábil (mês atual)
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Últimas operações */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-bold tracking-tight">Operações recentes</h2>
            <Link
              href="/painel/operacoes"
              className="text-accent text-xs font-semibold hover:underline"
            >
              Ver todas →
            </Link>
          </div>
          {ultimas.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-8">
              Nenhuma operação ainda.
            </p>
          ) : (
            <ul className="space-y-2">
              {ultimas.map((op) => (
                <li
                  key={op.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-border bg-bg hover:border-accent transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/painel/operacoes/${op.id}`}
                      className="font-mono text-sm font-semibold text-fg hover:text-accent"
                    >
                      {op.numero}
                    </Link>
                    <div className="text-[11px] text-fg-muted truncate">
                      {op.construtoraNome ?? "—"} · {op.corretorNome ?? "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono tabular text-sm text-fg font-semibold">
                      {formatBRL(parseFloat(op.valorPresente))}
                    </div>
                    <OperacaoStatusBadge status={op.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Top construtoras */}
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            top construtoras
          </div>
          {construtoras.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">
              Nenhuma ainda.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {construtoras.slice(0, 8).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-bg border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-fg font-semibold truncate">
                      {c.nome}
                    </div>
                    <div className="text-[10px] text-fg-muted">
                      {c.qtd} {c.qtd === 1 ? "operação" : "operações"}
                    </div>
                  </div>
                  <span className="font-mono tabular text-xs text-fg-muted shrink-0">
                    {formatBRL(c.valorOperado)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warn" | "danger";
  highlight?: boolean;
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "success"
        ? "border-success/40 bg-green-50"
        : "border-border bg-bg-elev";
  const labelColor = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${baseClass}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${labelColor}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight text-fg leading-tight break-words">
        {value}
      </div>
      {sub && <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
