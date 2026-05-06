import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { DailyTable } from "@/components/daily-table";
import { getDailyParcelas } from "@/lib/actions/daily";
import { getCurrentComercial } from "@/lib/actions/comerciais";
import { getCurrentFundo } from "@/lib/actions/fundos";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Daily" };

const PERIODOS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "3m", label: "3 meses" },
  { value: "custom", label: "Personalizado" },
];

const STATUS = [
  { value: "", label: "Todas (em aberto)" },
  { value: "atrasadas", label: "Apenas atrasadas" },
  { value: "a_vencer", label: "Apenas a vencer" },
];

type Search = {
  searchParams: Promise<{
    periodo?: string;
    from?: string;
    to?: string;
    status?: string;
  }>;
};

export default async function PainelDailyPage({ searchParams }: Search) {
  const user = await requireActiveUser();
  if (user.role !== "comercial" && user.role !== "fundo")
    redirect("/painel");

  const params = await searchParams;
  const periodo = params.periodo ?? "mes";

  let dailyFilter: {
    comercialId?: string;
    fundoId?: string;
  } = {};

  if (user.role === "comercial") {
    const comercial = await getCurrentComercial();
    if (!comercial) redirect("/painel");
    dailyFilter = { comercialId: comercial.id };
  } else {
    const fundo = await getCurrentFundo();
    if (!fundo) redirect("/painel");
    dailyFilter = { fundoId: fundo.id };
  }

  const rows = await getDailyParcelas({
    periodo,
    from: params.from,
    to: params.to,
    status: params.status,
    ...dailyFilter,
    skipAuthCheck: true,
  });

  const totalParcelas = rows.length;
  const totalAtrasadas = rows.filter((r) => r.diasAtraso > 0).length;
  const valorAtrasado = rows
    .filter((r) => r.diasAtraso > 0)
    .reduce((s, r) => s + r.valorAtual, 0);
  const valorTotalAtual = rows.reduce((s, r) => s + r.valorAtual, 0);

  return (
    <PainelShell
      role={user.role === "fundo" ? "fundo" : "comercial"}
      userName={user.nome}
      active="/painel/daily"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">acompanhamento</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Daily</span> · suas operações
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          {user.role === "fundo"
            ? "Parcelas em aberto das operações do seu fundo. Use os botões pra notificar via WhatsApp/email e gerar boletos."
            : "Parcelas em aberto das operações sob sua responsabilidade. Cálculo automático de encargos (multa 2% + juros mora pela taxa × dias)."}
        </p>
      </div>

      {/* Período preset */}
      <div className="mb-4">
        <span className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
          Período
        </span>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => {
            const qs = new URLSearchParams();
            qs.set("periodo", p.value);
            if (params.status) qs.set("status", params.status);
            if (p.value === "custom") {
              if (params.from) qs.set("from", params.from);
              if (params.to) qs.set("to", params.to);
            }
            return (
              <Link
                key={p.value}
                href={`/painel/daily?${qs.toString()}`}
                className={`chip transition-colors hover:border-accent ${
                  periodo === p.value ? "chip-accent" : ""
                }`}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Demais filtros */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 mb-4"
      >
        <input type="hidden" name="periodo" value={periodo} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {periodo === "custom" && (
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
                Vencimento (de · até)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  name="from"
                  defaultValue={params.from ?? ""}
                  className="form-input min-w-0 flex-1"
                />
                <input
                  type="date"
                  name="to"
                  defaultValue={params.to ?? ""}
                  className="form-input min-w-0 flex-1"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Status
            </label>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="form-input"
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <button type="submit" className="btn-primary !h-10 !px-5">
            Aplicar filtros
          </button>
          <Link
            href="/painel/daily"
            className="text-fg-muted hover:text-fg text-sm"
          >
            limpar
          </Link>
        </div>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Parcelas no resultado"
          value={String(totalParcelas)}
          sub={`${rows.filter((r) => r.diasAtraso <= 0).length} a vencer`}
        />
        <Stat
          label="Atrasadas"
          value={String(totalAtrasadas)}
          tone="danger"
        />
        <Stat
          label="Valor atualizado · atrasadas"
          value={formatBRL(valorAtrasado)}
          tone="warn"
        />
        <Stat
          label="Valor atualizado · total"
          value={formatBRL(valorTotalAtual)}
          highlight
        />
      </div>

      <DailyTable
        rows={rows}
        viewerRole={user.role === "fundo" ? "fundo" : "admin"}
      />
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
  highlight = false,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warn" | "danger";
  highlight?: boolean;
}) {
  const baseClass = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "danger"
        ? "border-danger/40 bg-red-50"
        : "border-border bg-bg-elev";
  const valueColor = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
      : tone === "danger"
        ? "text-danger"
        : "text-fg";
  return (
    <div className={`rounded-2xl border p-4 ${baseClass}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1">
        {label}
      </div>
      <div
        className={`font-mono tabular text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold tracking-tight leading-tight break-words ${valueColor}`}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] md:text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
