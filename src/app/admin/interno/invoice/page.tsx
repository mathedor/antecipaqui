import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { InvoiceTable } from "@/components/invoice-table";
import {
  getInvoiceData,
  type InvoiceFilters,
} from "@/lib/actions/invoice";
import { listFundosForSelector } from "@/lib/actions/fundos";
import { listConstrutorasForSelector } from "@/lib/actions/admin-cadastrar";
import { listImobiliariasForLote } from "@/lib/actions/pending-operacoes";
import { listComerciaisForSelector } from "@/lib/actions/comerciais";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Admin · Interno · Invoice" };

type Search = {
  searchParams: Promise<{
    periodo?: "atual" | "passado" | "proximo" | "custom";
    from?: string;
    to?: string;
    fundoId?: string;
    construtoraId?: string;
    imobiliariaId?: string;
    comercialId?: string;
  }>;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

const PERIODO_LABEL: Record<string, string> = {
  atual: "Mês atual",
  passado: "Mês passado",
  proximo: "Próximo mês",
  custom: "Outro período",
};

export default async function AdminInvoicePage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const periodo = params.periodo ?? "atual";

  const filters: InvoiceFilters = {
    periodo,
    from: params.from,
    to: params.to,
    fundoId: params.fundoId,
    construtoraId: params.construtoraId,
    imobiliariaId: params.imobiliariaId,
    comercialId: params.comercialId,
  };

  const [data, fundos, construtoras, imobiliarias, comerciais] =
    await Promise.all([
      getInvoiceData(filters),
      listFundosForSelector(),
      listConstrutorasForSelector(),
      listImobiliariasForLote(),
      listComerciaisForSelector(),
    ]);

  // Querystring para os botões de export — preserva todos os filtros ativos
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const exportQs = qs.toString();

  return (
    <AdminShell active="/admin/interno" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">interno · financeiro</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Invoice</span> · repasse de
          fundos
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Demonstrativo de repasse devido pelos fundos investidores. Saldo =
          (Juros − Impostos) × % rateio. Período baseado na data de aprovação
          (status &quot;enviada para pagamento&quot; ou superior).
        </p>
      </div>

      {/* Filtros */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 mb-6 space-y-4"
      >
        {/* Período */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-2">
            Período
          </div>
          <div className="flex flex-wrap gap-2">
            {(["atual", "passado", "proximo", "custom"] as const).map((p) => {
              const isActive = periodo === p;
              return (
                <label
                  key={p}
                  className={`cursor-pointer px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                    isActive
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-bg text-fg-muted hover:border-accent/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="periodo"
                    value={p}
                    defaultChecked={isActive}
                    className="sr-only"
                  />
                  {PERIODO_LABEL[p]}
                </label>
              );
            })}
          </div>
        </div>

        {periodo === "custom" && (
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
        )}

        {/* Filtros adicionais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              {construtoras.map((c) => (
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
              {imobiliarias.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nomeFantasia ?? i.razaoSocial}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Comercial
            </label>
            <select
              name="comercialId"
              defaultValue={params.comercialId ?? ""}
              className="form-input"
            >
              <option value="">Todos</option>
              {comerciais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.apelido ?? c.nomeCompleto}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
          <button type="submit" className="btn-primary !h-10 !px-5">
            Aplicar
          </button>
          {(params.periodo ||
            params.from ||
            params.to ||
            params.fundoId ||
            params.construtoraId ||
            params.imobiliariaId ||
            params.comercialId) && (
            <Link
              href="/admin/interno/invoice"
              className="text-fg-muted hover:text-fg text-sm"
            >
              limpar
            </Link>
          )}
          <div className="flex-1" />
          <a
            href={`/api/invoice/csv?${exportQs}`}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-border text-fg text-xs font-semibold hover:border-accent hover:text-accent transition-colors"
          >
            ⬇ CSV
          </a>
          <a
            href={`/api/invoice/pdf?${exportQs}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark transition-colors"
          >
            ⬇ PDF · Cobrança
          </a>
        </div>
      </form>

      {/* Tabela */}
      <InvoiceTable rows={data.rows} totals={data.totals} />

      {/* Saldo destaque */}
      <section className="mt-8 rounded-3xl border-2 border-success bg-green-50 p-8 md:p-10 flex items-center justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-success mb-2">
            Saldo a repassar
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {fmtDate(data.periodLabel.from)} → {fmtDate(data.periodLabel.to)}
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {data.rows.length}{" "}
            {data.rows.length === 1 ? "operação" : "operações"} · soma de saldo
            de repasse
          </p>
        </div>
        <div className="font-mono tabular text-4xl md:text-5xl font-bold text-success leading-none">
          {formatBRL(data.totals.saldoRepasse)}
        </div>
      </section>
    </AdminShell>
  );
}