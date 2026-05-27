import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getFundoFaturas } from "@/lib/actions/fundo-caixa";
import { formatBRL } from "@/lib/format";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Faturas · Painel do fundo" };
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

export default async function FundoFaturasPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "fundo") redirect("/painel");

  const data = await getFundoFaturas();
  if (!data) {
    return (
      <PainelShell role="fundo" userName={user.nome} active="/painel/faturas">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Fundo não vinculado
          </h1>
        </div>
      </PainelShell>
    );
  }

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/faturas">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo · cobrança</div>
        <h1 className="text-display-md">
          Faturas a <span className="text-gradient-blue">repassar</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Cobranças mensais da Antecipaqui pelo seu fundo. O valor de cada
          fatura corresponde ao que sua margem operacional gerou no mês —{" "}
          <strong>custos + 50% do spread</strong> de cada operação,
          proporcional ao que foi pago naquele período.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-faturas-fundo" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <KpiCard
          label="Faturas emitidas"
          value={String(data.faturas.length)}
        />
        <KpiCard
          label="Total devido"
          value={formatBRL(data.totals.devido)}
          highlight
        />
        <KpiCard
          label="A pagar"
          value={formatBRL(data.totals.aPagar)}
          tone={data.totals.aPagar > 0 ? "warn" : "default"}
        />
      </div>

      {data.faturas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-fg-muted">
          Nenhuma fatura emitida ainda. Elas são geradas mensalmente pela AQ
          conforme parcelas das suas operações entram.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-cards">
              <thead className="border-b border-border bg-bg-card">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono text-left">
                  <th className="px-4 py-3">Mês ref.</th>
                  <th className="px-4 py-3">Emitida</th>
                  <th className="px-4 py-3">Vencimento</th>
                  <th className="px-4 py-3 text-right">Valor devido</th>
                  <th className="px-4 py-3 text-right">Valor pago</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.faturas.map((f, i) => (
                  <tr
                    key={f.id}
                    className={`border-b border-border last:border-0 ${
                      i % 2 === 1 ? "bg-bg/30" : ""
                    } ${f.status === "vencida" ? "bg-red-50/50" : ""}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-fg">
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
                          STATUS_COLOR[f.status]
                        }`}
                      >
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-fg-muted">
        <Link href="/painel" className="text-accent hover:underline">
          ← voltar ao painel
        </Link>
        {" · "}
        Para registrar pagamento ou contestar uma fatura, fale com o admin
        via{" "}
        <Link href="/painel/suporte" className="text-accent hover:underline">
          chat de suporte
        </Link>
        .
      </p>
    </PainelShell>
  );
}

function KpiCard({
  label,
  value,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "default" | "warn";
}) {
  const cls = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : "border-border bg-bg-elev";
  const labelCls = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${cls}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${labelCls}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-xl md:text-2xl font-bold tracking-tight text-fg">
        {value}
      </div>
    </div>
  );
}
