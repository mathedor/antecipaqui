import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  getConstrutoraByOwnerId,
  getDashboardStatsForConstrutora,
  getOperacoesByConstrutora,
} from "@/lib/actions/operacoes";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { SairButton } from "@/components/sair-button";
import { NotificationBell } from "@/components/notification-bell";
import { formatBRL } from "@/lib/format";
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

  const [stats, operacoes] = await Promise.all([
    construtora
      ? getDashboardStatsForConstrutora(construtora.id)
      : Promise.resolve(null),
    construtora
      ? getOperacoesByConstrutora(construtora.id)
      : Promise.resolve([]),
  ]);

  const operacoesRecentes = operacoes.slice(0, 5);
  const operacoesPendentes = operacoes.filter((o) =>
    ["pre_aprovada", "analise_final"].includes(o.status),
  ).length;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16 min-h-[60vh]">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
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
        <div className="flex items-center gap-3">
          <NotificationBell />
          <SairButton />
          <UserButton />
        </div>
      </div>

      {!podeOperar && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
            próximo passo
          </div>
          <h2 className="text-xl font-bold">Complete o cadastro da construtora</h2>
          <p className="mt-2 text-fg-muted">
            Preencha os dados da empresa pra começar a acompanhar operações que
            seus corretores parceiros cadastrarem.
          </p>
          <Link href="/painel/onboarding" className="btn-primary mt-5 !h-11 !px-5">
            Iniciar cadastro <span className="arrow">→</span>
          </Link>
        </div>
      )}

      {/* Stats — 4 cards conforme escopo do cliente */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total operações"
            value={String(stats.totalOperacoes)}
            sublabel={
              operacoesPendentes > 0
                ? `${operacoesPendentes} pendente(s) análise`
                : `${stats.totalAtivas} ativa(s)`
            }
          />
          <StatCard
            label="Total a pagar"
            value={formatBRL(stats.totalDevido)}
            sublabel="comissões aprovadas"
            highlight
          />
          <StatCard
            label="A vencer no mês"
            value={formatBRL(stats.aVencerNoMes)}
            sublabel="parcelas deste mês"
            tone={stats.aVencerNoMes > 0 ? "warn" : "default"}
          />
          <StatCard
            label="Já pago"
            value={formatBRL(stats.totalPago)}
            sublabel="quitado"
          />
        </div>
      )}

      {/* Vencidas alert */}
      {stats && stats.vencidas > 0 && (
        <div className="rounded-2xl border border-danger/40 bg-red-50 p-5 mb-6 flex items-start gap-4">
          <span className="size-8 rounded-full bg-danger/15 text-danger flex items-center justify-center text-xl shrink-0 mt-0.5">
            ⚠
          </span>
          <div>
            <h2 className="font-bold text-danger">
              {formatBRL(stats.vencidas)} em parcelas vencidas
            </h2>
            <p className="mt-1 text-fg-muted text-sm">
              Você tem parcelas em atraso. Acesse a aba Duplicatas pra ver e
              quitar.
            </p>
            <Link
              href="/painel/duplicatas"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-danger hover:underline"
            >
              Ver duplicatas →
            </Link>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="grid md:grid-cols-3 gap-3 mb-8">
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
              {formatBRL(stats?.aVencerNoMes ?? 0)} este mês
            </div>
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
            <div className="text-xl font-bold">Operações</div>
            <div className="text-sm text-fg-muted mt-0.5">
              {operacoes.length} vinculadas
            </div>
          </div>
          <span className="text-fg-dim text-2xl group-hover:translate-x-1 group-hover:text-accent transition-all">
            →
          </span>
        </Link>
        <Link
          href="#"
          className="rounded-2xl border border-border bg-bg-elev p-6 hover:border-accent transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
              em breve
            </div>
            <div className="text-xl font-bold">Contratos a assinar</div>
            <div className="text-sm text-fg-muted mt-0.5">Phase 6 (ZapSign)</div>
          </div>
          <span className="text-fg-dim text-2xl">·</span>
        </Link>
      </div>

      {/* Operações recentes */}
      {podeOperar && (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-bold tracking-tight">Operações vinculadas a você</h2>
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
                Ainda não há operações. Quando um corretor antecipar uma comissão
                vinculada à sua construtora, ela vai aparecer aqui.
              </p>
            </div>
          ) : (
            <ul>
              {operacoesRecentes.map((op) => (
                <li key={op.id} className="border-b border-border last:border-0">
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

      <div className="mt-8 flex justify-between items-center">
        <Link href="/" className="link-underline text-fg-muted hover:text-fg">
          ← Home
        </Link>
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
          user · {user.id.slice(0, 12)}…
        </span>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sublabel,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  highlight?: boolean;
  tone?: "default" | "warn";
}) {
  const isWarn = tone === "warn";
  const baseBorder = highlight
    ? "border-accent bg-accent-soft"
    : isWarn
      ? "border-warn/40 bg-yellow-50"
      : "border-border bg-bg-elev";
  const labelColor = highlight
    ? "text-accent"
    : isWarn
      ? "text-warn"
      : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-5 ${baseBorder}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-2 ${labelColor}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-2xl md:text-3xl font-bold tracking-tight text-fg">
        {value}
      </div>
      {sublabel && <div className="text-xs text-fg-muted mt-1">{sublabel}</div>}
    </div>
  );
}
