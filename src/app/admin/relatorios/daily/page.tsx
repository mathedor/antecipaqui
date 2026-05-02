import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { construtoras, imobiliarias } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { DailyTable } from "@/components/daily-table";
import { getDailyParcelas } from "@/lib/actions/daily";
import { listFundosForSelector } from "@/lib/actions/fundos";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Admin · Daily" };

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
    fundoId?: string;
    construtoraId?: string;
    imobiliariaId?: string;
  }>;
};

export default async function AdminDailyPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const periodo = params.periodo ?? "mes";

  const [rows, fundos, construtorasList, imobsList] = await Promise.all([
    getDailyParcelas({
      periodo,
      from: params.from,
      to: params.to,
      status: params.status,
      fundoId: params.fundoId,
      construtoraId: params.construtoraId,
      imobiliariaId: params.imobiliariaId,
    }),
    listFundosForSelector(),
    db
      .select({
        id: construtoras.id,
        razaoSocial: construtoras.razaoSocial,
        nomeFantasia: construtoras.nomeFantasia,
      })
      .from(construtoras)
      .where(eq(construtoras.isActive, true))
      .orderBy(asc(construtoras.razaoSocial)),
    db
      .select({
        id: imobiliarias.id,
        razaoSocial: imobiliarias.razaoSocial,
      })
      .from(imobiliarias)
      .orderBy(asc(imobiliarias.razaoSocial)),
  ]);

  const totalParcelas = rows.length;
  const totalAtrasadas = rows.filter((r) => r.diasAtraso > 0).length;
  const valorAtrasado = rows
    .filter((r) => r.diasAtraso > 0)
    .reduce((s, r) => s + r.valorAtual, 0);
  const valorTotalAtual = rows.reduce((s, r) => s + r.valorAtual, 0);

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <Link
        href="/admin/relatorios"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← relatórios
      </Link>

      <div className="mb-6">
        <div className="eyebrow mb-2">acompanhamento</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Daily</span> · parcelas em curso
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Todas as parcelas em aberto com cálculo automático de encargos
          (multa 2% + juros mora pela taxa da operação × dias de atraso).
        </p>
      </div>

      {/* === Filtros === */}
      {/* Período preset (navega direto, fora do form) */}
      <div className="mb-4">
        <span className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
          Período
        </span>
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => {
            const qs = new URLSearchParams();
            qs.set("periodo", p.value);
            // Preserva os outros filtros ao trocar período
            if (params.status) qs.set("status", params.status);
            if (params.fundoId) qs.set("fundoId", params.fundoId);
            if (params.construtoraId)
              qs.set("construtoraId", params.construtoraId);
            if (params.imobiliariaId)
              qs.set("imobiliariaId", params.imobiliariaId);
            // Datas só fazem sentido com periodo=custom
            if (p.value === "custom") {
              if (params.from) qs.set("from", params.from);
              if (params.to) qs.set("to", params.to);
            }
            return (
              <Link
                key={p.value}
                href={`/admin/relatorios/daily?${qs.toString()}`}
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

      {/* Demais filtros via form (status, fundo, construtora, imobiliária + custom dates) */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 mb-4"
      >
        {/* Mantém o periodo selecionado no submit */}
        <input type="hidden" name="periodo" value={periodo} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {periodo === "custom" && (
            <div className="lg:col-span-2">
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
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Fundo
            </label>
            <select
              name="fundoId"
              defaultValue={params.fundoId ?? ""}
              className="form-input"
            >
              <option value="">Todos</option>
              {fundos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nomeFantasia ?? f.razaoSocial}
                </option>
              ))}
              <option value="_no_fundo_">— sem fundo —</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Construtora
            </label>
            <select
              name="construtoraId"
              defaultValue={params.construtoraId ?? ""}
              className="form-input"
            >
              <option value="">Todas</option>
              {construtorasList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeFantasia ?? c.razaoSocial}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Imobiliária
            </label>
            <select
              name="imobiliariaId"
              defaultValue={params.imobiliariaId ?? ""}
              className="form-input"
            >
              <option value="">Todas</option>
              {imobsList.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.razaoSocial}
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
            href="/admin/relatorios/daily"
            className="text-fg-muted hover:text-fg text-sm"
          >
            limpar
          </Link>
        </div>
      </form>

      {/* === KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Parcelas no resultado"
          value={String(totalParcelas)}
          sub={`${rows.filter((r) => r.diasAtraso <= 0).length} a vencer`}
        />
        <Stat
          label="Atrasadas"
          value={String(totalAtrasadas)}
          sub={
            totalParcelas > 0
              ? `${((totalAtrasadas / totalParcelas) * 100).toFixed(1)}% do total`
              : "0%"
          }
          tone="danger"
        />
        <Stat
          label="Valor atualizado · atrasadas"
          value={formatBRL(valorAtrasado)}
          sub="parcela + multa + juros mora"
          tone="warn"
        />
        <Stat
          label="Valor atualizado · total"
          value={formatBRL(valorTotalAtual)}
          highlight
        />
      </div>

      <DailyTable rows={rows} />
    </AdminShell>
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
