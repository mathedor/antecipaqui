import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getCurrentComercial } from "@/lib/actions/comerciais";
import {
  getAtividadeCrm,
  getCohortConversao,
  getMetaHistorica,
  getPerformanceMensal,
  getProjecaoForward,
} from "@/lib/actions/comercial-relatorios";
import {
  AtividadeChart,
  CohortChart,
  MetaHistoricaChart,
  PerformanceChart,
  ProjecaoForwardChart,
} from "@/components/dashboards/comercial-relatorios-charts";
import { formatBRL, formatBRLcompact } from "@/lib/format";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function ComercialRelatoriosPage() {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  const comercial = await getCurrentComercial();
  if (!comercial) redirect("/painel");

  const [meta, projecao, performance, cohort, atividade] = await Promise.all([
    getMetaHistorica(comercial.id, 6),
    getProjecaoForward(comercial.id, 12),
    getPerformanceMensal(comercial.id, 12),
    getCohortConversao(comercial.id, 6),
    getAtividadeCrm(comercial.id, 8),
  ]);

  // KPIs sumarizados
  const totalProjetado = projecao.reduce((s, p) => s + p.valorEsperado, 0);
  const totalRealizadoUltimos6m = meta.reduce((s, m) => s + m.realComissao, 0);
  const totalAprovadas12m = performance.reduce((s, p) => s + p.qtdOps, 0);
  const totalAtividade = atividade.reduce((s, a) => s + a.total, 0);

  return (
    <PainelShell
      role="comercial"
      userName={user.nome}
      active="/painel/relatorios"
    >
      <div className="mb-8">
        <div className="eyebrow mb-2">relatórios · comercial</div>
        <h1 className="text-display-md">
          Performance da sua{" "}
          <span className="text-gradient-blue">carteira</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Meta histórica, projeção de comissão e saúde do funil. Os números
          atualizam em tempo real — toda operação que entra na sua carteira
          recalcula tudo.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-relatorios-comercial" />
        </div>
      </div>

      {/* === Summary KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Comissão projetada 12m"
          value={formatBRLcompact(totalProjetado)}
          sub="próximas parcelas pendentes"
          highlight
        />
        <KpiCard
          label="Comissão realizada 6m"
          value={formatBRLcompact(totalRealizadoUltimos6m)}
          sub="histórico recente"
        />
        <KpiCard
          label="Ops aprovadas 12m"
          value={String(totalAprovadas12m)}
          sub="da sua carteira"
        />
        <KpiCard
          label="Contatos CRM 8 sem"
          value={String(totalAtividade)}
          sub={`média ${(totalAtividade / 8).toFixed(1)}/sem`}
        />
      </div>

      {/* === Meta histórica === */}
      <Section
        title="Meta vs Realizado"
        subtitle="Meta automática = 120% do mês anterior. Verde = bateu, azul = não bateu, cinza = meta."
      >
        <MetaHistoricaChart data={meta} />
        {meta.length > 0 && <MetaTable data={meta} />}
      </Section>

      {/* === Projeção forward === */}
      <Section
        title="Projeção de comissão · 12 meses"
        subtitle="Comissão a receber proporcional a cada parcela das operações ativas da sua carteira."
      >
        <ProjecaoForwardChart data={projecao} />
      </Section>

      {/* === Performance carteira === */}
      <Section
        title="Performance mensal"
        subtitle="Volume operado pela sua carteira e ticket médio das operações aprovadas."
      >
        <PerformanceChart data={performance} />
      </Section>

      {/* === Cohort de conversão === */}
      <Section
        title="Funil cohort"
        subtitle="De cada mês de cadastro de imobiliária na sua carteira, quantas operaram em 30/60/90 dias."
      >
        <CohortChart data={cohort} />
        {cohort.length > 0 && <CohortTable data={cohort} />}
      </Section>

      {/* === Atividade CRM === */}
      <Section
        title="Atividade de CRM"
        subtitle="Contatos registrados (visitas, ligações, WhatsApp, anotações) por semana."
      >
        <AtividadeChart data={atividade} />
      </Section>
    </PainelShell>
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
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs text-fg-muted mt-1 max-w-2xl">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 md:p-5 ${
        highlight ? "border-accent bg-accent-soft" : "border-border bg-bg-elev"
      }`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${
          highlight ? "text-accent" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-lg md:text-xl xl:text-2xl font-bold text-fg leading-tight break-words">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>
      )}
    </div>
  );
}

function MetaTable({
  data,
}: {
  data: Array<{
    label: string;
    realComissao: number;
    metaComissao: number;
    bateu: boolean;
    pctComissao: number;
  }>;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm table-cards">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
            <th className="py-2 pr-3">Mês</th>
            <th className="py-2 pr-3 text-right">Meta</th>
            <th className="py-2 pr-3 text-right">Realizado</th>
            <th className="py-2 pr-3 text-right">%</th>
            <th className="py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 font-mono text-fg-muted">{d.label}</td>
              <td className="py-2 pr-3 text-right font-mono tabular text-fg-muted">
                {formatBRL(d.metaComissao)}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular text-fg font-semibold">
                {formatBRL(d.realComissao)}
              </td>
              <td
                className={`py-2 pr-3 text-right font-mono tabular font-semibold ${
                  d.pctComissao >= 1
                    ? "text-success"
                    : d.pctComissao >= 0.7
                      ? "text-fg"
                      : "text-warn"
                }`}
              >
                {(d.pctComissao * 100).toFixed(0)}%
              </td>
              <td className="py-2 text-center">
                {d.bateu ? (
                  <span className="text-xs font-mono font-semibold text-success">
                    ✓ bateu
                  </span>
                ) : (
                  <span className="text-xs font-mono text-fg-dim">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CohortTable({
  data,
}: {
  data: Array<{
    label: string;
    cadastradas: number;
    operaram30d: number;
    operaram60d: number;
    operaram90d: number;
    taxaConversao90d: number;
  }>;
}) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-sm table-cards">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border">
            <th className="py-2 pr-3">Mês cadastro</th>
            <th className="py-2 pr-3 text-right">Cadastradas</th>
            <th className="py-2 pr-3 text-right">Em 30d</th>
            <th className="py-2 pr-3 text-right">Em 60d</th>
            <th className="py-2 pr-3 text-right">Em 90d</th>
            <th className="py-2 pr-3 text-right">Conv 90d</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 font-mono text-fg-muted">{d.label}</td>
              <td className="py-2 pr-3 text-right font-mono tabular text-fg">
                {d.cadastradas}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular text-success">
                {d.operaram30d}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular text-fg">
                {d.operaram60d}
              </td>
              <td className="py-2 pr-3 text-right font-mono tabular text-fg">
                {d.operaram90d}
              </td>
              <td
                className={`py-2 pr-3 text-right font-mono tabular font-semibold ${
                  d.taxaConversao90d >= 0.5
                    ? "text-success"
                    : d.taxaConversao90d >= 0.25
                      ? "text-fg"
                      : "text-warn"
                }`}
              >
                {(d.taxaConversao90d * 100).toFixed(0)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
