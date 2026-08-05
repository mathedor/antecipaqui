import Link from "next/link";
import { PainelShell } from "@/components/painel-shell";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { ComercialChartsClient } from "@/components/comercial-charts-client";
import { CalendarList } from "@/components/dashboards/calendar-list";
import {
  FocoDoDia,
  MetaProgress,
  CarteiraViva,
  ProjecoesCenarios,
} from "@/components/dashboards/comercial-blocos";
import {
  getCurrentComercial,
  getComercialDashboard,
} from "@/lib/actions/comerciais";
import {
  getComercialCalendario,
  getComercialFunil,
  getComercialRanking,
} from "@/lib/actions/dashboards";
import {
  getComercialCarteira,
  getComercialFocoDoDia,
  getComercialMeta,
  getComercialProjecoes,
} from "@/lib/actions/comercial-acoes";
import { getComercialConquistas } from "@/lib/actions/comercial-conquistas";
import { ConquistasGrid } from "@/components/dashboards/comercial-conquistas";
import { formatBRL, formatBRLcompact } from "@/lib/format";
import type { User } from "@/db/schema";
import { CiceroSugereCard } from "@/components/cicero-sugere-card";

export async function ComercialDashboard({ user }: { user: User }) {
  const comercial = await getCurrentComercial();
  if (!comercial) {
    return (
      <PainelShell role="comercial" userName={user.nome} active="/painel">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Comercial não vinculado
          </h1>
          <p className="text-fg-muted">
            Sua conta ainda não está vinculada a nenhum cadastro comercial.
            Avise o admin pra completar a configuração.
          </p>
        </div>
      </PainelShell>
    );
  }

  const [
    data,
    calendarioRaw,
    funil,
    ranking,
    foco,
    meta,
    carteira,
    proj,
    conquistasData,
  ] = await Promise.all([
    getComercialDashboard(comercial.id),
    getComercialCalendario(comercial.id, 90),
    getComercialFunil(comercial.id),
    getComercialRanking(comercial.id),
    getComercialFocoDoDia(comercial.id),
    getComercialMeta(comercial.id),
    getComercialCarteira(comercial.id),
    getComercialProjecoes(comercial.id),
    getComercialConquistas(comercial.id),
  ]);

  const ultimas = data.operacoes.slice(0, 6);

  const calendario = calendarioRaw.map((c) => ({
    data: c.data.slice(0, 10),
    valor: c.valor,
    qtd: c.operacoes.length,
    contrapartes: c.operacoes,
    tone: "vencer" as const,
  }));

  const minhaPos = ranking.find((r) => r.isYou);
  const top = ranking.slice(0, 5);

  return (
    <PainelShell role="comercial" userName={user.nome} active="/painel">
      <CiceroSugereCard />
      <div className="mb-6">
        <div className="eyebrow mb-2">painel comercial</div>
        <h1 className="text-display-md">
          Olá,{" "}
          <span className="text-gradient-blue">
            {comercial.apelido ?? comercial.nomeCompleto}
          </span>
        </h1>
        <p className="mt-2 text-fg-muted">
          Sua agenda do dia, meta do mês e saúde da carteira.
        </p>
      </div>

      {/* === 1. FOCO DO DIA — ações priorizadas === */}
      <FocoDoDia items={foco} comercialId={comercial.id} />

      {/* === 2. META DO MÊS === */}
      <MetaProgress meta={meta} />

      {/* === 2.5. CONQUISTAS === */}
      <div className="mb-6">
        <ConquistasGrid
          conquistas={conquistasData.conquistas}
          streak={conquistasData.streak}
          compact
        />
      </div>

      {/* === 3. CARTEIRA VIVA + PROJEÇÕES === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div className="lg:col-span-2">
          <CarteiraViva
            entries={carteira}
            comercialId={comercial.id}
          />
        </div>
        <ProjecoesCenarios proj={proj} />
      </div>

      {/* === 4. CALENDÁRIO + RANKING === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <CalendarList
          items={calendario}
          title="comissões a receber · 90 dias"
          emptyText="Sem comissões pendentes nos próximos 90 dias."
          href="/painel/comissoes"
          hrefLabel="comissões completas"
        />

        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
                ranking · últimos 90 dias
              </div>
              <h3 className="font-bold tracking-tight text-base">
                {minhaPos
                  ? `Você está em #${minhaPos.posicao}`
                  : "Sem volume nos últimos 90d"}
              </h3>
            </div>
          </div>
          {top.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">
              Nenhum comercial ativo ainda.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {top.map((r) => (
                <li
                  key={r.comercialId}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                    r.isYou
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-bg"
                  }`}
                >
                  <span
                    className={`font-mono tabular text-sm font-bold w-6 text-center shrink-0 ${
                      r.posicao === 1
                        ? "text-warn"
                        : r.isYou
                          ? "text-accent"
                          : "text-fg-dim"
                    }`}
                  >
                    {r.posicao === 1 ? "🥇" : `#${r.posicao}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-sm truncate ${
                        r.isYou ? "font-bold text-accent" : "text-fg"
                      }`}
                    >
                      {r.isYou ? `${r.nome} (você)` : r.nome}
                    </div>
                    <div className="text-[10px] text-fg-muted">
                      {r.qtdOps} {r.qtdOps === 1 ? "operação" : "operações"}
                    </div>
                  </div>
                  <span className="font-mono tabular text-xs text-fg-muted shrink-0">
                    {formatBRLcompact(r.volume)}
                  </span>
                </li>
              ))}
              {minhaPos && minhaPos.posicao > 5 && (
                <li className="flex items-center gap-3 px-3 py-2 rounded-lg border border-accent bg-accent-soft">
                  <span className="font-mono tabular text-sm font-bold w-6 text-center shrink-0 text-accent">
                    #{minhaPos.posicao}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-accent truncate">
                      {minhaPos.nome} (você)
                    </div>
                    <div className="text-[10px] text-fg-muted">
                      {minhaPos.qtdOps}{" "}
                      {minhaPos.qtdOps === 1 ? "operação" : "operações"}
                    </div>
                  </div>
                  <span className="font-mono tabular text-xs text-fg-muted shrink-0">
                    {formatBRLcompact(minhaPos.volume)}
                  </span>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {/* === 5. KPIs RESUMIDOS (consolidados, fica embaixo) === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="A receber 90d"
          value={formatBRLcompact(data.totals.comissaoPendente)}
          sub={`hist total ${formatBRLcompact(data.totals.comissaoAcumulada)}`}
          highlight
        />
        <Stat
          label="Faturado este mês"
          value={formatBRLcompact(data.totals.faturadoNoMes)}
        />
        <Stat
          label="Inadimplência"
          value={formatBRLcompact(data.totals.valorVencido)}
          tone={data.totals.valorVencido > 0 ? "warn" : "default"}
          sub="vencido em aberto"
        />
        <Stat
          label="Funil carteira"
          value={`${funil.imobiliariasComOp}/${funil.imobiliariasCadastradas}`}
          sub={`${(funil.taxaConversao * 100).toFixed(0)}% conversão`}
        />
      </div>

      {/* === 6. CHARTS HISTÓRICOS === */}
      <div className="mb-6">
        <ComercialChartsClient porMes={data.porMes} />
      </div>

      {/* === 7. OPS RECENTES + TOP CONSTRUTORAS === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
            <h2 className="font-bold tracking-tight">Operações recentes</h2>
            <Link
              href="/painel/daily"
              className="text-accent text-xs font-semibold hover:underline"
            >
              ver Daily →
            </Link>
          </div>
          {ultimas.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-8">
              Nenhuma operação ainda sob sua responsabilidade.
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
                      href={`/painel/daily?periodo=&construtoraId=${op.construtoraId ?? ""}`}
                      className="font-mono text-sm font-semibold text-fg hover:text-accent"
                    >
                      {op.numero}
                    </Link>
                    <div className="text-[11px] text-fg-muted truncate">
                      {op.construtoraNome ?? "—"} ·{" "}
                      {op.imobiliariaNome ?? op.corretorNome ?? "—"}
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

        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
            top construtoras
          </div>
          {data.construtoras.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">
              Nenhuma ainda.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {data.construtoras.slice(0, 8).map((c) => (
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
                    {formatBRLcompact(c.valorOperado)}
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
