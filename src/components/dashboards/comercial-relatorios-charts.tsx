"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtBRLk(v: number) {
  if (Math.abs(v) >= 1000)
    return `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return fmtBRL(v);
}

/* ============================================================
   META HISTÓRICA — barras lado a lado (meta vs realizado)
   ============================================================ */

export type MetaPonto = {
  label: string;
  realComissao: number;
  metaComissao: number;
  bateu: boolean;
  pctComissao: number;
};

export function MetaHistoricaChart({ data }: { data: MetaPonto[] }) {
  if (data.length === 0)
    return <EmptyChart text="Sem dados de meta histórica ainda." />;

  const bateuCount = data.filter((d) => d.bateu).length;
  const mediaPct =
    data.reduce((s, d) => s + d.pctComissao, 0) / Math.max(1, data.length);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap text-xs">
        <span className="font-mono text-fg-dim uppercase tracking-wider">
          meta = 120% do mês anterior · realizado em barras coloridas
        </span>
        <span className="text-fg-muted">
          Bateu meta:{" "}
          <strong className="text-fg">
            {bateuCount}/{data.length}
          </strong>{" "}
          meses · pct médio:{" "}
          <strong className="text-fg">
            {(mediaPct * 100).toFixed(0)}%
          </strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmtBRLk(Number(v))}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            formatter={(v) => fmtBRL(Number(v))}
            labelStyle={{ color: "#111" }}
          />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            height={28}
          />
          <Bar
            dataKey="metaComissao"
            name="Meta"
            fill="rgba(120,120,120,.25)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="realComissao"
            name="Realizado"
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.bateu ? "#16a34a" : "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   PROJEÇÃO FORWARD — linha + área (próximos meses)
   ============================================================ */

export type ProjecaoPonto = {
  label: string;
  valorEsperado: number;
  qtdOps: number;
};

export function ProjecaoForwardChart({ data }: { data: ProjecaoPonto[] }) {
  if (data.length === 0)
    return <EmptyChart text="Sem comissões projetadas pros próximos meses." />;

  const total = data.reduce((s, d) => s + d.valorEsperado, 0);
  const max = Math.max(...data.map((d) => d.valorEsperado), 1);
  const peak = data.find((d) => d.valorEsperado === max);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap text-xs">
        <span className="font-mono text-fg-dim uppercase tracking-wider">
          comissão esperada · proporcional a cada parcela
        </span>
        <span className="text-fg-muted">
          Total 12m: <strong className="text-fg">{fmtBRL(total)}</strong> · pico:{" "}
          <strong className="text-fg">{peak?.label}</strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => fmtBRLk(Number(v))}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "Comissão esperada"
                ? fmtBRL(Number(value))
                : String(value)
            }
          />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            height={28}
          />
          <Bar
            yAxisId="left"
            dataKey="valorEsperado"
            name="Comissão esperada"
            fill="rgba(59,130,246,.85)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="qtdOps"
            name="Operações ativas"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   PERFORMANCE MENSAL — volume + ticket médio (composed)
   ============================================================ */

export type PerformancePonto = {
  label: string;
  qtdOps: number;
  valorTotal: number;
  ticketMedio: number;
  comissao: number;
  taxaAprovacao: number;
};

export function PerformanceChart({ data }: { data: PerformancePonto[] }) {
  if (data.length === 0)
    return <EmptyChart text="Sem performance histórica ainda." />;

  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-3">
        volume operado (barras) + ticket médio (linha)
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 10, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => fmtBRLk(Number(v))}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(v) => fmtBRLk(Number(v))}
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip formatter={(v) => fmtBRL(Number(v))} />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            height={28}
          />
          <Bar
            yAxisId="left"
            dataKey="valorTotal"
            name="Volume total"
            fill="rgba(59,130,246,.85)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ticketMedio"
            name="Ticket médio"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   FUNIL COHORT — barras stack (cadastradas, 30d, 60d, 90d)
   ============================================================ */

export type CohortPonto = {
  label: string;
  cadastradas: number;
  operaram30d: number;
  operaram60d: number;
  operaram90d: number;
  taxaConversao90d: number;
};

export function CohortChart({ data }: { data: CohortPonto[] }) {
  if (data.length === 0)
    return <EmptyChart text="Sem cohorts de cadastro nos últimos meses." />;

  const totalCadastradas = data.reduce((s, d) => s + d.cadastradas, 0);
  const total90d = data.reduce((s, d) => s + d.operaram90d, 0);
  const convAgregada =
    totalCadastradas > 0 ? total90d / totalCadastradas : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap text-xs">
        <span className="font-mono text-fg-dim uppercase tracking-wider">
          de cada mês cadastrado, quantas operaram em 30/60/90d
        </span>
        <span className="text-fg-muted">
          Conversão agregada 90d:{" "}
          <strong className="text-fg">
            {(convAgregada * 100).toFixed(0)}%
          </strong>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            height={28}
          />
          <Bar
            dataKey="cadastradas"
            name="Cadastradas"
            fill="rgba(120,120,120,.4)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="operaram90d"
            name="Operaram em 90d"
            fill="rgba(59,130,246,.85)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="operaram30d"
            name="Operaram em 30d"
            fill="#16a34a"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   ATIVIDADE CRM — stack de visitas, ligações, whatsapp por semana
   ============================================================ */

export type AtividadePonto = {
  label: string;
  visitas: number;
  ligacoes: number;
  whatsapps: number;
  outras: number;
  total: number;
};

export function AtividadeChart({ data }: { data: AtividadePonto[] }) {
  if (data.length === 0)
    return <EmptyChart text="Sem registros de CRM ainda. Comece a registrar contatos pra ver evolução." />;

  const total = data.reduce((s, d) => s + d.total, 0);
  const mediaSemanal = total / Math.max(1, data.length);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap text-xs">
        <span className="font-mono text-fg-dim uppercase tracking-wider">
          contatos registrados por semana (visita, ligação, whatsapp, outras)
        </span>
        <span className="text-fg-muted">
          Total {data.length} semanas:{" "}
          <strong className="text-fg">{total}</strong> · média{" "}
          <strong className="text-fg">{mediaSemanal.toFixed(1)}</strong>/sem
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(0,0,0,.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip />
          <Legend
            verticalAlign="top"
            iconType="circle"
            iconSize={8}
            height={28}
          />
          <Bar
            dataKey="visitas"
            stackId="a"
            name="Visitas"
            fill="#16a34a"
          />
          <Bar
            dataKey="ligacoes"
            stackId="a"
            name="Ligações"
            fill="#3b82f6"
          />
          <Bar
            dataKey="whatsapps"
            stackId="a"
            name="WhatsApp"
            fill="#22c55e"
          />
          <Bar
            dataKey="outras"
            stackId="a"
            name="Outras"
            fill="#94a3b8"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
   HELPERS
   ============================================================ */

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-[200px] flex items-center justify-center text-sm text-fg-muted text-center px-4">
      {text}
    </div>
  );
}
