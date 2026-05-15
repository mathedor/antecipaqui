import Link from "next/link";
import { PainelShell } from "@/components/painel-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { CalendarList } from "@/components/dashboards/calendar-list";
import { getFundoDashboard } from "@/lib/actions/fundos";
import { getFundoRisco } from "@/lib/actions/fundo-risco";
import { getOpsAguardandoFundo } from "@/lib/actions/fundo-mesa";
import { getFundoBenchmark } from "@/lib/actions/fundo-benchmark";
import {
  getFundoCalendario,
  getFundoCapacidade,
  getFundoMesaMetrics,
} from "@/lib/actions/dashboards";
import { formatBRL, formatBRLcompact } from "@/lib/format";
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

  const [capacidade, mesa, calendario] = await Promise.all([
    getFundoCapacidade(fundo.id),
    getFundoMesaMetrics(fundo.id),
    getFundoCalendario(fundo.id, 30),
  ]);

  const ultimas = operacoes.slice(0, 6);
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
          Olá,{" "}
          <span className="text-gradient-blue">
            {fundo.nomeFantasia ?? fundo.razaoSocial}
          </span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Mesa de decisão, capacidade alocada e calendário de recebíveis.
        </p>
      </div>

      {/* === 1. MESA DE DECISÃO — sempre prioridade #1 do fundo === */}
      {mesa.pendentesQtd > 0 ? (
        <section className="rounded-2xl border-2 border-accent bg-accent-soft p-5 md:p-6 mb-6">
          <div className="flex items-start gap-4 flex-wrap">
            <span className="size-12 rounded-full bg-accent text-white flex items-center justify-center text-2xl shrink-0">
              🎯
            </span>
            <div className="flex-1 min-w-[16rem]">
              <h2 className="font-bold text-accent text-xl">
                {mesa.pendentesQtd} operação(ões) aguardando sua aprovação
              </h2>
              <p className="text-sm text-fg mt-1">
                {formatBRLcompact(mesa.pendentesValor)} em volume.{" "}
                {mesa.pendentesMais3d > 0 && (
                  <span className="text-warn font-semibold">
                    {mesa.pendentesMais3d} esperando há mais de 3 dias.
                  </span>
                )}
              </p>
              {(mesa.tmdHoras != null || mesa.pctAprovacao90d != null) && (
                <p className="text-xs text-fg-muted mt-1">
                  TMD 90d:{" "}
                  {mesa.tmdHoras != null
                    ? `${mesa.tmdHoras.toFixed(1)}h`
                    : "—"}{" "}
                  · aprovação 90d:{" "}
                  {mesa.pctAprovacao90d != null
                    ? `${(mesa.pctAprovacao90d * 100).toFixed(0)}%`
                    : "—"}
                </p>
              )}
            </div>
            <Link
              href="/painel/aprovar"
              className="btn-primary !h-11 !px-5 shrink-0"
            >
              Decidir agora →
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-success/30 bg-green-50 p-5 mb-6 flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <div>
            <h2 className="font-bold text-success">Mesa vazia</h2>
            <p className="text-sm text-fg-muted">
              Sem operações pendentes da sua decisão.{" "}
              {mesa.tmdHoras != null && mesa.pctAprovacao90d != null && (
                <>
                  TMD 90d: {mesa.tmdHoras.toFixed(1)}h · aprovação:{" "}
                  {(mesa.pctAprovacao90d * 100).toFixed(0)}%
                </>
              )}
            </p>
          </div>
        </section>
      )}

      {/* === 2. CAPACIDADE & CARTEIRA === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat
          label="Comprometido (ativo)"
          value={formatBRLcompact(capacidade.comprometido)}
          sub={`taxa média ${(capacidade.taxaMediaAtiva * 100).toFixed(2).replace(".", ",")}% am`}
          highlight
        />
        <Stat
          label="A receber 30d"
          value={formatBRLcompact(capacidade.recebivel30d)}
          sub={`60d: ${formatBRLcompact(capacidade.recebivel60d)} · 90d: ${formatBRLcompact(capacidade.recebivel90d)}`}
        />
        <Stat
          label="Faturado este mês"
          value={formatBRLcompact(capacidade.faturadoMes)}
          sub="parcelas pagas"
          tone="success"
        />
        <Stat
          label="Vencidas"
          value={formatBRL(totals.valorVencido)}
          sub="inadimplência aberta"
          tone={totals.valorVencido > 0 ? "warn" : "default"}
        />
      </div>

      {/* === 3. PORTFOLIO STATS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Lucro acumulado"
          value={formatBRLcompact(totals.lucroAcumulado)}
          sub="custo do dinheiro + 50% spread"
        />
        <Stat
          label="Ops ativas"
          value={String(totals.qtdOperacoes)}
          sub={`ticket médio ${formatBRLcompact(capacidade.ticketMedio)}`}
        />
        <Stat
          label="Construtoras"
          value={String(construtoras.length)}
          sub={`${imobiliarias.length} imobiliárias`}
        />
        <Stat
          label="Recebíveis totais"
          value={formatBRLcompact(capacidade.recebivelTotal)}
          sub="todas as parcelas em aberto"
        />
      </div>

      {/* === 4. ALERTAS DE RISCO === */}
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
                .map((a) => `${a.nome} (${(a.pct * 100).toFixed(0)}%)`)
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
            Ver risco →
          </Link>
        </div>
      )}

      {/* === 5. BENCHMARK vs CDI === */}
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

      {/* === 6. CALENDÁRIO + RECENTES === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CalendarList
          items={calendario}
          title="próximos recebíveis · 30 dias"
          emptyText="Sem parcelas a receber nos próximos 30 dias."
          href="/painel/recebimentos"
          hrefLabel="ver calendário completo"
        />

        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-bold tracking-tight">Operações recentes</h2>
            <Link
              href="/painel/operacoes"
              className="text-accent text-xs font-semibold hover:underline"
            >
              ver todas →
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
      </div>

      {/* === 7. Top construtoras + atalho extrato === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            top construtoras na sua carteira
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

        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 flex flex-col gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
            atalhos · contábil & relatórios
          </div>
          <a
            href={`/api/painel/extrato-contabil?ano=${new Date().getFullYear()}&mes=${String(new Date().getMonth() + 1).padStart(2, "0")}`}
            className="inline-flex items-center justify-between gap-2 h-11 px-4 rounded-lg border border-border bg-bg text-fg text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            <span>Extrato contábil (mês atual)</span>
            <span>📊</span>
          </a>
          <Link
            href="/painel/forecast"
            className="inline-flex items-center justify-between gap-2 h-11 px-4 rounded-lg border border-border bg-bg text-fg text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            <span>Forecast detalhado</span>
            <span>→</span>
          </Link>
          <Link
            href="/painel/relatorio"
            className="inline-flex items-center justify-between gap-2 h-11 px-4 rounded-lg border border-border bg-bg text-fg text-sm font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            <span>Relatório da carteira</span>
            <span>→</span>
          </Link>
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
        : tone === "danger"
          ? "border-danger/40 bg-red-50"
          : "border-border bg-bg-elev";
  const labelColor = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
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
      {sub && (
        <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>
      )}
    </div>
  );
}
