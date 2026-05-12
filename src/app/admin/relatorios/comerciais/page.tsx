import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { ComerciaisRankingTable } from "@/components/comerciais-ranking-table";
import { ComerciaisRankingChart } from "@/components/comerciais-ranking-chart";
import { getDesempenhoComerciais } from "@/lib/actions/comerciais";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Admin · Desempenho de comerciais" };

type Search = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function ComerciaisRelatorioPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const rows = await getDesempenhoComerciais({
    from: params.from,
    to: params.to,
  });

  const totals = {
    operacoes: rows.reduce((s, r) => s + r.qtdOperacoes, 0),
    volume: rows.reduce((s, r) => s + r.volumeOperado, 0),
    spread: rows.reduce((s, r) => s + r.spreadTotal, 0),
    comissao: rows.reduce((s, r) => s + r.comissaoComercial, 0),
  };

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <Link
        href="/admin/relatorios"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← relatórios
      </Link>
      <div className="mb-6">
        <div className="eyebrow mb-2">desempenho</div>
        <h1 className="text-display-md">
          Desempenho de <span className="text-gradient-blue">comerciais</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Quantidade de operações, volume operado, spread (juros − custo do
          dinheiro do fundo) e comissão = 10% do lucro líquido sobre a
          metade do spread.
        </p>
      </div>

      {/* Filtros de período */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              De
            </label>
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ""}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Até
            </label>
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ""}
              className="form-input"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <button type="submit" className="btn-primary !h-10 !px-5">
            Filtrar
          </button>
          {(params.from || params.to) && (
            <Link
              href="/admin/relatorios/comerciais"
              className="text-fg-muted hover:text-fg text-sm"
            >
              limpar
            </Link>
          )}
        </div>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Comerciais" value={String(rows.length)} />
        <Stat label="Operações" value={String(totals.operacoes)} />
        <Stat label="Volume operado" value={formatBRL(totals.volume)} highlight />
        <Stat
          label="Comissão paga"
          value={formatBRL(totals.comissao)}
          tone="success"
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
          comparativo · volume e comissão por comercial
        </div>
        <p className="text-xs text-fg-muted mb-4">
          Top 12. Volume operado em azul, comissão estimada em verde.
        </p>
        <ComerciaisRankingChart
          data={rows.slice(0, 12).map((r) => ({
            nome: r.apelido ?? r.nome,
            volume: r.volumeOperado,
            comissao: r.comissaoComercial,
            qtd: r.qtdOperacoes,
          }))}
        />
      </div>

      <ComerciaisRankingTable rows={rows} />
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "success";
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : tone === "success"
      ? "border-success/40 bg-green-50"
      : "border-border bg-bg-elev";
  const valueColor = highlight
    ? "text-accent"
    : tone === "success"
      ? "text-success"
      : "text-fg";
  return (
    <div className={`rounded-2xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-base sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight leading-tight break-words ${valueColor}`}
      >
        {value}
      </div>
    </div>
  );
}
