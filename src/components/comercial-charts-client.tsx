"use client";

import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

type MesData = {
  month: string;
  qtd: number;
  volume: number;
  resultado: number;
  comissao: number;
};

export function ComercialChartsClient({ porMes }: { porMes: MesData[] }) {
  const data = porMes.map((d) => ({
    label: new Date(d.month + "-01T00:00:00").toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    Operações: d.qtd,
    Volume: Math.round(d.volume),
    Comissão: Math.round(d.comissao),
  }));

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-8 text-center">
        <p className="text-fg-muted">
          Sem dados pra mostrar nos últimos 12 meses.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
          volume operado · últimos 12 meses
        </div>
        <p className="text-xs text-fg-muted mb-4">
          Soma do VP das operações sob sua responsabilidade
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
            <XAxis dataKey="label" stroke="#5a6571" fontSize={11} />
            <YAxis
              stroke="#5a6571"
              fontSize={10}
              tickFormatter={(v) => fmtBRL(Number(v))}
            />
            <Tooltip
              formatter={(v) => fmtBRL(Number(v))}
              contentStyle={{
                background: "#fff",
                border: "1px solid #e6e7e9",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="Volume" fill="#1c6dd0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
          comissão estimada · últimos 12 meses
        </div>
        <p className="text-xs text-fg-muted mb-4">
          ~10% do lucro líquido = (juros / 2 − 18% impostos) × 10%
        </p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
            <XAxis dataKey="label" stroke="#5a6571" fontSize={11} />
            <YAxis
              yAxisId="left"
              stroke="#5a6571"
              fontSize={10}
              tickFormatter={(v) => fmtBRL(Number(v))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#5a6571"
              fontSize={10}
            />
            <Tooltip
              formatter={(v, name) =>
                name === "Operações"
                  ? [Number(v), name as string]
                  : [fmtBRL(Number(v)), name as string]
              }
              contentStyle={{
                background: "#fff",
                border: "1px solid #e6e7e9",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              yAxisId="left"
              dataKey="Comissão"
              fill="#15803d"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Operações"
              stroke="#b45309"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}
