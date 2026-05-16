import Link from "next/link";
import type { ComercialDesempenho } from "@/lib/actions/comercial-desempenho";
import { formatBRL, formatBRLcompact } from "@/lib/format";

/** Painel de desempenho de um comercial — visão consolidada de
 *  faturamento, operação, carteira, prospecção, captação e CRM.
 *  Reusado pelo admin (/admin/comerciais/[id]/desempenho) e pelo fundo
 *  (/painel/comerciais/[id]) quando o comercial é vinculado. */
export function ComercialDesempenhoPanel({
  d,
  fundoNome,
}: {
  d: ComercialDesempenho;
  fundoNome?: string | null;
}) {
  const taxaAprov =
    d.qtdOps > 0 ? ((d.qtdOpsAprovadas / d.qtdOps) * 100).toFixed(0) : "—";
  const taxaConvLead =
    d.qtdLeads > 0 ? ((d.qtdLeadsFechados / d.qtdLeads) * 100).toFixed(0) : "—";
  const taxaContactePonto =
    d.qtdPontosMapa > 0
      ? ((d.qtdPontosContactados / d.qtdPontosMapa) * 100).toFixed(0)
      : "—";

  return (
    <div className="space-y-6">
      {/* Header / identificação */}
      <header className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
            comercial · desempenho 360
          </div>
          <h2 className="text-xl font-bold tracking-tight">{d.nome}</h2>
          <p className="text-xs text-fg-muted mt-0.5">
            <span className="font-mono">{d.email}</span>
            {d.telefone && (
              <>
                {" · "}
                <span className="font-mono">{d.telefone}</span>
              </>
            )}
          </p>
          {fundoNome && (
            <p className="mt-2 text-xs">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft text-accent">
                vinculado · {fundoNome}
              </span>
            </p>
          )}
        </div>
        {!d.isActive && (
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-red-100 text-red-700">
            INATIVO
          </span>
        )}
      </header>

      {/* === 1. FATURAMENTO === */}
      <Section title="Faturamento" subtitle="comissões e impacto financeiro">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi
            label="Comissão paga (histórico)"
            value={formatBRLcompact(d.comissaoPaga)}
            tone="success"
          />
          <Kpi
            label="A receber"
            value={formatBRLcompact(d.comissaoPendente)}
            highlight
          />
          <Kpi
            label="Pago este mês"
            value={formatBRLcompact(d.faturadoMesAtual)}
          />
          <Kpi
            label="Acumulada"
            value={formatBRLcompact(d.comissaoAcumulada)}
            sub="comissões totais geradas"
          />
          <Kpi
            label="Inadimplência carteira"
            value={formatBRLcompact(d.inadimplencia)}
            tone={d.inadimplencia > 0 ? "warn" : "default"}
            sub="parcelas vencidas das ops dele"
          />
        </div>
      </Section>

      {/* === 2. OPERAÇÕES === */}
      <Section
        title="Operações"
        subtitle="volume e qualidade do que ele trouxe"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Total" value={String(d.qtdOps)} />
          <Kpi
            label="Aprovadas"
            value={String(d.qtdOpsAprovadas)}
            sub={`taxa aprovação ${taxaAprov}%`}
            tone="success"
          />
          <Kpi label="Realizadas" value={String(d.qtdOpsRealizadas)} />
          <Kpi
            label="Recusadas"
            value={String(d.qtdOpsRecusadas)}
            tone={d.qtdOpsRecusadas > 0 ? "warn" : "default"}
          />
          <Kpi
            label="Volume VP"
            value={formatBRLcompact(d.volumePresenteTotal)}
            sub={`ticket médio ${formatBRLcompact(d.ticketMedio)}`}
          />
        </div>
      </Section>

      {/* === 3. CARTEIRA === */}
      <Section title="Carteira" subtitle="quem ele atende hoje">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Imobiliárias na carteira"
            value={String(d.qtdImobs)}
          />
          <Kpi
            label="Ativas 90 dias"
            value={String(d.qtdImobsAtivas90d)}
            tone="success"
          />
          <Kpi
            label="Dormidas (60d+)"
            value={String(d.qtdImobsDormidas)}
            tone={d.qtdImobsDormidas > 0 ? "warn" : "default"}
          />
          <Kpi
            label="Templates WA salvos"
            value={String(d.qtdTemplates)}
            sub="mensagens próprias"
          />
        </div>
      </Section>

      {/* === 4. PROSPECÇÃO === */}
      <Section
        title="Prospecção"
        subtitle="o que ele está atacando pra trazer novos"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi label="Pontos no mapa" value={String(d.qtdPontosMapa)} />
          <Kpi
            label="Contactados"
            value={String(d.qtdPontosContactados)}
            sub={`${taxaContactePonto}% dos pontos`}
          />
          <Kpi
            label="Leads ativos"
            value={String(d.qtdLeadsAtivos)}
            highlight
          />
          <Kpi
            label="Leads fechados"
            value={String(d.qtdLeadsFechados)}
            sub={`taxa ${taxaConvLead}%`}
            tone="success"
          />
          <Kpi
            label="Leads perdidos"
            value={String(d.qtdLeadsPerdidos)}
            tone={d.qtdLeadsPerdidos > 0 ? "warn" : "default"}
          />
        </div>
      </Section>

      {/* === 5. CAPTAÇÃO === */}
      <Section
        title="Captação"
        subtitle="quantos virou cliente AQ via canais dele"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi
            label="Imobs cadastradas express"
            value={String(d.qtdImobsCadastradasExpress)}
            highlight
            sub="cadastradas pelo comercial"
          />
          <Kpi
            label="Links de convite"
            value={String(d.qtdLinksConvite)}
          />
          <Kpi
            label="Cliques nos links"
            value={String(d.totalCliquesLink)}
          />
          <Kpi
            label="Conversões via link"
            value={String(d.totalConversoesLink)}
            tone="success"
            sub={`taxa ${(d.taxaConversaoLink * 100).toFixed(0)}%`}
          />
          <Kpi
            label="Followups atrasados"
            value={String(d.qtdFollowupsAtrasados)}
            tone={d.qtdFollowupsAtrasados > 0 ? "warn" : "default"}
          />
        </div>
      </Section>

      {/* === 6. ATIVIDADE CRM === */}
      <Section
        title="Atividade CRM"
        subtitle="movimento dele com a base"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi
            label="Interações registradas 30d"
            value={String(d.qtdInteracoes30d)}
            sub="visitas, ligações, WhatsApp, anotações"
          />
          <Kpi
            label="Followups vencidos"
            value={String(d.qtdFollowupsAtrasados)}
            tone={d.qtdFollowupsAtrasados > 0 ? "warn" : "default"}
          />
          <div className="rounded-2xl border border-border bg-bg p-4 flex flex-col justify-center">
            <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
              ações úteis
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/comerciais/${d.id}`}
                className="text-xs text-accent font-semibold hover:underline"
              >
                ver perfil completo →
              </Link>
              <Link
                href={`/admin/comerciais/comissoes?comercialId=${d.id}`}
                className="text-xs text-accent font-semibold hover:underline"
              >
                comissões →
              </Link>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="mb-4">
        <h3 className="font-bold tracking-tight text-base">{title}</h3>
        {subtitle && (
          <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function Kpi({
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
          : "border-border bg-bg";
  const labelCls = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-danger"
          : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-3 md:p-4 ${baseClass}`}>
      <div
        className={`font-mono text-[9px] uppercase tracking-wider mb-1 ${labelCls}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-lg md:text-xl font-bold text-fg leading-tight break-words">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-fg-muted mt-1">{sub}</div>
      )}
    </div>
  );
}

export { formatBRL };
