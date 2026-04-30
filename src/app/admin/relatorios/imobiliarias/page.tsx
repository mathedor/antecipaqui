import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { RelatorioFilters } from "@/components/relatorio-filters";
import { RankingTable } from "@/components/ranking-table";
import { getImobiliariasRanking } from "@/lib/actions/reports";
import { formatBRL } from "@/lib/format";

export const metadata = {
  title: "Relatório · Ranking de imobiliárias / corretores",
};

type Search = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    cadastroStatus?: string;
    operacaoStatus?: string;
  }>;
};

export default async function RankingImobiliariasPage({
  searchParams,
}: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const rows = await getImobiliariasRanking(params);

  const totalOperado = rows.reduce((s, r) => s + r.valorOperado, 0);
  const totalPago = rows.reduce((s, r) => s + r.valorPago, 0);
  const totalAberto = rows.reduce((s, r) => s + r.valorAberto, 0);
  const totalOps = rows.reduce((s, r) => s + r.qtdOperacoes, 0);

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <Link
        href="/admin/relatorios"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← relatórios
      </Link>

      <div className="mb-6">
        <div className="eyebrow mb-2">ranking</div>
        <h1 className="text-display-md">
          Imobiliárias / corretores que mais{" "}
          <span className="text-gradient-blue">operaram</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          {rows.length} cedente(s) no resultado.
        </p>
      </div>

      <RelatorioFilters tipoCadastro="imobiliaria" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total operado" value={formatBRL(totalOperado)} highlight />
        <Stat label="Total pago" value={formatBRL(totalPago)} tone="success" />
        <Stat label="Em aberto" value={formatBRL(totalAberto)} tone="warn" />
        <Stat label="Operações" value={String(totalOps)} />
      </div>

      <RankingTable rows={rows} tipo="imobiliaria" />
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
  tone?: "default" | "success" | "warn";
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : "border-border bg-bg-elev";
  const valueColor = highlight
    ? "text-accent"
    : tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
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
    </div>
  );
}
