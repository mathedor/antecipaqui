import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getInadimplentes } from "@/lib/actions/reports-extra";
import { listFundosForSelector } from "@/lib/actions/fundos";
import { OperacaoStatusBadge } from "@/components/operacao-status-badge";
import { ParcelaActions } from "@/components/parcela-actions";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Admin · Inadimplentes" };

type Search = {
  searchParams: Promise<{
    fundoId?: string;
    from?: string;
    to?: string;
    q?: string;
    diasMin?: string;
  }>;
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function InadimplentesPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const diasMin = params.diasMin ? parseInt(params.diasMin) : undefined;

  const [rows, fundos] = await Promise.all([
    getInadimplentes({
      fundoId: params.fundoId,
      from: params.from,
      to: params.to,
      q: params.q,
      diasMin,
    }),
    listFundosForSelector(),
  ]);

  const totalValor = rows.reduce((s, r) => s + parseFloat(r.valor), 0);
  const valor30dPlus = rows
    .filter((r) => r.dias_atraso >= 30)
    .reduce((s, r) => s + parseFloat(r.valor), 0);
  const valor90dPlus = rows
    .filter((r) => r.dias_atraso >= 90)
    .reduce((s, r) => s + parseFloat(r.valor), 0);

  return (
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <Link
        href="/admin/relatorios"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← relatórios
      </Link>

      <div className="mb-6">
        <div className="eyebrow mb-2">inadimplência</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Parcelas</span> em atraso
        </h1>
        <p className="mt-2 text-fg-muted">
          {rows.length} parcela(s) vencidas ou com vencimento já passado.
        </p>
      </div>

      {/* === Filtros === */}
      <form
        method="get"
        className="rounded-2xl border border-border bg-bg-elev p-4 mb-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Buscar (operação, construtora, corretor)
            </label>
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Ex: OP-2026 ou nome..."
              className="form-input"
            />
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
              Atraso mínimo
            </label>
            <select
              name="diasMin"
              defaultValue={params.diasMin ?? ""}
              className="form-input"
            >
              <option value="">Qualquer</option>
              <option value="1">≥ 1 dia</option>
              <option value="30">≥ 30 dias</option>
              <option value="60">≥ 60 dias</option>
              <option value="90">≥ 90 dias</option>
              <option value="180">≥ 180 dias</option>
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
              Período de vencimento
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                name="from"
                defaultValue={params.from ?? ""}
                placeholder="De"
                className="form-input min-w-0 flex-1"
              />
              <input
                type="date"
                name="to"
                defaultValue={params.to ?? ""}
                placeholder="Até"
                className="form-input min-w-0 flex-1"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <button type="submit" className="btn-primary !h-10 !px-5">
            Filtrar
          </button>
          {(params.q ||
            params.fundoId ||
            params.diasMin ||
            params.from ||
            params.to) && (
            <Link
              href="/admin/relatorios/inadimplentes"
              className="text-fg-muted hover:text-fg text-sm"
            >
              limpar
            </Link>
          )}
        </div>
      </form>

      {/* === KPIs === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          label="Total inadimplente"
          value={formatBRL(totalValor)}
          sub={`${rows.length} parcelas`}
          tone="danger"
          highlight
        />
        <Stat
          label="≥ 30 dias atraso"
          value={formatBRL(valor30dPlus)}
          sub={`${rows.filter((r) => r.dias_atraso >= 30).length} parcelas`}
          tone="warn"
        />
        <Stat
          label="≥ 90 dias atraso"
          value={formatBRL(valor90dPlus)}
          sub={`${rows.filter((r) => r.dias_atraso >= 90).length} parcelas`}
          tone="danger"
        />
        <Stat
          label="Atraso médio"
          value={
            rows.length > 0
              ? `${Math.round(rows.reduce((s, r) => s + r.dias_atraso, 0) / rows.length)} dias`
              : "0 dias"
          }
        />
      </div>

      {/* === Tabela === */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <p className="text-fg-muted">
            🎉 Nenhuma parcela inadimplente com esses filtros.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead className="bg-bg-card border-b border-border">
              <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono">
                <th className="px-4 py-3 text-left">Operação</th>
                <th className="px-4 py-3 text-left">Construtora</th>
                <th className="px-4 py-3 text-left">Corretor</th>
                <th className="px-4 py-3 text-left">Fundo</th>
                <th className="px-4 py-3 text-center">Parc.</th>
                <th className="px-4 py-3 text-right">Vencimento</th>
                <th className="px-4 py-3 text-right">Atraso</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.parcela_id}
                  className="border-b border-border last:border-0 hover:bg-bg-card transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/operacoes/${r.operacao_id}`}
                      className="font-mono text-xs text-fg hover:text-accent"
                    >
                      {r.operacao_numero}
                    </Link>
                    <div className="mt-1">
                      <OperacaoStatusBadge status={r.operacao_status} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted truncate max-w-[180px]">
                    {r.construtora_id ? (
                      <Link
                        href={`/admin/construtoras/${r.construtora_id}`}
                        className="hover:text-accent"
                      >
                        {r.construtora_nome ?? "—"}
                      </Link>
                    ) : (
                      r.construtora_nome ?? "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.corretor_id ? (
                      <Link
                        href={`/admin/usuarios/${r.corretor_id}`}
                        className="text-fg hover:text-accent"
                      >
                        {r.corretor_nome ?? "—"}
                      </Link>
                    ) : (
                      r.corretor_nome ?? "—"
                    )}
                    <div className="font-mono text-[10px] text-fg-dim truncate max-w-[160px]">
                      {r.corretor_email ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.fundo_id ? (
                      <Link
                        href={`/admin/fundos/${r.fundo_id}`}
                        className="font-mono text-xs text-accent hover:underline"
                      >
                        {r.fundo_nome}
                      </Link>
                    ) : (
                      <span className="text-warn font-mono text-xs">— sem —</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-fg-muted">
                    #{String(r.numero).padStart(2, "0")}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-fg">
                    {fmtDate(r.vencimento)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono font-semibold ${
                        r.dias_atraso >= 90
                          ? "bg-red-50 text-danger border-danger/40"
                          : r.dias_atraso >= 30
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-yellow-50 text-warn border-yellow-200"
                      }`}
                    >
                      {r.dias_atraso}d
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular text-fg font-semibold">
                    {formatBRL(parseFloat(r.valor))}
                  </td>
                  <td className="px-4 py-3">
                    <ParcelaActions
                      parcela={{
                        parcelaId: r.parcela_id,
                        parcelaNumero: r.numero,
                        vencimento: r.vencimento,
                        valorParcela: parseFloat(r.valor),
                        diasAtraso: r.dias_atraso,
                        taxaMensal: r.taxa_mensal,
                        operacaoNumero: r.operacao_numero,
                        construtoraNome: r.construtora_nome,
                        construtoraTelefone: r.construtora_telefone,
                        construtoraEmail: r.construtora_email,
                        imobiliariaNome: r.imobiliaria_nome,
                        imobiliariaTelefone: r.imobiliaria_telefone,
                        corretorNome: r.corretor_nome,
                        corretorEmail: r.corretor_email,
                        corretorTelefone: r.corretor_telefone,
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong bg-bg-card font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                <td className="px-4 py-3 text-fg-muted" colSpan={7}>
                  Total
                </td>
                <td className="px-4 py-3 text-right tabular text-danger font-bold">
                  {formatBRL(totalValor)}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
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
  tone?: "default" | "success" | "warn" | "danger";
  highlight?: boolean;
}) {
  const baseClass = highlight && tone === "danger"
    ? "border-danger/50 bg-red-50"
    : tone === "danger"
      ? "border-danger/40 bg-red-50/60"
      : tone === "warn"
        ? "border-warn/40 bg-yellow-50"
        : "border-border bg-bg-elev";
  const valueColor =
    tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : "text-fg";
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
