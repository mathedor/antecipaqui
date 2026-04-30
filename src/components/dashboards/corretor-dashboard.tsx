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
import { getMuralForCurrentUser } from "@/lib/actions/mural";
import { formatBRL } from "@/lib/format";
import type { User } from "@/db/schema";

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

  const [stats, operacoes, muralMsgs] = await Promise.all([
    podeOperar ? getDashboardStats(user.id) : Promise.resolve(null),
    podeOperar ? getOperacoesByCorretor(user.id) : Promise.resolve([]),
    getMuralForCurrentUser(),
  ]);

  const operacoesRecentes = operacoes.slice(0, 5);

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel">
      <MuralOverlay messages={muralMsgs} />
      <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
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
          <Link href="/painel/onboarding" className="btn-primary mt-5 !h-11 !px-5">
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

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Total de operações"
            value={String(stats.total)}
            sublabel={
              stats.pendentes > 0 ? `${stats.pendentes} em análise` : "—"
            }
          />
          <StatCard
            label="Comissão total"
            value={formatBRL(stats.valorComissaoTotal)}
            sublabel="cadastrada por você"
          />
          <StatCard
            label="Já antecipado"
            value={formatBRL(stats.valorAntecipado)}
            sublabel="creditado na conta"
            highlight
          />
          <StatCard
            label="Em análise"
            value={formatBRL(stats.valorPresentePendente)}
            sublabel={`${stats.pendentes} operações`}
          />
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-3 mb-8">
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
          href={user.onboardingStatus === "pendente" ? "/painel/onboarding" : "#"}
          className="rounded-2xl border border-border bg-bg-elev p-6 hover:border-accent transition-colors flex items-center justify-between group"
        >
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
              em breve
            </div>
            <div className="text-xl font-bold">Documentos KYC</div>
            <div className="text-sm text-fg-muted mt-0.5">Upload na próxima fase</div>
          </div>
          <span className="text-fg-dim text-2xl">·</span>
        </Link>
      </div>

      {podeOperar && (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
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
                <li key={op.id} className="border-b border-border last:border-0">
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

      <div className="mt-8 flex justify-end items-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
          user · {user.id.slice(0, 12)}…
        </span>
      </div>
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
      <div className="font-mono tabular text-2xl md:text-3xl font-bold tracking-tight text-fg">
        {value}
      </div>
      {sublabel && <div className="text-xs text-fg-muted mt-1">{sublabel}</div>}
    </div>
  );
}
