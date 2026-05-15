import Link from "next/link";
import {
  getConstrutoraByOwnerId,
  getDashboardStatsForConstrutora,
  getOperacoesByConstrutora,
} from "@/lib/actions/operacoes";
import { listOpsAssinarConstrutora } from "@/lib/actions/construtora-assinatura";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { PainelShell } from "@/components/painel-shell";
import { MuralOverlay } from "@/components/mural-overlay";
import { ActionCenter } from "@/components/dashboards/action-center";
import { CalendarList } from "@/components/dashboards/calendar-list";
import { getMuralForCurrentUser } from "@/lib/actions/mural";
import {
  getConstrutoraActions,
  getConstrutoraCalendario,
  getConstrutoraPorFundo,
} from "@/lib/actions/dashboards";
import { formatBRL, formatBRLcompact } from "@/lib/format";
import type { User } from "@/db/schema";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Onboarding pendente", tone: "warn" },
  documentos_enviados: { label: "Aguardando análise", tone: "warn" },
  aprovado: { label: "Aprovado", tone: "success" },
  recusado: { label: "Recusado", tone: "danger" },
};

export async function ConstrutoraDashboard({ user }: { user: User }) {
  const construtora = await getConstrutoraByOwnerId(user.id);
  const podeOperar = user.onboardingStatus !== "pendente";
  const status = STATUS_LABEL[user.onboardingStatus] ?? STATUS_LABEL.pendente;

  const [stats, operacoes, muralMsgs, opsPraAssinar, actions, cal7d, cal30d, porFundo] =
    await Promise.all([
      construtora
        ? getDashboardStatsForConstrutora(construtora.id)
        : Promise.resolve(null),
      construtora
        ? getOperacoesByConstrutora(construtora.id)
        : Promise.resolve([]),
      getMuralForCurrentUser(),
      construtora
        ? listOpsAssinarConstrutora(construtora.id)
        : Promise.resolve([]),
      construtora
        ? getConstrutoraActions(construtora.id, user.id)
        : Promise.resolve([]),
      construtora
        ? getConstrutoraCalendario(construtora.id, 7)
        : Promise.resolve([]),
      construtora
        ? getConstrutoraCalendario(construtora.id, 30)
        : Promise.resolve([]),
      construtora
        ? getConstrutoraPorFundo(construtora.id)
        : Promise.resolve([]),
    ]);

  const operacoesRecentes = operacoes.slice(0, 5);

  // Próximo vencimento na lista 7d (primeiro item futuro ou hoje)
  const proximoVenc = cal7d.find((c) => c.tone !== "vencido");
  const venc7dTotal = cal7d.reduce((s, c) => s + c.valor, 0);

  return (
    <PainelShell role="construtora" userName={user.nome} active="/painel">
      <MuralOverlay messages={muralMsgs} />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <div className="eyebrow mb-2">painel · construtora</div>
          <h1 className="text-display-md">
            Olá,{" "}
            <span className="text-gradient-blue">
              {user.nome?.split(" ")[0] ?? "bem-vindo"}
            </span>
            .
          </h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="font-mono text-[11px] uppercase tracking-wider text-fg-muted">
              Construtora
              {construtora ? ` · ${construtora.razaoSocial}` : ""}
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
          <h2 className="text-xl font-bold">
            Complete o cadastro da construtora
          </h2>
          <p className="mt-2 text-fg-muted">
            Preencha os dados da empresa pra começar a acompanhar operações
            que seus corretores parceiros cadastrarem.
          </p>
          <Link
            href="/painel/onboarding"
            className="btn-primary mt-5 !h-11 !px-5"
          >
            Iniciar cadastro <span className="arrow">→</span>
          </Link>
        </div>
      )}

      {/* === 1. AÇÕES PENDENTES === */}
      {podeOperar && (
        <ActionCenter
          items={actions}
          title="O que precisa de você"
          subtitle="Assinaturas, documentos e mensagens em aberto."
        />
      )}

      {/* === 2. ALERTA VENCIDAS === */}
      {stats && stats.vencidas > 0 && (
        <div className="rounded-2xl border border-danger/40 bg-red-50 p-5 mb-6 flex items-start gap-4">
          <span className="size-9 rounded-full bg-danger/15 text-danger flex items-center justify-center text-xl shrink-0">
            ⚠
          </span>
          <div className="flex-1">
            <h2 className="font-bold text-danger">
              {formatBRL(stats.vencidas)} em parcelas vencidas
            </h2>
            <p className="mt-1 text-fg-muted text-sm">
              Quite o quanto antes pra evitar multa + juros de mora e proteger
              seu score com a Antecipaqui.
            </p>
          </div>
          <Link
            href="/painel/duplicatas"
            className="btn-primary !h-10 !px-4 shrink-0 !bg-danger hover:!bg-danger/90"
          >
            Quitar →
          </Link>
        </div>
      )}

      {/* === 3. PRÓXIMO VENCIMENTO + KPIs === */}
      {podeOperar && stats && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            {/* Card destacado: próximo vencimento */}
            <div className="lg:col-span-1 rounded-2xl border border-accent bg-accent-soft p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-2">
                próximo vencimento
              </div>
              {proximoVenc ? (
                <>
                  <div className="font-mono tabular text-2xl font-bold text-fg">
                    {formatBRLcompact(proximoVenc.valor)}
                  </div>
                  <div className="text-xs text-fg-muted mt-1">
                    {new Date(proximoVenc.data + "T00:00:00").toLocaleDateString(
                      "pt-BR",
                      { weekday: "long", day: "2-digit", month: "long" },
                    )}{" "}
                    · {proximoVenc.contrapartes.slice(0, 2).join(", ")}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-mono tabular text-xl font-bold text-fg">
                    Sem vencimento próximo
                  </div>
                  <div className="text-xs text-fg-muted mt-1">
                    Próximos 7 dias livres.
                  </div>
                </>
              )}
              {venc7dTotal > 0 && (
                <Link
                  href="/painel/duplicatas"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-semibold text-accent hover:underline"
                >
                  {formatBRLcompact(venc7dTotal)} totais em 7 dias →
                </Link>
              )}
            </div>

            <Stat
              label="A pagar este mês"
              value={formatBRLcompact(stats.aVencerNoMes)}
              sub={`total devido ${formatBRLcompact(stats.totalDevido)}`}
              tone={stats.aVencerNoMes > 0 ? "warn" : "default"}
            />
            <Stat
              label="Já pago"
              value={formatBRLcompact(stats.totalPago)}
              sub={`${stats.totalAtivas} operação(ões) ativa(s)`}
              tone="success"
            />
          </div>
        </>
      )}

      {/* === 4. CALENDÁRIO 30D + POR FUNDO === */}
      {podeOperar && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <CalendarList
            items={cal30d}
            title="próximos vencimentos · 30 dias"
            emptyText="Sem parcelas a pagar nos próximos 30 dias."
            href="/painel/duplicatas"
            hrefLabel="duplicatas completas"
          />

          {/* POR FUNDO */}
          <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-4">
              saldo aberto · por fundo
            </div>
            {porFundo.length === 0 ? (
              <p className="text-sm text-fg-muted text-center py-8">
                Você não tem saldo em aberto com nenhum fundo.
              </p>
            ) : (
              <ul className="space-y-2">
                {porFundo.slice(0, 6).map((f) => (
                  <li
                    key={f.fundoId ?? "sem-fundo"}
                    className="rounded-lg border border-border bg-bg p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-fg truncate">
                        {f.fundoNome}
                      </span>
                      <span className="font-mono tabular text-sm font-bold text-fg shrink-0">
                        {formatBRLcompact(f.total)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-fg-muted">
                        a vencer{" "}
                        <span className="text-fg font-semibold">
                          {formatBRLcompact(f.aVencer)}
                        </span>
                      </span>
                      {f.vencido > 0 && (
                        <span className="text-danger font-semibold">
                          · vencido {formatBRLcompact(f.vencido)}
                        </span>
                      )}
                      <span className="text-fg-dim ml-auto">
                        {f.qtdParcelas} parcelas
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/painel/operacoes"
              className="block mt-4 text-accent text-xs font-semibold hover:underline"
            >
              ver operações por fundo →
            </Link>
          </section>
        </div>
      )}

      {/* === 5. CTAs primárias === */}
      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <Link
          href="/painel/duplicatas"
          className="rounded-2xl border border-accent bg-accent text-white p-6 hover:bg-accent-dark transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/70 mb-1">
              ação principal
            </div>
            <div className="text-xl font-bold">Duplicatas a pagar</div>
            <div className="text-sm text-white/80 mt-0.5">
              {formatBRLcompact(stats?.aVencerNoMes ?? 0)} este mês
            </div>
          </div>
          <span className="text-2xl group-hover:translate-x-1 transition-transform">
            →
          </span>
        </Link>
        {opsPraAssinar.length > 0 ? (
          <Link
            href={`/painel/operacoes/${opsPraAssinar[0].id}#assinatura`}
            className="rounded-2xl border border-warn bg-yellow-50 p-6 hover:bg-yellow-100 transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-1">
                aguardando você
              </div>
              <div className="text-xl font-bold">
                {opsPraAssinar.length} op
                {opsPraAssinar.length === 1 ? "" : "s"} pra assinar
              </div>
              <div className="text-sm text-fg-muted mt-0.5">
                confirme o reconhecimento da comissão
              </div>
            </div>
            <span className="text-2xl group-hover:translate-x-1 transition-transform">
              ✍️
            </span>
          </Link>
        ) : (
          <Link
            href="/painel/score"
            className="rounded-2xl border border-border bg-bg-elev p-6 hover:border-accent transition-colors flex items-center justify-between group"
          >
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
                seu score
              </div>
              <div className="text-xl font-bold">Como o mercado te vê</div>
              <div className="text-sm text-fg-muted mt-0.5">
                histórico de pagamento + dicas
              </div>
            </div>
            <span className="text-fg-dim text-2xl group-hover:translate-x-1 group-hover:text-accent transition-all">
              →
            </span>
          </Link>
        )}
        <Link
          href="/painel/operacoes"
          className="rounded-2xl border border-border bg-bg-elev p-6 hover:border-accent transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
              acompanhar
            </div>
            <div className="text-xl font-bold">Operações</div>
            <div className="text-sm text-fg-muted mt-0.5">
              {operacoes.length} vinculadas
            </div>
          </div>
          <span className="text-fg-dim text-2xl group-hover:translate-x-1 group-hover:text-accent transition-all">
            →
          </span>
        </Link>
      </div>

      {/* === 6. Operações recentes === */}
      {podeOperar && (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-bold tracking-tight">
              Operações vinculadas a você
            </h2>
            <Link
              href="/painel/operacoes"
              className="text-sm text-fg-muted hover:text-accent transition-colors"
            >
              Ver todas →
            </Link>
          </div>
          {operacoesRecentes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <p className="text-fg-muted">
                Ainda não há operações. Quando um corretor antecipar uma
                comissão vinculada à sua construtora, ela vai aparecer aqui.
              </p>
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
                      {op.corretorNome ?? "—"}
                    </div>
                    <div className="col-span-5 md:col-span-3 text-right font-mono tabular text-sm text-fg">
                      {formatBRL(parseFloat(op.valorComissao))}
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
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn" | "success";
}) {
  const baseClass =
    tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "success"
        ? "border-success/40 bg-green-50"
        : "border-border bg-bg-elev";
  const labelColor =
    tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-5 ${baseClass}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-2 ${labelColor}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight leading-tight break-words text-fg">
        {value}
      </div>
      {sub && <div className="text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
