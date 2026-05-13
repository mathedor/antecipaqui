import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getExtratoConstrutora } from "@/lib/actions/construtora-operacional";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Extrato" };

function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("pt-BR");
}

const TIPO_BADGE: Record<
  "parcela_paga" | "parcela_a_vencer" | "parcela_vencida",
  { bg: string; label: string }
> = {
  parcela_paga: { bg: "bg-green-50 text-success", label: "Paga" },
  parcela_a_vencer: { bg: "bg-bg-card text-fg-muted", label: "A vencer" },
  parcela_vencida: { bg: "bg-red-50 text-danger", label: "Vencida" },
};

type Search = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function ExtratoPage({ searchParams }: Search) {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");

  const sp = await searchParams;
  const data = await getExtratoConstrutora({
    from: sp.from || undefined,
    to: sp.to || undefined,
  });

  const exportQs = new URLSearchParams();
  if (sp.from) exportQs.set("from", sp.from);
  if (sp.to) exportQs.set("to", sp.to);
  const qsSuffix = exportQs.toString() ? `?${exportQs.toString()}` : "";

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/extrato"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">extrato</div>
        <h1 className="text-display-md">
          Extrato <span className="text-gradient-blue">financeiro</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Todas as parcelas (pagas, a vencer, vencidas) com totais por período.
          Exporta pra contabilidade em CSV ou PDF.
        </p>
      </div>

      <form
        method="get"
        action="/painel/extrato"
        className="mb-6 rounded-2xl border border-border bg-bg-elev p-4 grid grid-cols-12 gap-3 items-end"
      >
        <div className="col-span-12 md:col-span-4">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            De
          </label>
          <input
            type="date"
            name="from"
            defaultValue={sp.from ?? ""}
            className="form-input"
          />
        </div>
        <div className="col-span-12 md:col-span-4">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Até
          </label>
          <input
            type="date"
            name="to"
            defaultValue={sp.to ?? ""}
            className="form-input"
          />
        </div>
        <button
          type="submit"
          className="col-span-12 md:col-span-2 h-10 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
        >
          Filtrar
        </button>
        <a
          href={`/api/construtora/extrato/csv${qsSuffix}`}
          className="col-span-12 md:col-span-2 h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold text-fg hover:border-accent hover:text-accent"
        >
          📊 CSV
        </a>
      </form>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Pago" value={formatBRL(data.totais.pago)} tone="success" />
        <Stat label="A vencer" value={formatBRL(data.totais.aberto)} />
        <Stat label="Vencido" value={formatBRL(data.totais.vencido)} tone="warn" />
      </div>

      {data.linhas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
          Nenhuma parcela nesse período.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-bg-elev">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bg-card border-b border-border text-left">
                <Th>Data</Th>
                <Th>Status</Th>
                <Th>Operação</Th>
                <Th>Parcela</Th>
                <Th right>Valor</Th>
                <Th right>Pago</Th>
              </tr>
            </thead>
            <tbody>
              {data.linhas.map((l, i) => {
                const badge = TIPO_BADGE[l.tipo];
                return (
                  <tr
                    key={i}
                    className="border-b border-border hover:bg-bg-card"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {formatDate(l.data)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono">{l.operacaoNumero}</td>
                    <td className="px-3 py-2 font-mono">{l.parcelaNumero}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatBRL(l.valor)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-success">
                      {l.valorPago !== null ? formatBRL(l.valorPago) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warn";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-danger"
        : "text-fg";
  return (
    <div className="rounded-2xl border border-border bg-bg-elev p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold tracking-tight ${cls}`}>{value}</div>
    </div>
  );
}

function Th({
  children,
  right = false,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-3 py-2.5 font-mono text-[10px] uppercase tracking-wider text-fg-dim ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
