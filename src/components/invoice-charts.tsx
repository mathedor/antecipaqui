"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { InvoiceMonthly } from "@/lib/actions/invoice";

const ACCENT = "#1c6dd0";
const SUCCESS = "#15803d";
const WARN = "#b45309";

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function CustomTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  formatter: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-bg-elev shadow-lg p-3 text-xs">
      <div className="font-mono uppercase tracking-wider text-fg-dim mb-1">
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-baseline gap-2">
          <span
            className="size-2 rounded-full inline-block"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-fg-muted">{p.name}:</span>
          <span className="font-mono font-semibold text-fg">
            {formatter(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function InvoiceMonthlyCharts({
  data,
}: {
  data: InvoiceMonthly[];
}) {
  const totalSaldo = data.reduce((s, d) => s + d.saldoRepasse, 0);
  const totalOps = data.reduce((s, d) => s + d.qtdOperacoes, 0);
  const lastMonth = data[data.length - 1];
  const prevMonth = data[data.length - 2];

  const variacaoSaldo =
    prevMonth && prevMonth.saldoRepasse > 0
      ? ((lastMonth.saldoRepasse - prevMonth.saldoRepasse) /
          prevMonth.saldoRepasse) *
        100
      : null;
  const variacaoOps =
    prevMonth && prevMonth.qtdOperacoes > 0
      ? ((lastMonth.qtdOperacoes - prevMonth.qtdOperacoes) /
          prevMonth.qtdOperacoes) *
        100
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
      <ChartCard
        title="Faturamento (saldo de repasse) · 12 meses"
        subtitle={`Total: ${fmtBRL(totalSaldo)}`}
        delta={variacaoSaldo}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtBRL(v as number)}
              width={70}
            />
            <Tooltip
              cursor={{ fill: "rgba(28,109,208,0.05)" }}
              content={<CustomTooltip formatter={(n) => fmtBRL(n)} />}
            />
            <Bar
              dataKey="saldoRepasse"
              name="Saldo de repasse"
              fill={SUCCESS}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Quantidade de operações · 12 meses"
        subtitle={`Total: ${totalOps} ops`}
        delta={variacaoOps}
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={36}
            />
            <Tooltip
              cursor={{ stroke: ACCENT, strokeWidth: 1, strokeDasharray: "3 3" }}
              content={
                <CustomTooltip formatter={(n) => `${n} op${n === 1 ? "" : "s"}`} />
              }
            />
            <Line
              type="monotone"
              dataKey="qtdOperacoes"
              name="Operações"
              stroke={ACCENT}
              strokeWidth={2.5}
              dot={{ r: 3, fill: ACCENT }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Resultado vs custo do dinheiro · 12 meses"
        subtitle="Resultado da operação (juros − custos) vs custo de capital do fundo"
        full
      >
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtBRL(v as number)}
              width={70}
            />
            <Tooltip
              cursor={{ fill: "rgba(28,109,208,0.05)" }}
              content={<CustomTooltip formatter={(n) => fmtBRL(n)} />}
            />
            <Bar
              dataKey="resultado"
              name="Resultado"
              fill={SUCCESS}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="custoDinheiroFundo"
              name="Custo do dinheiro"
              fill={WARN}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  delta,
  full = false,
  children,
}: {
  title: string;
  subtitle?: string;
  delta?: number | null;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-border bg-bg-elev p-5 ${
        full ? "lg:col-span-2" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-xs text-fg-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {delta !== undefined && delta !== null && (
          <span
            className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${
              delta >= 0
                ? "bg-green-50 text-success"
                : "bg-red-50 text-danger"
            }`}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% vs mês anterior
          </span>
        )}
      </div>
      {children}
    </section>
  );
}