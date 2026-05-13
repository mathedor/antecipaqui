import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getRiscoGlobal } from "@/lib/actions/admin-risco-global";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Admin · Risco global" };
export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1).replace(".", ",")}%`;
}

export default async function AdminRiscoGlobalPage() {
  const admin = await requireAdmin();
  const data = await getRiscoGlobal();

  return (
    <AdminShell active="/admin/risco-global" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">admin · risco do sistema</div>
        <h1 className="text-display-md">
          Risco <span className="text-gradient-blue">global</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Visão consolidada do sistema todo: alertas críticos, top devedoras
          (somando todos os fundos) e comparativo de fundos pra negociar
          taxas, blacklists e regras.
        </p>
      </div>

      {/* KPIs topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Capital exposto"
          value={formatBRL(data.capitalExpostoTotal)}
          sub="VP de ops ativas, todos os fundos"
          highlight
        />
        <KpiCard
          label="Fundos ativos"
          value={String(data.qtdFundosAtivos)}
        />
        <KpiCard
          label="Construtoras"
          value={String(data.qtdConstrutorasAtivas)}
          sub="com ops ativas"
        />
        <KpiCard
          label="Inadimplência total"
          value={formatBRL(data.valorVencidoGlobal)}
          sub={`${data.qtdVencidasGlobal} parcelas`}
          tone={data.valorVencidoGlobal > 0 ? "danger" : "default"}
        />
      </div>

      {/* Alertas críticos */}
      {data.alertas.length > 0 && (
        <section className="rounded-2xl border border-danger/30 bg-red-50 p-5 md:p-6 mb-8">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <h2 className="text-lg font-bold tracking-tight">
              ⚠ Alertas críticos ({data.alertas.length})
            </h2>
          </div>
          <ul className="space-y-2">
            {data.alertas.map((a, i) => (
              <li
                key={i}
                className={`rounded-xl border px-4 py-3 ${
                  a.severidade === "danger"
                    ? "border-danger/40 bg-white"
                    : "border-warn/40 bg-yellow-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-fg">{a.titulo}</div>
                    <div className="text-xs text-fg-muted mt-0.5">
                      {a.descricao}
                    </div>
                  </div>
                  {a.href && (
                    <Link
                      href={a.href}
                      className="text-accent text-xs font-mono shrink-0 hover:underline"
                    >
                      ver →
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Top devedoras */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-8">
        <h2 className="text-lg font-bold tracking-tight mb-1">
          Top construtoras devedoras (sistema todo)
        </h2>
        <p className="text-xs text-fg-muted mb-5">
          Consolida vencidas de TODOS os fundos. Coluna &quot;bloqueada por&quot;
          mostra quantos fundos já têm essa construtora em blacklist —
          considere recusar novas operações dela.
        </p>
        {data.topDevedoras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg-card p-6 text-center text-sm text-fg-muted">
            Nenhuma construtora com parcelas vencidas. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono text-left">
                  <th className="py-2">Construtora</th>
                  <th className="py-2 text-right">Parcelas venc.</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right">Dias médio</th>
                  <th className="py-2 text-right">Fundos impactados</th>
                  <th className="py-2 text-right">Bloqueada por</th>
                </tr>
              </thead>
              <tbody>
                {data.topDevedoras.map((d, i) => (
                  <tr
                    key={d.construtoraId}
                    className={`border-b border-border last:border-0 ${
                      i % 2 === 1 ? "bg-bg/30" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/admin/construtoras/${d.construtoraId}`}
                        className="font-semibold text-fg hover:text-accent"
                      >
                        {d.construtoraNome}
                      </Link>
                      {d.cnpj && (
                        <div className="font-mono text-[9px] text-fg-dim">
                          {d.cnpj}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular text-warn font-semibold">
                      {d.parcelasVencidas}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular text-danger font-bold">
                      {formatBRL(d.valorVencido)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular text-fg">
                      {d.diasMedioAtraso}d
                    </td>
                    <td className="py-2.5 text-right font-mono tabular text-fg">
                      {d.qtdFundosImpactados}
                    </td>
                    <td className="py-2.5 text-right">
                      {d.qtdBloqueios > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold bg-red-50 text-danger border border-danger/30">
                          {d.qtdBloqueios} fundo{d.qtdBloqueios === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span className="text-fg-dim text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Comparativo de fundos */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-8">
        <h2 className="text-lg font-bold tracking-tight mb-1">
          Comparativo de fundos
        </h2>
        <p className="text-xs text-fg-muted mb-5">
          Volume, automação (% de aprovações automáticas vs manuais), saúde
          das faturas e configuração interna de cada fundo.
        </p>
        {data.comparativoFundos.length === 0 ? (
          <div className="text-sm text-fg-muted">
            Nenhum fundo ativo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono text-left">
                  <th className="py-2">Fundo</th>
                  <th className="py-2 text-right">Taxa</th>
                  <th className="py-2 text-right">Capital</th>
                  <th className="py-2 text-right">Ops</th>
                  <th className="py-2 text-right">Decisão fundo</th>
                  <th className="py-2 text-right">Faturas</th>
                  <th className="py-2 text-right">Regras/BL</th>
                </tr>
              </thead>
              <tbody>
                {data.comparativoFundos.map((f, i) => {
                  const taxaAuto =
                    f.qtdAprovadasSeMan + f.qtdAprovadasAuto > 0
                      ? f.qtdAprovadasAuto /
                        (f.qtdAprovadasSeMan + f.qtdAprovadasAuto)
                      : 0;
                  const pctFaturasPagas =
                    f.faturasTotal > 0
                      ? f.faturasPagas / f.faturasTotal
                      : 0;
                  return (
                    <tr
                      key={f.fundoId}
                      className={`border-b border-border last:border-0 ${
                        i % 2 === 1 ? "bg-bg/30" : ""
                      }`}
                    >
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/admin/fundos/${f.fundoId}`}
                          className="font-semibold text-fg hover:text-accent"
                        >
                          {f.fundoNome}
                        </Link>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-fg">
                        {pct(f.taxaMensalBase)}/m
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-fg font-semibold">
                        {formatBRL(f.capitalExposto)}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-fg">
                        {f.qtdOps}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="font-mono tabular text-xs">
                          <span className="text-success">
                            {f.qtdAprovadasSeMan + f.qtdAprovadasAuto}✓
                          </span>
                          {f.qtdPendentes > 0 && (
                            <span className="text-warn ml-1">
                              {f.qtdPendentes}?
                            </span>
                          )}
                          {f.qtdRecusadas > 0 && (
                            <span className="text-danger ml-1">
                              {f.qtdRecusadas}✗
                            </span>
                          )}
                        </div>
                        {f.qtdAprovadasSeMan + f.qtdAprovadasAuto > 0 && (
                          <div className="text-[9px] text-fg-dim">
                            {(taxaAuto * 100).toFixed(0)}% auto
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="font-mono tabular text-xs text-fg">
                          {f.faturasPagas}/{f.faturasTotal}
                        </div>
                        {f.faturasTotal > 0 && (
                          <div
                            className={`text-[9px] ${
                              pctFaturasPagas >= 0.9
                                ? "text-success"
                                : pctFaturasPagas >= 0.5
                                  ? "text-warn"
                                  : "text-danger"
                            }`}
                          >
                            {(pctFaturasPagas * 100).toFixed(0)}% pagas
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="font-mono tabular text-xs">
                          <span className="text-accent">
                            {f.qtdRegrasAtivas} regra
                            {f.qtdRegrasAtivas === 1 ? "" : "s"}
                          </span>
                          {f.qtdBlacklist > 0 && (
                            <>
                              {" · "}
                              <span className="text-danger">
                                {f.qtdBlacklist} blocked
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight = false,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  tone?: "default" | "danger";
}) {
  const cls = highlight
    ? "border-accent bg-accent-soft"
    : tone === "danger"
      ? "border-danger/40 bg-red-50"
      : "border-border bg-bg-elev";
  const labelCls = highlight
    ? "text-accent"
    : tone === "danger"
      ? "text-danger"
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
      {sub && <div className="text-[10px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
