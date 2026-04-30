"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AdminPoint = {
  month: string;
  label: string;
  operacoes: number;
  lucro: number;
  valorAntecipado: number;
  valorComissao: number;
};

type ConstrutoraPoint = {
  month: string;
  label: string;
  operacoes: number;
  valorAntecipado: number;
  valorComissao: number;
};

const fmtBRLcompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
};

const fmtBRLfull = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);

/* ============================================================
   Tooltip custom — limpo e legível
   ============================================================ */
function MoneyTooltip({
  active,
  payload,
  label,
  prefix = "",
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  prefix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-elev shadow-xl px-3 py-2 text-xs">
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
        {prefix}
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ background: p.color ?? "var(--accent)" }}
          />
          <span className="text-fg-muted">{p.name ?? ""}</span>
          <span className="font-mono tabular text-fg font-semibold ml-auto">
            {typeof p.value === "number"
              ? p.value > 100
                ? fmtBRLfull(p.value)
                : p.value.toString()
              : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function CountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-elev shadow-xl px-3 py-2 text-xs">
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ background: payload[0].color ?? "var(--accent)" }}
        />
        <span className="text-fg font-semibold tabular font-mono">
          {payload[0].value} operação{payload[0].value === 1 ? "" : "ões"}
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Wrapper card pra cada gráfico
   ============================================================ */
function ChartCard({
  title,
  subtitle,
  total,
  children,
  highlight = false,
}: {
  title: string;
  subtitle?: string;
  total?: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 md:p-6 ${
        highlight
          ? "border-accent/30 bg-accent-soft"
          : "border-border bg-bg-elev"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div
            className={`font-mono text-[10px] uppercase tracking-[0.2em] mb-1 ${
              highlight ? "text-accent" : "text-fg-dim"
            }`}
          >
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-fg-muted">{subtitle}</div>
          )}
        </div>
        {total && (
          <div className="font-mono tabular text-base sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight leading-tight break-words text-fg">
            {total}
          </div>
        )}
      </div>
      <div className="h-56 md:h-64 -ml-2">{children}</div>
    </section>
  );
}

/* ============================================================
   ADMIN — 2 gráficos: lucro mensal (área) + operações (barras)
   ============================================================ */
export function AdminCharts({ data }: { data: AdminPoint[] }) {
  const lucroTotal = data.reduce((s, d) => s + d.lucro, 0);
  const lucroAtual = data[data.length - 1]?.lucro ?? 0;
  const lucroAnterior = data[data.length - 2]?.lucro ?? 0;
  const variacaoLucro =
    lucroAnterior > 0
      ? ((lucroAtual - lucroAnterior) / lucroAnterior) * 100
      : null;

  const opsTotal = data.reduce((s, d) => s + d.operacoes, 0);
  const opsAtual = data[data.length - 1]?.operacoes ?? 0;

  const valorAntecipadoTotal = data.reduce(
    (s, d) => s + d.valorAntecipado,
    0,
  );

  return (
    <div className="space-y-5">
      {/* Stat strip de fechamento mensal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat
          label="Lucro este mês"
          value={fmtBRLcompact(lucroAtual)}
          extra={
            variacaoLucro !== null
              ? `${variacaoLucro >= 0 ? "+" : ""}${variacaoLucro.toFixed(0)}% vs mês ant.`
              : undefined
          }
          tone={variacaoLucro !== null && variacaoLucro >= 0 ? "success" : "warn"}
          highlight
        />
        <Stat
          label="Lucro 12 meses"
          value={fmtBRLcompact(lucroTotal)}
        />
        <Stat
          label="Operações este mês"
          value={String(opsAtual)}
          extra={`${opsTotal} no ano`}
        />
        <Stat
          label="Antecipado 12m"
          value={fmtBRLcompact(valorAntecipadoTotal)}
          extra="já creditado"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Lucro mensal */}
        <ChartCard
          title="lucro mensal · deságio"
          subtitle="Últimos 12 meses"
          total={fmtBRLcompact(lucroTotal)}
          highlight
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="var(--fg-dim)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--fg-dim)"
                fontSize={10}
                tickFormatter={fmtBRLcompact}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<MoneyTooltip prefix="" />} />
              <Area
                type="monotone"
                dataKey="lucro"
                name="Lucro"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#gradLucro)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Operações mensais */}
        <ChartCard
          title="operações por mês"
          subtitle="Volume de operações (excluindo recusadas/canceladas)"
          total={String(opsTotal)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                stroke="var(--fg-dim)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--fg-dim)"
                fontSize={10}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CountTooltip />} cursor={{ fill: "var(--bg-card)" }} />
              <Bar
                dataKey="operacoes"
                name="Operações"
                fill="var(--accent)"
                radius={[6, 6, 0, 0]}
                maxBarSize={42}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

/* ============================================================
   CONSTRUTORA — operações + valor antecipado (12 meses)
   ============================================================ */
export function ConstrutoraCharts({ data }: { data: ConstrutoraPoint[] }) {
  const opsTotal = data.reduce((s, d) => s + d.operacoes, 0);
  const opsAtual = data[data.length - 1]?.operacoes ?? 0;
  const antecipadoTotal = data.reduce((s, d) => s + d.valorAntecipado, 0);
  const antecipadoAtual = data[data.length - 1]?.valorAntecipado ?? 0;

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <ChartCard
        title="operações por mês"
        subtitle="Operações vinculadas a você (12 meses)"
        total={String(opsTotal)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="var(--fg-dim)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--fg-dim)"
              fontSize={10}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip content={<CountTooltip />} cursor={{ fill: "var(--bg-card)" }} />
            <Bar
              dataKey="operacoes"
              name="Operações"
              fill="var(--accent)"
              radius={[6, 6, 0, 0]}
              maxBarSize={42}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-fg-muted">Este mês</span>
          <span className="font-mono tabular font-semibold text-fg">
            {opsAtual} operação{opsAtual === 1 ? "" : "ões"}
          </span>
        </div>
      </ChartCard>

      <ChartCard
        title="valores antecipados · mês"
        subtitle="O que a Antecipaqui creditou aos cedentes"
        total={fmtBRLcompact(antecipadoTotal)}
        highlight
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradAntecip" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="var(--fg-dim)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--fg-dim)"
              fontSize={10}
              tickFormatter={fmtBRLcompact}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<MoneyTooltip />} />
            <Area
              type="monotone"
              dataKey="valorAntecipado"
              name="Valor antecipado"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#gradAntecip)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-fg-muted">Este mês</span>
          <span className="font-mono tabular font-semibold text-fg">
            {fmtBRLfull(antecipadoAtual)}
          </span>
        </div>
      </ChartCard>
    </div>
  );
}

