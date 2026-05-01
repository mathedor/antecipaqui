"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Funnel,
  FunnelChart,
  LabelList,
} from "recharts";

const COLORS = [
  "#1c6dd0",
  "#15803d",
  "#b45309",
  "#b91c1c",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

/* === Distribuição por faixa de valor (BarChart) === */
export function DistribuicaoValorChart({
  data,
}: {
  data: { faixa: string; qtd: number; soma: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis
          dataKey="faixa"
          stroke="#5a6571"
          fontSize={11}
          fontFamily="ui-monospace, SFMono-Regular"
        />
        <YAxis stroke="#5a6571" fontSize={11} />
        <Tooltip
          formatter={(v) => [v, "Operações"]}
          contentStyle={{
            background: "#fff",
            border: "1px solid #e6e7e9",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="qtd" fill="#1c6dd0" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* === Operações por dia da semana (RadialBarChart) === */
export function PorDiaSemanaChart({
  data,
}: {
  data: { dia: number; qtd: number }[];
}) {
  const formatted = data.map((d) => ({
    name: DIAS_SEMANA[d.dia],
    qtd: d.qtd,
    fill: COLORS[d.dia % COLORS.length],
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadialBarChart
        data={formatted}
        innerRadius={30}
        outerRadius={100}
        startAngle={180}
        endAngle={-180}
      >
        <RadialBar dataKey="qtd" background />
        <Legend
          iconSize={8}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          wrapperStyle={{ fontSize: 11, lineHeight: "16px" }}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e6e7e9",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  );
}

/* === Funil de conversão (FunnelChart) === */
export function FunilChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <FunnelChart>
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e6e7e9",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Funnel dataKey="value" data={data} isAnimationActive>
          <LabelList
            position="center"
            fill="#fff"
            stroke="none"
            dataKey="name"
            style={{ fontSize: 12, fontWeight: 600 }}
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

/* === Convites por mês (LineChart) === */
export function ConvitesMesChart({
  data,
}: {
  data: { month: string; qtd: number; reivindicados: number }[];
}) {
  const formatted = data.map((d) => ({
    label: new Date(d.month + "-01T00:00:00").toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    Enviados: d.qtd,
    Reivindicados: d.reivindicados,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={formatted}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis dataKey="label" stroke="#5a6571" fontSize={11} />
        <YAxis stroke="#5a6571" fontSize={11} />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e6e7e9",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="Enviados"
          stroke="#1c6dd0"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="Reivindicados"
          stroke="#15803d"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* === Recusadas vs Aprovadas (PieChart) === */
export function RecusasPie({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
          label={(e) => `${e.name}: ${e.value}`}
          labelLine={false}
          style={{ fontSize: 11 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e6e7e9",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

/* === Motivos de recusa (Horizontal Bar) === */
export function MotivosRecusaChart({
  data,
}: {
  data: { motivo: string; qtd: number }[];
}) {
  const formatted = data.map((d) => ({
    motivo: d.motivo.length > 30 ? d.motivo.slice(0, 30) + "…" : d.motivo,
    qtd: d.qtd,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis type="number" stroke="#5a6571" fontSize={11} />
        <YAxis
          dataKey="motivo"
          type="category"
          stroke="#5a6571"
          fontSize={10}
          width={100}
        />
        <Tooltip
          contentStyle={{
            background: "#fff",
            border: "1px solid #e6e7e9",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="qtd" fill="#b91c1c" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* === Box-and-whisker simulado (estatísticas de valor) === */
export function ValorEstatisticasChart({
  p25,
  mediana,
  p75,
  media,
}: {
  p25: number;
  mediana: number;
  p75: number;
  media: number;
}) {
  const data = [
    { name: "P25", valor: p25, fill: "#8b95a1" },
    { name: "Mediana", valor: mediana, fill: "#1c6dd0" },
    { name: "Média", valor: media, fill: "#15803d" },
    { name: "P75", valor: p75, fill: "#8b95a1" },
  ];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis dataKey="name" stroke="#5a6571" fontSize={11} />
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
        <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* === Média por fundo (BarChart vertical com 2 séries) === */
export function MediaPorFundoChart({
  data,
}: {
  data: {
    id: string;
    nome: string;
    taxa_base: number;
    qtd_operacoes: number;
    valor_medio: number;
    valor_total: number;
  }[];
}) {
  const formatted = data.map((d) => ({
    nome: d.nome.length > 18 ? d.nome.slice(0, 18) + "…" : d.nome,
    Operações: d.qtd_operacoes,
    "Valor médio": Math.round(d.valor_medio),
    "Total operado": Math.round(d.valor_total),
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 60)}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 100, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis
          type="number"
          stroke="#5a6571"
          fontSize={10}
          tickFormatter={(v) => fmtBRL(Number(v))}
        />
        <YAxis
          dataKey="nome"
          type="category"
          stroke="#5a6571"
          fontSize={10}
          width={100}
        />
        <Tooltip
          formatter={(v, name) =>
            name === "Operações"
              ? [Number(v), "Operações"]
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
        <Bar dataKey="Total operado" fill="#1c6dd0" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Valor médio" fill="#15803d" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* === Inadimplência por mês (LineChart) === */
export function InadimplenciaMesChart({
  data,
}: {
  data: { month: string; qtd: number; valor: number }[];
}) {
  const formatted = data.map((d) => ({
    label: new Date(d.month + "-01T00:00:00").toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    }),
    Valor: Math.round(d.valor),
    Parcelas: d.qtd,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={formatted}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis dataKey="label" stroke="#5a6571" fontSize={11} />
        <YAxis
          yAxisId="left"
          stroke="#b91c1c"
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
            name === "Parcelas"
              ? [Number(v), "Parcelas"]
              : [fmtBRL(Number(v)), "Valor inadimplente"]
          }
          contentStyle={{
            background: "#fff",
            border: "1px solid #e6e7e9",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="Valor"
          stroke="#b91c1c"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="Parcelas"
          stroke="#5a6571"
          strokeWidth={2}
          dot={{ r: 3 }}
          strokeDasharray="3 3"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/* === Inadimplência por fundo (BarChart vertical) === */
export function InadimplenciaFundoChart({
  data,
}: {
  data: {
    fundo_id: string;
    nome: string;
    qtd: number;
    valor_inadimplente: number;
    valor_30d_atraso: number;
  }[];
}) {
  const formatted = data.map((d) => ({
    nome: d.nome.length > 22 ? d.nome.slice(0, 22) + "…" : d.nome,
    Inadimplente: Math.round(d.valor_inadimplente),
    "+30d atraso": Math.round(d.valor_30d_atraso),
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 56)}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 130, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis
          type="number"
          stroke="#5a6571"
          fontSize={10}
          tickFormatter={(v) => fmtBRL(Number(v))}
        />
        <YAxis
          dataKey="nome"
          type="category"
          stroke="#5a6571"
          fontSize={10}
          width={130}
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
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Inadimplente" fill="#b91c1c" radius={[0, 4, 4, 0]} />
        <Bar dataKey="+30d atraso" fill="#7c2d12" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* === Distribuição soma por faixa (Area) === */
export function DistribuicaoSomaChart({
  data,
}: {
  data: { faixa: string; qtd: number; soma: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1c6dd0" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#1c6dd0" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e6e7e9" />
        <XAxis
          dataKey="faixa"
          stroke="#5a6571"
          fontSize={11}
          fontFamily="ui-monospace, SFMono-Regular"
        />
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
        <Area
          type="monotone"
          dataKey="soma"
          stroke="#1c6dd0"
          strokeWidth={2}
          fill="url(#grad-area)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
