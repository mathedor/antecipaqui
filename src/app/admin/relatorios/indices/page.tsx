import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getIndicesData } from "@/lib/actions/reports-extra";
import { listFundosForSelector } from "@/lib/actions/fundos";
import {
  DistribuicaoValorChart,
  PorDiaSemanaChart,
  FunilChart,
  ConvitesMesChart,
  RecusasPie,
  MotivosRecusaChart,
  ValorEstatisticasChart,
  DistribuicaoSomaChart,
  MediaPorFundoChart,
  InadimplenciaMesChart,
  InadimplenciaFundoChart,
} from "@/components/indices-charts";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Admin · Índices" };

type Search = {
  searchParams: Promise<{
    fundoId?: string;
    inadPeriodo?: "30d" | "90d" | "180d" | "365d";
  }>;
};

export default async function AdminIndicesPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const fundoId = params.fundoId;
  const inadPeriodo = params.inadPeriodo ?? "90d";

  const [data, fundos] = await Promise.all([
    getIndicesData({ fundoId, inadPeriodo }),
    listFundosForSelector(),
  ]);

  const taxaRecusa =
    data.valorAvg.total + data.recusadas.total > 0
      ? (
          (data.recusadas.total /
            (data.valorAvg.total + data.recusadas.total)) *
          100
        ).toFixed(1)
      : "0";

  const funilData = [
    { name: "Submetidas", value: data.funil.submetidas, fill: "#8b95a1" },
    { name: "Aprovadas", value: data.funil.aprovadas, fill: "#1c6dd0" },
    { name: "Em pagamento", value: data.funil.pagamento, fill: "#0891b2" },
    { name: "Realizadas", value: data.funil.realizadas, fill: "#15803d" },
  ];

  const recusasPieData = [
    { name: "Recusadas", value: data.recusadas.recusadas },
    { name: "Canceladas", value: data.recusadas.canceladas },
    { name: "Aprovadas", value: data.valorAvg.total },
  ];

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">indicadores</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Índices</span> da operação
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Métricas-chave do negócio. Cada gráfico tem link pra fonte dos dados.
        </p>
      </div>

      {/* === Filtros (fundo + período de inadimplência) === */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            Fundo
          </label>
          <select name="fundoId" defaultValue={fundoId ?? ""} className="form-input">
            <option value="">Todos</option>
            {fundos.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nomeFantasia ?? f.razaoSocial}
              </option>
            ))}
            <option value="_no_fundo_">— sem fundo —</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
            Inadimplência por fundo · período
          </label>
          <select
            name="inadPeriodo"
            defaultValue={inadPeriodo}
            className="form-input"
          >
            <option value="30d">Último mês</option>
            <option value="90d">Últimos 3 meses</option>
            <option value="180d">Últimos 6 meses</option>
            <option value="365d">Último ano</option>
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary !h-12 !px-5">
            Aplicar
          </button>
          {(fundoId || inadPeriodo !== "90d") && (
            <Link
              href="/admin/relatorios/indices"
              className="text-fg-muted hover:text-fg text-sm self-center"
            >
              limpar
            </Link>
          )}
        </div>
      </form>

      {/* === KPIs topo === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Valor médio"
          value={formatBRL(data.valorAvg.media)}
          sub={`Mediana ${formatBRL(data.valorAvg.mediana)}`}
          href="/admin/operacoes"
        />
        <KpiCard
          label="Ops/dia"
          value={data.mediaDiaria.toFixed(1)}
          sub={`${data.mediaSemanal.toFixed(1)}/sem · ${data.mediaMensal.toFixed(1)}/mês`}
          href="/admin/operacoes"
        />
        <KpiCard
          label="Recusadas"
          value={`${data.recusadas.recusadas}`}
          sub={`${taxaRecusa}% taxa de recusa`}
          tone="danger"
          href="/admin/operacoes?status=recusada"
        />
        <KpiCard
          label="Convites"
          value={`${data.convites.total}`}
          sub={`${data.convites.aguardando} aguardando · ${data.convites.reivindicados} aceitos`}
          href="/admin/convites"
        />
      </div>

      {/* === KPI inadimplência === */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
        <KpiCard
          label="Inadimplência total"
          value={formatBRL(data.inadTotal.valor)}
          sub={`${data.inadTotal.qtd} parcelas vencidas/atrasadas`}
          tone="danger"
          href="/admin/relatorios/inadimplentes"
        />
        <KpiCard
          label="Fundos cadastrados"
          value={String(data.porFundo.length)}
          sub={`${data.porFundo.reduce((s, f) => s + f.qtd_operacoes, 0)} ops vinculadas`}
          href="/admin/fundos"
        />
      </div>

      {/* === Charts grid === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Valor médio + estatísticas */}
        <ChartCard
          title="Valor médio das operações"
          subtitle="Quartis (P25/Mediana/P75) + média sobre operações ativas"
          href="/admin/operacoes"
          hrefLabel="Ver todas as operações"
        >
          <ValorEstatisticasChart
            p25={data.valorAvg.p25}
            mediana={data.valorAvg.mediana}
            p75={data.valorAvg.p75}
            media={data.valorAvg.media}
          />
        </ChartCard>

        {/* Distribuição por faixa */}
        <ChartCard
          title="Distribuição por faixa de valor"
          subtitle="Quantidade de operações por faixa (BRL)"
          href="/admin/operacoes"
          hrefLabel="Ver operações"
        >
          <DistribuicaoValorChart data={data.distribuicaoValor} />
        </ChartCard>

        {/* Soma por faixa */}
        <ChartCard
          title="Volume monetário por faixa"
          subtitle="Soma do VP em cada faixa"
          href="/admin/operacoes"
          hrefLabel="Ver operações"
        >
          <DistribuicaoSomaChart data={data.distribuicaoValor} />
        </ChartCard>

        {/* Por dia da semana */}
        <ChartCard
          title="Operações por dia da semana"
          subtitle="Últimos 180 dias — radial mostra distribuição"
          href="/admin/operacoes"
          hrefLabel="Ver operações"
        >
          <PorDiaSemanaChart data={data.porDiaSemana} />
        </ChartCard>

        {/* Funil */}
        <ChartCard
          title="Funil de conversão"
          subtitle="Submetidas → Aprovadas → Pagamento → Realizadas"
          href="/admin/operacoes"
          hrefLabel="Ver operações"
        >
          <FunilChart data={funilData} />
        </ChartCard>

        {/* Pie recusas */}
        <ChartCard
          title="Recusas vs aprovações"
          subtitle="Proporção sobre todas as operações"
          href="/admin/operacoes?status=recusada"
          hrefLabel="Ver recusadas"
        >
          <RecusasPie data={recusasPieData} />
        </ChartCard>

        {/* Convites por mês */}
        <ChartCard
          title="Convites enviados por mês"
          subtitle="Linha azul = enviados, verde = aceitos pelo cedente"
          href="/admin/convites"
          hrefLabel="Ver convites"
        >
          <ConvitesMesChart data={data.convitesMes} />
        </ChartCard>

        {/* Motivos de recusa */}
        <ChartCard
          title="Top 5 motivos de recusa"
          subtitle="Texto livre que admin preencheu na recusa"
          href="/admin/operacoes?status=recusada"
          hrefLabel="Ver recusadas"
        >
          {data.motivosRecusa.length > 0 ? (
            <MotivosRecusaChart data={data.motivosRecusa} />
          ) : (
            <p className="text-sm text-fg-muted text-center py-12">
              Nenhuma operação foi recusada com motivo registrado.
            </p>
          )}
        </ChartCard>
      </div>

      {/* === Charts FUNDOS + INADIMPLÊNCIA === */}
      <div className="grid grid-cols-1 gap-5 mt-8">
        <ChartCard
          title="Média e total por fundo"
          subtitle="Comparativo de operações + valor médio + total operado por cada fundo investidor"
          href="/admin/relatorios/fundos"
          hrefLabel="Ver ranking de fundos"
        >
          {data.porFundo.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-8">
              Nenhum fundo cadastrado ainda.
            </p>
          ) : (
            <MediaPorFundoChart data={data.porFundo} />
          )}
        </ChartCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Inadimplência por mês"
            subtitle="Parcelas vencidas + a vencer com vencimento já passado · últimos 12 meses"
            href="/admin/relatorios/inadimplentes"
            hrefLabel="Ver inadimplentes"
          >
            {data.inadimplenciaMes.length === 0 ? (
              <p className="text-sm text-fg-muted text-center py-12">
                Sem inadimplência detectada nos últimos 12 meses.
              </p>
            ) : (
              <InadimplenciaMesChart data={data.inadimplenciaMes} />
            )}
          </ChartCard>

          <ChartCard
            title={`Inadimplência por fundo · ${
              inadPeriodo === "30d"
                ? "último mês"
                : inadPeriodo === "90d"
                  ? "últimos 3 meses"
                  : inadPeriodo === "180d"
                    ? "últimos 6 meses"
                    : "último ano"
            }`}
            subtitle="Use o seletor de período no topo. Barra escura = +30d de atraso."
            href={`/admin/relatorios/inadimplentes?periodo=${inadPeriodo}`}
            hrefLabel="Ver lista filtrada"
          >
            {data.inadimplenciaFundo.length === 0 ? (
              <p className="text-sm text-fg-muted text-center py-12">
                Nenhum fundo com inadimplência no período.
              </p>
            ) : (
              <InadimplenciaFundoChart data={data.inadimplenciaFundo} />
            )}
          </ChartCard>
        </div>
      </div>

      {/* === Listas: construtoras com docs faltantes + ops incompletas === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
        <section className="rounded-2xl border border-warn/30 bg-yellow-50 p-5 md:p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-warn mb-1">
                construtoras com documentos faltantes
              </div>
              <h3 className="text-lg font-bold">
                {data.construtorasMissing.length} pendente
                {data.construtorasMissing.length === 1 ? "" : "s"}
              </h3>
            </div>
            <Link
              href="/admin/construtoras?status=pendente"
              className="text-accent text-sm font-semibold hover:underline"
            >
              Ver listagem completa →
            </Link>
          </div>
          {data.construtorasMissing.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Todas as construtoras têm cadastro completo. ✓
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[300px] overflow-y-auto">
              {data.construtorasMissing.slice(0, 10).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bg-elev border border-border text-sm"
                >
                  <Link
                    href={`/admin/construtoras/${c.id}`}
                    className="font-semibold text-fg hover:text-accent truncate flex-1"
                  >
                    {c.razao_social}
                  </Link>
                  <span className="text-[10px] font-mono text-fg-dim shrink-0">
                    {!c.tem_contrato && "✕ contrato "}
                    {!c.tem_comprovante && "✕ comprovante"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent mb-3">
            operações com informações faltantes
          </div>
          <ul className="space-y-2">
            <BadgeStat
              label="Documentos incompletos"
              value={data.opsIncompletas.docs_incompletos}
              href="/admin/operacoes?status=documentos_incompletos"
            />
            <BadgeStat
              label="Rascunhos antigos (>7d)"
              value={data.opsIncompletas.rascunhos_antigos}
              href="/admin/operacoes?status=rascunho"
            />
            <BadgeStat
              label="Com pendência registrada"
              value={data.opsIncompletas.com_pendencia}
              href="/admin/operacoes"
            />
          </ul>
        </section>
      </div>
    </AdminShell>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "danger";
  href: string;
}) {
  const styles =
    tone === "danger"
      ? "border-danger/40 bg-red-50"
      : "border-border bg-bg-elev hover:border-accent";
  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 md:p-5 ${styles} transition-colors`}
    >
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${
          tone === "danger" ? "text-danger" : "text-fg-dim"
        }`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-base sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-fg leading-tight break-words">
        {value}
      </div>
      <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>
    </Link>
  );
}

function ChartCard({
  title,
  subtitle,
  href,
  hrefLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-base font-bold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        <Link
          href={href}
          className="text-accent text-xs font-semibold hover:underline whitespace-nowrap shrink-0"
        >
          {hrefLabel} →
        </Link>
      </div>
      {children}
    </section>
  );
}

function BadgeStat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-bg-elev border border-border hover:border-accent transition-colors"
      >
        <span className="text-sm text-fg">{label}</span>
        <span className="font-mono tabular text-lg font-bold text-accent">
          {value}
        </span>
      </Link>
    </li>
  );
}
