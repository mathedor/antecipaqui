import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import {
  listFaturasFundo,
  marcarFaturasVencidas,
} from "@/lib/actions/faturas-fundo";
import { formatBRL } from "@/lib/format";
import { GerarFaturasForm } from "@/components/gerar-faturas-form";
import { MarcarFaturaPagaButton } from "@/components/marcar-fatura-paga-button";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Faturas dos fundos" };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  parcial: "Parcial",
  paga: "Paga",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-yellow-50 text-warn border-warn/30",
  parcial: "bg-orange-50 text-orange-700 border-orange-300",
  paga: "bg-green-50 text-success border-success/30",
  vencida: "bg-red-50 text-danger border-danger/30",
  cancelada: "bg-bg-card text-fg-muted border-border",
};

function fmtMes(refMes: string) {
  const [ano, mes] = refMes.split("-").map(Number);
  const labels = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  return `${labels[mes - 1]}/${String(ano).slice(-2)}`;
}

function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return dt.toLocaleDateString("pt-BR");
}

export default async function AdminFaturasPage() {
  const admin = await requireAdmin();

  // Marca faturas vencidas (idempotente)
  await marcarFaturasVencidas();

  const faturas = await listFaturasFundo();

  const totals = faturas.reduce(
    (acc, f) => ({
      devido: acc.devido + f.valorDevido,
      pago: acc.pago + f.valorPago,
      pendentes: acc.pendentes + (f.status === "paga" ? 0 : f.valorDevido - f.valorPago),
    }),
    { devido: 0, pago: 0, pendentes: 0 },
  );

  return (
    <AdminShell active="/admin/faturas" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">cobrança · faturas dos fundos</div>
        <h1 className="text-display-md">
          Faturas dos <span className="text-gradient-blue">fundos</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Registro mensal de repasse devido pelos fundos. Gere a fatura do mês
          a partir do Invoice; depois marque como paga conforme o fundo for
          repassando.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-faturas" />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Faturas" value={String(faturas.length)} />
        <Stat
          label="Total faturado"
          value={formatBRL(totals.devido)}
          highlight
        />
        <Stat
          label="Recebido"
          value={formatBRL(totals.pago)}
          tone="success"
        />
        <Stat
          label="A receber"
          value={formatBRL(totals.pendentes)}
          tone="warn"
        />
      </div>

      {/* Gerar faturas */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
          gerar faturas do mês
        </div>
        <h2 className="text-lg font-bold tracking-tight mb-2">
          Emitir cobrança aos fundos
        </h2>
        <p className="text-sm text-fg-muted mb-4">
          Vai criar uma fatura por fundo que teve repasse devido no mês
          selecionado (baseado nas parcelas pagas no período). Faturas já
          pagas não são sobrescritas.
        </p>
        <GerarFaturasForm />
      </section>

      {/* Tabela */}
      {faturas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
          Nenhuma fatura emitida ainda.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-bg-card">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono text-left">
                  <th className="px-4 py-3">Fundo</th>
                  <th className="px-4 py-3">Ref.</th>
                  <th className="px-4 py-3">Emitida</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor devido</th>
                  <th className="px-4 py-3 text-right">Valor pago</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {faturas.map((f, i) => (
                  <tr
                    key={f.id}
                    className={`border-b border-border last:border-0 hover:bg-bg-card transition-colors ${
                      i % 2 === 1 ? "bg-bg/30" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-fg">
                      <Link
                        href={`/admin/fundos/${f.fundoId}`}
                        className="hover:text-accent transition-colors"
                      >
                        {f.fundoNome ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg">
                      {fmtMes(f.refMes)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      {fmtDate(f.emitidaEm)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      {fmtDate(f.vencimento)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-fg font-semibold">
                      {formatBRL(f.valorDevido)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular text-success">
                      {formatBRL(f.valorPago)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold border ${
                          STATUS_COLOR[f.status] ?? STATUS_COLOR.pendente
                        }`}
                      >
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.status !== "paga" && f.status !== "cancelada" && (
                        <MarcarFaturaPagaButton
                          faturaId={f.id}
                          valorDevido={f.valorDevido}
                          valorPagoAtual={f.valorPago}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warn"
        ? "text-warn"
        : "text-fg";
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-accent bg-accent-soft" : "border-border bg-bg-elev"
      }`}
    >
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
        {label}
      </div>
      <div className={`font-mono tabular text-2xl font-bold mt-1 ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
