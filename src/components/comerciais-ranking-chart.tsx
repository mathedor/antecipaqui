"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

type Row = {
  nome: string;
  volume: number;
  comissao: number;
  qtd: number;
};

export function ComerciaisRankingChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-fg-muted text-center py-8">
        Nenhum comercial com operações no período.
      </p>
    );
  }
  const formatted = data.map((d) => ({
    nome: d.nome.length > 18 ? d.nome.slice(0, 18) + "…" : d.nome,
    Volume: Math.round(d.volume),
    Comissão: Math.round(d.comissao),
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
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
        <Bar dataKey="Volume" fill="#1c6dd0" radius={[0, 4, 4, 0]} />
        <Bar dataKey="Comissão" fill="#15803d" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
