import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { imobiliarias } from "@/db/schema";
import {
  getDashboardStats,
  getOperacoesByCorretor,
} from "@/lib/actions/operacoes";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { PainelShell } from "@/components/painel-shell";
import { MuralOverlay } from "@/components/mural-overlay";
import { ActionCenter } from "@/components/dashboards/action-center";
import { getMuralForCurrentUser } from "@/lib/actions/mural";
import { getCorretorFinanceiro } from "@/lib/actions/corretor-financeiro";
import { listFundosForSelector } from "@/lib/actions/fundos";
import { getTaxaMensal } from "@/lib/actions/settings";
import {
  getCorretorAReceber,
  getCorretorActions,
} from "@/lib/actions/dashboards";
import { SimuladorAntecipacao } from "@/components/simulador-antecipacao";
import { formatBRL, formatBRLcompact } from "@/lib/format";
import type { User } from "@/db/schema";
import { CiceroSugereCard } from "@/components/cicero-sugere-card";

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  admin: "Administrador",
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Onboarding pendente", tone: "warn" },
  documentos_enviados: { label: "Aguardando análise", tone: "warn" },
  aprovado: { label: "Aprovado", tone: "success" },
  recusado: { label: "Recusado", tone: "danger" },
};

export async function CorretorDashboard({ user }: { user: User }) {
  const empresa = (
    await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, user.id))
      .limit(1)
  )[0];

  const status = STATUS_LABEL[user.onboardingStatus] ?? STATUS_LABEL.pendente;
  const podeOperar = user.onboardingStatus !== "pendente";

  const [
    stats,
    operacoes,
    muralMsgs,
    financeiro,
    fundos,
    taxaPadrao,
    aReceber,
    actions,
  ] = await Promise.all([
    podeOperar ? getDashboardStats(user.id) : Promise.resolve(null),
    podeOperar ? getOperacoesByCorretor(user.id) : Promise.resolve([]),
    getMuralForCurrentUser(),
    podeOperar ? getCorretorFinanceiro() : Promise.resolve(null),
    listFundosForSelector(),
    getTaxaMensal(),
    podeOperar ? getCorretorAReceber(user.id) : Promise.resolve(null),
    podeOperar
      ? getCorretorActions(user.id, user.email)
      : Promise.resolve([]),
  ]);

  const fundosComTaxa = fundos
    .filter((f) => f.taxaMensalBase != null)
    .map((f) => ({
      id: f.id,
      nome: f.nomeFantasia ?? f.razaoSocial,
      taxaMensal: parseFloat(f.taxaMensalBase ?? "0"),
    }));

  const operacoesRecentes = operacoes.slice(0, 5);

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  // Funil pessoal: rascunho → enviadas → aprovadas → ativas/realizadas
  const funilPessoal = operacoes.reduce(
    (acc, op) => {
      if (op.status === "rascunho") acc.rascunho++;
      else if (
        op.status === "aguardando_aprovacao" ||
        op.status === "documentos_incompletos" ||
        op.status === "pre_aprovada" ||
        op.status === "analise_final"
      )
        acc.analise++;
      else if (op.status === "enviada_para_assinatura") acc.contrato++;
      else if (op.status === "enviada_para_pagamento") acc.ativa++;
      else if (op.status === "realizada") acc.liquidada++;
      else if (op.status === "recusada" || op.status === "cancelada")
        acc.recusada++;
      return acc;
    },
    { rascunho: 0, analise: 0, contrato: 0, ativa: 0, liquidada: 0, recusada: 0 },
  );

  return (
    <PainelShell role={role} userName={user.nome} active="/painel">
      <MuralOverlay messages={muralMsgs} />
      <CiceroSugereCard />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="eyebrow mb-2">painel</div>
          <h1 className="text-display-md">
            Olá,{" "}
            <span className="text-gradient-blue">
              {user.nome?.split(" ")[0] ?? "bem-vindo"}
            </span>
            .
          </h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              {ROLE_LABEL[user.role] ?? user.role}
              {empresa ? ` · ${empresa.razaoSocial}` : ""}
            </span>
            <span className="size-1 rounded-full bg-fg-dim" />
            <span className="flex items-center gap-1.5">
              <span
                className={`size-2 rounded-full ${
                  status.tone === "success"
                    ? "bg-success"
                    : status.tone === "danger"
                      ? "bg-danger"
                      : "bg-warn"
                }`}
              />
              <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
                {status.label}
              </span>
            </span>
          </div>
        </div>
      </div>

      {!podeOperar && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
            próximo passo
          </div>
          <h2 className="text-xl font-bold">Complete seu cadastro</h2>
          <p className="mt-2 text-fg-muted">
            Em 5 minutos: escolha o tipo de perfil e preencha os dados da
            empresa. Aí você libera o cadastro de operações.
          </p>
          <Link
            href="/painel/onboarding"
            className="btn-primary mt-5 !h-11 !px-5"
          >
            Iniciar cadastro <span className="arrow">→</span>
          </Link>
        </div>
      )}

      {podeOperar && user.onboardingStatus === "documentos_enviados" && (
        <div className="rounded-2xl border border-warn/30 bg-yellow-50 p-5 mb-6 flex items-start gap-4">
          <span className="size-8 rounded-full bg-warn/15 text-warn flex items-center justify-center text-xl shrink-0 mt-0.5">
            ⏳
          </span>
          <div>
            <h2 className="font-bold">Cadastro em análise</h2>
            <p className="mt-1 text-fg-muted text-sm">
              Você já pode cadastrar operações — elas ficam em análise junto
              com sua aprovação.
            </p>
          </div>
        </div>
      )}

      {/* === 1. AÇÕES PENDENTES === */}
      {podeOperar && (
        <ActionCenter
          items={actions}
          title="O que precisa de você"
          subtitle="Convites, pendências e documentos solicitados."
        />
      )}

      {/* === 2. A RECEBER — destaque grande === */}
      {podeOperar && aReceber && (
        <section className="rounded-2xl border border-accent bg-accent-soft p-5 md:p-6 mb-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-1">
                a receber · operações ativas
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-fg">
                {formatBRL(aReceber.esteMes)}{" "}
                <span className="text-fg-muted font-normal text-base">
                  este mês
                </span>
              </h2>
              <p className="text-xs text-fg-muted mt-1">
                {aReceber.qtdAtivas} operação(ões) com parcelas ainda abertas.
              </p>
            </div>
            <Link
              href="/painel/recebimentos"
              className="text-accent text-xs font-semibold hover:underline shrink-0"
            >
              ver recebimentos →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Mini
              label="Próximo mês"
              value={formatBRLcompact(aReceber.proxMes)}
            />
            <Mini
              label="Próximos 90 dias"
              value={formatBRLcompact(aReceber.proximos90d)}
            />
            <Mini
              label="Próxima parcela"
              value={
                aReceber.proximaParcela
                  ? formatBRLcompact(aReceber.proximaParcela.valor)
                  : "—"
              }
              sub={
                aReceber.proximaParcela
                  ? new Date(
                      aReceber.proximaParcela.vencimento + "T00:00:00",
                    ).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })
                  : undefined
              }
            />
          </div>
        </section>
      )}

      {/* === 3. FUNIL PESSOAL === */}
      {podeOperar && operacoes.length > 0 && (
        <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
            seu funil pessoal
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            <FunnelBox
              label="Rascunho"
              count={funilPessoal.rascunho}
              tone="default"
            />
            <FunnelBox
              label="Em análise"
              count={funilPessoal.analise}
              tone="info"
            />
            <FunnelBox
              label="Em contrato"
              count={funilPessoal.contrato}
              tone="warn"
            />
            <FunnelBox
              label="Ativas"
              count={funilPessoal.ativa}
              tone="success"
            />
            <FunnelBox
              label="Liquidadas"
              count={funilPessoal.liquidada}
              tone="success"
            />
            <FunnelBox
              label="Recusadas"
              count={funilPessoal.recusada}
              tone="default"
            />
          </div>
        </section>
      )}

      {/* === 4. KPIs financeiros === */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total de operações"
            value={String(stats.total)}
            sublabel={
              stats.pendentes > 0
                ? `${stats.pendentes} em análise`
                : "todas processadas"
            }
          />
          <StatCard
            label="Comissão total"
            value={formatBRLcompact(stats.valorComissaoTotal)}
            sublabel="cadastrada por você"
          />
          <StatCard
            label="Já antecipado"
            value={formatBRLcompact(stats.valorAntecipado)}
            sublabel="creditado na conta"
            highlight
          />
          <StatCard
            label="Em análise"
            value={formatBRLcompact(stats.valorPresentePendente)}
            sublabel={`${stats.pendentes} operações`}
          />
        </div>
      )}

      {/* === 5. FORECAST === */}
      {financeiro && financeiro.totalForecast > 0 && (
        <Link
          href="/painel/forecast-corretor"
          className="block rounded-2xl border border-border bg-bg-elev hover:border-accent p-5 md:p-6 mb-6 transition-colors"
        >
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
                forecast pessoal · 6 meses
              </div>
              <h3 className="text-lg font-bold tracking-tight">
                Você vai receber{" "}
                <span className="text-accent">
                  {formatBRL(financeiro.totalForecast)}
                </span>{" "}
                em parcelas de comissão
              </h3>
              <p className="text-xs text-fg-muted mt-1">
                Total a receber:{" "}
                <strong>{formatBRL(financeiro.totalAReceber)}</strong>. Custo
                médio de antecipação:{" "}
                {(financeiro.custoMedioPct * 100)
                  .toFixed(1)
                  .replace(".", ",")}
                % da comissão.
              </p>
            </div>
            <div className="flex items-center gap-1 text-accent text-sm font-semibold">
              Ver detalhe <span>→</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-6 gap-1">
            {financeiro.forecast.map((m) => {
              const max = Math.max(
                ...financeiro.forecast.map((x) => x.valorAVencer),
                1,
              );
              const pct = (m.valorAVencer / max) * 100;
              return (
                <div key={m.ym} className="flex flex-col gap-1">
                  <div className="h-12 bg-bg-card rounded flex items-end overflow-hidden">
                    <div
                      className="w-full bg-accent transition-all"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-fg-dim text-center">
                    {m.label}
                  </div>
                </div>
              );
            })}
          </div>
        </Link>
      )}

      {/* === 6. CTAs === */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Link
          href="/painel/operacoes/nova"
          className="rounded-2xl border border-accent bg-accent text-white p-6 hover:bg-accent-dark transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/70 mb-1">
              ação principal
            </div>
            <div className="text-xl font-bold">Nova operação</div>
            <div className="text-sm text-white/80 mt-0.5">Em 2 minutos</div>
          </div>
          <span className="text-2xl group-hover:translate-x-1 transition-transform">
            →
          </span>
        </Link>
        <Link
          href="/painel/operacoes"
          className="rounded-2xl border border-border bg-bg-elev p-6 hover:border-accent transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
              acompanhar
            </div>
            <div className="text-xl font-bold">Todas as operações</div>
            <div className="text-sm text-fg-muted mt-0.5">
              {operacoes.length} cadastradas
            </div>
          </div>
          <span className="text-fg-dim text-2xl group-hover:translate-x-1 group-hover:text-accent transition-all">
            →
          </span>
        </Link>
        <Link
          href="/painel/extrato"
          className="rounded-2xl border border-border bg-bg-elev p-6 hover:border-accent transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
              financeiro
            </div>
            <div className="text-xl font-bold">Extrato</div>
            <div className="text-sm text-fg-muted mt-0.5">
              entradas e saídas
            </div>
          </div>
          <span className="text-fg-dim text-2xl group-hover:translate-x-1 group-hover:text-accent transition-all">
            →
          </span>
        </Link>
      </div>

      {/* === 7. Operações recentes === */}
      {podeOperar && (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-bold tracking-tight">Operações recentes</h2>
            <Link
              href="/painel/operacoes"
              className="text-sm text-fg-muted hover:text-accent transition-colors"
            >
              Ver todas →
            </Link>
          </div>
          {operacoesRecentes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-fg-muted">
                Nenhuma operação ainda. Cadastre a primeira.
              </p>
              <Link
                href="/painel/operacoes/nova"
                className="btn-primary mt-5 !h-11 !px-5 inline-flex"
              >
                Cadastrar operação <span className="arrow">→</span>
              </Link>
            </div>
          ) : (
            <ul>
              {operacoesRecentes.map((op) => (
                <li
                  key={op.id}
                  className="border-b border-border last:border-0"
                >
                  <Link
                    href={`/painel/operacoes/${op.id}`}
                    className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors group items-center"
                  >
                    <div className="col-span-3 md:col-span-2 font-mono text-sm text-fg">
                      {op.numero}
                    </div>
                    <div className="hidden md:block col-span-3 text-sm text-fg-muted truncate">
                      {op.construtoraNome ?? "—"}
                    </div>
                    <div className="col-span-5 md:col-span-3 text-right font-mono tabular text-sm text-fg">
                      {formatBRL(parseFloat(op.valorPresente))}
                    </div>
                    <div className="col-span-3 md:col-span-3 flex justify-end md:justify-start">
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
      )}

      {/* === 8. Simulador === */}
      {podeOperar && (
        <section className="mt-8">
          <div className="mb-5">
            <div className="eyebrow mb-2">ferramenta · embutida</div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Simule uma{" "}
              <span className="text-gradient-blue">antecipação</span> agora
            </h2>
            <p className="mt-2 text-sm text-fg-muted max-w-2xl">
              Veja na hora quanto você recebe à vista vs esperar parcelado.
              Compare entre fundos antes de cadastrar a operação.
            </p>
          </div>
          <SimuladorAntecipacao
            fundos={fundosComTaxa}
            taxaPadrao={taxaPadrao}
          />
        </section>
      )}
    </PainelShell>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  highlight = false,
}: {
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight ? "border-accent bg-accent-soft" : "border-border bg-bg-elev"
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-2 ${
          highlight ? "text-accent" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight leading-tight break-words text-fg">
        {value}
      </div>
      {sublabel && (
        <div className="text-xs text-fg-muted mt-1">{sublabel}</div>
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-accent/20 bg-white/40 p-3">
      <div className="font-mono text-[9px] uppercase tracking-wider text-accent mb-1">
        {label}
      </div>
      <div className="font-mono tabular text-base font-bold text-fg">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-fg-muted mt-0.5">{sub}</div>
      )}
    </div>
  );
}

function FunnelBox({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "default" | "info" | "warn" | "success";
}) {
  const cls =
    tone === "success"
      ? "border-success/40 bg-green-50"
      : tone === "warn"
        ? "border-warn/40 bg-yellow-50"
        : tone === "info"
          ? "border-accent/30 bg-accent-soft"
          : "border-border bg-bg";
  const labelCls =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : tone === "info"
          ? "text-accent"
          : "text-fg-dim";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div
        className={`font-mono text-[9px] uppercase tracking-wider mb-1 ${labelCls}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-xl font-bold text-fg leading-none">
        {count}
      </div>
    </div>
  );
}
