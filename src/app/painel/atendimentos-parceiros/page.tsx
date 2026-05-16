import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import {
  getTopParceirosConstrutora,
  listAtendimentosObservandoComoConstrutora,
} from "@/lib/actions/atendimento-construtoras";
import {
  TIPO_OPINIAO_LABEL,
  type TipoOpiniao,
} from "@/lib/atendimento-construtoras-types";
import { formatBRLcompact } from "@/lib/format";
import { STATUS_LABEL, type AtendimentoStatus } from "@/lib/atendimento-types";

export const metadata = { title: "Atendimentos parceiros" };
export const dynamic = "force-dynamic";

export default async function AtendimentosParceirosPage() {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");

  const [lista, parceiros] = await Promise.all([
    listAtendimentosObservandoComoConstrutora(),
    getTopParceirosConstrutora(),
  ]);

  const aguardando = lista.filter((a) => a.aguardandoOpiniao);
  const ativos = lista.filter(
    (a) =>
      !a.aguardandoOpiniao && a.status !== "fechado" && a.status !== "perdido",
  );
  const encerrados = lista.filter(
    (a) => a.status === "fechado" || a.status === "perdido",
  );

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/atendimentos-parceiros"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">atendimentos · parceiros</div>
        <h1 className="text-display-md">
          Negociações com{" "}
          <span className="text-gradient-blue">você acompanhando</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Imobiliárias parceiras te convidam pra acompanhar negociações ativas.
          Você vê a timeline, comenta e responde quando opinião for solicitada.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Total acompanhando" value={lista.length} />
        <Kpi
          label="Aguardando sua opinião"
          value={aguardando.length}
          tone={aguardando.length > 0 ? "warn" : "default"}
        />
        <Kpi label="Em andamento" value={ativos.length} tone="info" />
        <Kpi
          label="Fechados/Perdidos"
          value={encerrados.length}
          tone="default"
        />
      </div>

      {/* Seções */}
      {aguardando.length > 0 && (
        <Section title="⏸ Aguardando sua opinião" tone="warn">
          <ul className="space-y-2">
            {aguardando.map((a) => (
              <AtendimentoRow key={a.vinculoId} a={a} />
            ))}
          </ul>
        </Section>
      )}

      {ativos.length > 0 && (
        <Section title="Em andamento">
          <ul className="space-y-2">
            {ativos.map((a) => (
              <AtendimentoRow key={a.vinculoId} a={a} />
            ))}
          </ul>
        </Section>
      )}

      {encerrados.length > 0 && (
        <Section title="Encerrados">
          <ul className="space-y-2">
            {encerrados.map((a) => (
              <AtendimentoRow key={a.vinculoId} a={a} />
            ))}
          </ul>
        </Section>
      )}

      {lista.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">🤝</div>
          <h2 className="text-xl font-bold tracking-tight">
            Sem atendimentos acompanhando
          </h2>
          <p className="mt-2 text-fg-muted max-w-md mx-auto">
            Quando uma imobiliária parceira te convidar pra acompanhar uma
            negociação, ela vai aparecer aqui.
          </p>
        </div>
      )}

      {/* Top parceiros */}
      {(parceiros.imobs.length > 0 || parceiros.corretores.length > 0) && (
        <div className="grid md:grid-cols-2 gap-5 mt-8">
          <TopList
            title="Top imobiliárias parceiras · 90d"
            items={parceiros.imobs.map((i) => ({
              key: i.imobiliariaId,
              nome: i.razaoSocial,
              extra: `${i.qtdFechados} fechados`,
              valor: `${i.qtdAtendimentos} atendimentos`,
              alerta: i.qtdAguardando,
            }))}
          />
          <TopList
            title="Top corretores parceiros · 90d"
            items={parceiros.corretores.map((c) => ({
              key: c.userId,
              nome: c.nome ?? c.email,
              extra: `${c.qtdFechados} fechados`,
              valor: `${c.qtdAtendimentos} atendimentos`,
            }))}
          />
        </div>
      )}
    </PainelShell>
  );
}

function Section({
  title,
  tone = "default",
  children,
}: {
  title: string;
  tone?: "default" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : "border-border bg-bg-elev";
  return (
    <section className={`rounded-2xl border p-5 md:p-6 mb-5 ${cls}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
        {title}
      </div>
      {children}
    </section>
  );
}

function AtendimentoRow({
  a,
}: {
  a: Awaited<
    ReturnType<typeof listAtendimentosObservandoComoConstrutora>
  >[number];
}) {
  return (
    <li>
      <Link
        href={`/painel/atendimentos-parceiros/${a.atendimentoId}`}
        className="block rounded-xl border border-border bg-bg p-3 hover:border-accent transition-colors"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-fg">{a.compradorNome}</h3>
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-bg-card border border-border text-fg-muted">
                {STATUS_LABEL[a.status as AtendimentoStatus] ?? a.status}
              </span>
              {a.aguardandoOpiniao && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-warn text-white">
                  ⏸ aguardando
                </span>
              )}
            </div>
            <div className="text-[11px] text-fg-muted mt-0.5">
              {a.imovelDescricao ?? "—"}
              {a.imovelEndereco && ` · ${a.imovelEndereco}`}
            </div>
            <div className="text-[10px] text-fg-dim font-mono mt-1">
              <strong>{a.imobNome}</strong>
              {a.corretorNome && ` · ${a.corretorNome}`}
              {a.corretorTelefone && ` · ${a.corretorTelefone}`}
            </div>
          </div>
          {a.imovelValor && (
            <div className="text-right shrink-0">
              <div className="font-mono tabular text-sm font-bold text-fg">
                {formatBRLcompact(a.imovelValor)}
              </div>
            </div>
          )}
        </div>
        {a.aguardandoOpiniao && a.tipoOpiniaoSolicitada && (
          <div className="mt-2 text-[10px] font-mono text-warn">
            tipo:{" "}
            {TIPO_OPINIAO_LABEL[a.tipoOpiniaoSolicitada as TipoOpiniao]}
          </div>
        )}
      </Link>
    </li>
  );
}

function Kpi({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn" | "info";
}) {
  const cls =
    tone === "warn"
      ? "border-warn/40 bg-yellow-50 text-warn"
      : tone === "info"
        ? "border-accent/30 bg-accent-soft text-accent"
        : "border-border bg-bg-elev text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="font-mono text-[10px] uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="font-mono tabular text-2xl font-bold text-fg">
        {value}
      </div>
    </div>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: {
    key: string;
    nome: string;
    extra: string;
    valor: string;
    alerta?: number;
  }[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-3">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted text-center py-4">
          Sem dados ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li
              key={it.key}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg border border-border"
            >
              <span className="font-mono tabular text-[10px] text-fg-dim w-5 text-center">
                #{i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-fg truncate">
                  {it.nome}
                </div>
                <div className="text-[10px] text-fg-muted font-mono">
                  {it.valor} · {it.extra}
                </div>
              </div>
              {it.alerta && it.alerta > 0 && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-warn text-white shrink-0">
                  ⏸ {it.alerta}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