/* ============================================================
   USER ADMIN VIEW — operações + valores antecipados (12 meses)
   ============================================================ */
export function UserCharts({
  data,
}: {
  data: Array<{
    month: string;
    label: string;
    operacoes: number;
    lucro: number;
    valorAntecipado: number;
    valorComissao: number;
  }>;
}) {
  const opsTotal = data.reduce((s, d) => s + d.operacoes, 0);
  const opsAtual = data[data.length - 1]?.operacoes ?? 0;
  const antecipadoTotal = data.reduce((s, d) => s + d.valorAntecipado, 0);
  const antecipadoAtual = data[data.length - 1]?.valorAntecipado ?? 0;

  if (opsTotal === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-8 text-center">
        <p className="text-sm text-fg-muted">
          Sem operações nos últimos 12 meses pra montar gráficos.
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <ChartCard
        title="operações por mês"
        subtitle="Volume mensal — últimos 12 meses"
        total={String(opsTotal)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="var(--fg-dim)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--fg-dim)"
              fontSize={10}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip content={<CountTooltip />} cursor={{ fill: "var(--bg-card)" }} />
            <Bar
              dataKey="operacoes"
              name="Operações"
              fill="var(--accent)"
              radius={[6, 6, 0, 0]}
              maxBarSize={42}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-fg-muted">Este mês</span>
          <span className="font-mono tabular font-semibold text-fg">
            {opsAtual} operação{opsAtual === 1 ? "" : "ões"}
          </span>
        </div>
      </ChartCard>

      <ChartCard
        title="valores antecipados · mês"
        subtitle="Total creditado ao cedente nos últimos 12 meses"
        total={fmtBRLcompact(antecipadoTotal)}
        highlight
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 8, left: 8, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gradUserAntecip" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              stroke="var(--fg-dim)"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--fg-dim)"
              fontSize={10}
              tickFormatter={fmtBRLcompact}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            <Tooltip content={<MoneyTooltip />} />
            <Area
              type="monotone"
              dataKey="valorAntecipado"
              name="Valor antecipado"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#gradUserAntecip)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 flex justify-between text-xs">
          <span className="text-fg-muted">Este mês</span>
          <span className="font-mono tabular font-semibold text-fg">
            {fmtBRLfull(antecipadoAtual)}
          </span>
        </div>
      </ChartCard>
    </div>
  );
}

/* ============================================================
   Stat card (compartilhado)
   ============================================================ */
function Stat({
  label,
  value,
  extra,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  extra?: string;
  tone?: "default" | "success" | "warn";
  highlight?: boolean;
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : "border-border bg-bg-elev";
  const valueColor = highlight ? "text-accent" : "text-fg";
  const extraColor =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg-muted";
  return (
    <div className={`rounded-2xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-xl md:text-2xl font-bold tracking-tight ${valueColor}`}
      >
        {value}
      </div>
      {extra && (
        <div className={`text-[11px] mt-1 font-mono ${extraColor}`}>{extra}</div>
      )}
    </div>
  );
}
