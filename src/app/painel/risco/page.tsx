import { redirect } from "next/navigation";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PageHelp } from "@/components/page-help";
import { getFundoRisco } from "@/lib/actions/fundo-risco";
import { getConstrutoraByOwnerId } from "@/lib/actions/operacoes";
import { db } from "@/db";
import { formatBRL } from "@/lib/format";
import { BlacklistToggleButton } from "@/components/blacklist-toggle-button";

export const metadata = { title: "Risco" };
export const dynamic = "force-dynamic";

function pct(n: number) {
  return `${(n * 100).toFixed(1).replace(".", ",")}%`;
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
}

export default async function PainelRiscoPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role === "construtora") return <ConstrutoraRisco user={user} />;
  if (user.role !== "fundo") redirect("/painel");

  const data = await getFundoRisco();
  if (!data) {
    return (
      <PainelShell role="fundo" userName={user.nome} active="/painel/risco">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Fundo não vinculado
          </h1>
        </div>
      </PainelShell>
    );
  }

  const totalAlertas =
    data.porConstrutora.filter((c) => c.status !== "ok").length +
    data.porImobiliaria.filter((c) => c.status !== "ok").length;

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/risco">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo · risco</div>
        <h1 className="text-display-md">
          Análise de <span className="text-gradient-blue">risco</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Concentração de capital, devedoras e construtoras bloqueadas. Quando
          o % de exposição em uma única contraparte passa de 25% (alerta) ou
          40% (crítico), revise antes de novas operações.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-risco-fundo" />
        </div>
      </div>

      {/* KPIs topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard
          label="Capital exposto"
          value={formatBRL(data.capitalExposto)}
          sub="soma do VP das ops ativas"
          highlight
        />
        <KpiCard
          label="Construtoras ativas"
          value={String(data.porConstrutora.length)}
        />
        <KpiCard
          label="Alertas de concentração"
          value={String(totalAlertas)}
          tone={totalAlertas > 0 ? "warn" : "default"}
        />
        <KpiCard
          label="Bloqueadas"
          value={String(data.blacklist.length)}
          tone={data.blacklist.length > 0 ? "danger" : "default"}
        />
      </div>

      {/* Concentração por construtora */}
      <ConcentracaoSection
        title="Concentração por construtora"
        items={data.porConstrutora}
      />

      {/* Devedoras */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-8">
        <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold tracking-tight">
              Construtoras devedoras
            </h2>
            <p className="text-xs text-fg-muted mt-0.5">
              Ordenado por valor em atraso. Use o botão pra bloquear novas
              operações dessa contraparte.
            </p>
          </div>
        </div>
        {data.devedoras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg-card p-6 text-center text-sm text-fg-muted">
            Nenhuma construtora com parcelas vencidas. 🎉
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-cards">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono text-left">
                  <th className="py-2">Construtora</th>
                  <th className="py-2 text-right">Parcelas vencidas</th>
                  <th className="py-2 text-right">Valor em atraso</th>
                  <th className="py-2 text-right">Dias médios atraso</th>
                  <th className="py-2">Última paga</th>
                  <th className="py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {data.devedoras.map((d, i) => (
                  <tr
                    key={d.construtoraId}
                    className={`border-b border-border last:border-0 ${
                      i % 2 === 1 ? "bg-bg/30" : ""
                    } ${d.blacklisted ? "opacity-60" : ""}`}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-fg">
                          {d.construtoraNome}
                        </span>
                        {d.blacklisted && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold bg-red-50 text-danger border border-danger/30">
                            bloqueada
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular text-warn font-semibold">
                      {d.parcelasVencidas}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular text-danger font-bold">
                      {formatBRL(d.valorVencido)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular text-fg">
                      {d.diasMedioAtraso}
                    </td>
                    <td className="py-2.5 font-mono text-xs text-fg-muted">
                      {fmtDate(d.ultimaParcelaPaga)}
                    </td>
                    <td className="py-2.5 text-right">
                      <BlacklistToggleButton
                        construtoraId={d.construtoraId}
                        construtoraNome={d.construtoraNome}
                        blacklisted={d.blacklisted}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Blacklist atual */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-tight">
            Construtoras bloqueadas
          </h2>
          <p className="text-xs text-fg-muted mt-0.5">
            Quando o admin/corretor tentar criar uma nova operação pra uma
            destas, o sistema avisa que você não topa.
          </p>
        </div>
        {data.blacklist.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg-card p-6 text-center text-sm text-fg-muted">
            Nenhuma construtora bloqueada.
          </div>
        ) : (
          <ul className="space-y-2">
            {data.blacklist.map((b) => (
              <li
                key={b.construtoraId}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-danger/30 bg-red-50"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-fg">
                    {b.construtoraNome}
                  </div>
                  {b.motivo && (
                    <div className="text-xs text-fg-muted truncate">
                      {b.motivo}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] font-mono text-fg-dim">
                    desde {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                  <BlacklistToggleButton
                    construtoraId={b.construtoraId}
                    construtoraNome={b.construtoraNome}
                    blacklisted={true}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Concentração por imobiliária */}
      <ConcentracaoSection
        title="Concentração por imobiliária / corretor"
        items={data.porImobiliaria}
      />

      {/* Concentração por UF */}
      <ConcentracaoSection
        title="Distribuição por estado"
        items={data.porUf}
      />

      <p className="text-xs text-fg-muted">
        <Link href="/painel" className="text-accent hover:underline">
          ← voltar ao painel
        </Link>
      </p>
    </PainelShell>
  );
}

type Item = {
  id: string;
  nome: string;
  valorOperado: number;
  qtdOps: number;
  pct: number;
  status: "ok" | "alerta" | "critico";
};

function ConcentracaoSection({
  title,
  items,
}: {
  title: string;
  items: Item[];
}) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-8">
      <h2 className="text-lg font-bold tracking-tight mb-4">{title}</h2>
      <ul className="space-y-2">
        {items.slice(0, 15).map((it) => {
          const barColor =
            it.status === "critico"
              ? "bg-danger"
              : it.status === "alerta"
                ? "bg-warn"
                : "bg-accent";
          const borderColor =
            it.status === "critico"
              ? "border-danger/40 bg-red-50"
              : it.status === "alerta"
                ? "border-warn/40 bg-yellow-50"
                : "border-border bg-bg";
          return (
            <li
              key={it.id}
              className={`px-4 py-2.5 rounded-xl border ${borderColor}`}
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="min-w-0">
                  <div className="font-semibold text-fg truncate">
                    {it.nome}
                  </div>
                  <div className="text-[10px] font-mono text-fg-dim">
                    {it.qtdOps} op{it.qtdOps === 1 ? "" : "s"} ·{" "}
                    {formatBRL(it.valorOperado)}
                  </div>
                </div>
                <span
                  className={`font-mono tabular text-base font-bold shrink-0 ${
                    it.status === "critico"
                      ? "text-danger"
                      : it.status === "alerta"
                        ? "text-warn"
                        : "text-fg"
                  }`}
                >
                  {pct(it.pct)}
                </span>
              </div>
              <div className="h-1.5 bg-bg-card rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all`}
                  style={{ width: `${Math.min(100, it.pct * 100)}%` }}
                />
              </div>
              {it.status !== "ok" && (
                <div className="mt-1.5 text-[10px] font-mono uppercase tracking-wider">
                  {it.status === "critico" ? (
                    <span className="text-danger">
                      ⚠ crítico — concentração acima de 40%
                    </span>
                  ) : (
                    <span className="text-warn">
                      ⚠ alerta — concentração acima de 25%
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
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
  tone?: "default" | "warn" | "danger";
}) {
  const cls = highlight
    ? "border-accent bg-accent-soft"
    : tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "danger"
        ? "border-danger/40 bg-red-50"
        : "border-border bg-bg-elev";
  const labelCls = highlight
    ? "text-accent"
    : tone === "warn"
      ? "text-warn"
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

/* ============================================================
   RISCO DA CONSTRUTORA — concentração própria + fundos parceiros
   ============================================================ */

async function ConstrutoraRisco({
  user,
}: {
  user: { id: string; nome: string | null };
}) {
  const construtora = await getConstrutoraByOwnerId(user.id);
  if (!construtora) redirect("/painel/onboarding");

  const fundosRes = await db.execute(sql`
    SELECT
      f.id::text AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social, '— sem fundo —') AS nome,
      COUNT(o.id)::int AS qtd_ops,
      COALESCE(SUM(o.valor_comissao)::float, 0) AS volume,
      COALESCE(
        SUM(p.valor) FILTER (WHERE p.status = 'a_vencer')::float, 0
      ) AS a_pagar,
      COALESCE(
        SUM(p.valor) FILTER (WHERE p.status = 'vencida')::float, 0
      ) AS vencidas,
      COALESCE(
        SUM(COALESCE(p.pago_valor, p.valor)) FILTER (WHERE p.status = 'paga')::float, 0
      ) AS pagas
    FROM operacoes o
    LEFT JOIN fundos f ON f.id = o.fundo_id
    LEFT JOIN parcelas_comissao p ON p.operacao_id = o.id
    WHERE o.construtora_id = ${construtora.id}::uuid
      AND o.status NOT IN ('rascunho', 'recusada', 'cancelada')
    GROUP BY f.id, f.nome_fantasia, f.razao_social
    ORDER BY volume DESC
  `);
  const rows = (fundosRes as unknown as {
    rows: {
      fundo_id: string | null;
      nome: string;
      qtd_ops: number;
      volume: number;
      a_pagar: number;
      vencidas: number;
      pagas: number;
    }[];
  }).rows ?? [];

  const totalVolume = rows.reduce((s, r) => s + r.volume, 0);
  const totalAPagar = rows.reduce((s, r) => s + r.a_pagar, 0);
  const totalVencidas = rows.reduce((s, r) => s + r.vencidas, 0);
  const totalPagas = rows.reduce((s, r) => s + r.pagas, 0);

  return (
    <PainelShell role="construtora" userName={user.nome} active="/painel/risco">
      <div className="mb-8">
        <div className="eyebrow mb-2">painel · construtora</div>
        <h1 className="text-display-md">
          Risco e <span className="text-gradient-blue">concentração</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Como o seu fluxo de pagamento se distribui entre os fundos
          investidores. Concentrar 100% num só fundo aumenta risco operacional
          — se ele recusar futuras ops, você perde a fonte.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-risco-construtora" />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-8">
        <Stat label="Volume total" value={formatBRL(totalVolume)} sub="comissões ativas" />
        <Stat label="A pagar" value={formatBRL(totalAPagar)} sub="parcelas a vencer" />
        <Stat
          label="Vencidas"
          value={formatBRL(totalVencidas)}
          sub="quitar urgente"
          tone={totalVencidas > 0 ? "danger" : "default"}
        />
        <Stat label="Já pago" value={formatBRL(totalPagas)} sub="histórico" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-5xl mb-3">🤝</div>
          <h2 className="text-xl font-bold">Sem operações ativas</h2>
          <p className="mt-2 text-fg-muted">
            Quando você tiver ops aprovadas, os fundos investidores aparecem
            aqui com a distribuição.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-bold">Distribuição por fundo</h2>
          </div>
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const conc = totalVolume > 0 ? r.volume / totalVolume : 0;
              const concClass =
                conc >= 0.6
                  ? "border-danger/40 bg-red-50"
                  : conc >= 0.4
                    ? "border-warn/40 bg-yellow-50"
                    : "border-border bg-bg";
              return (
                <li key={r.fundo_id ?? "_sem"} className="p-4 md:p-5">
                  <div className="grid md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4 min-w-0">
                      <div className="font-bold truncate">{r.nome}</div>
                      <div className="text-xs text-fg-muted font-mono mt-0.5">
                        {r.qtd_ops} operaç{r.qtd_ops === 1 ? "ão" : "ões"} · {pct(conc)} do volume
                      </div>
                    </div>
                    <div className="md:col-span-5">
                      <div className="h-2 rounded-full bg-bg-card overflow-hidden">
                        <div
                          className={`h-full ${
                            conc >= 0.6
                              ? "bg-danger"
                              : conc >= 0.4
                                ? "bg-warn"
                                : "bg-accent"
                          }`}
                          style={{ width: `${conc * 100}%` }}
                        />
                      </div>
                      <div className={`mt-2 text-[11px] font-mono rounded px-2 py-1 inline-block border ${concClass}`}>
                        {conc >= 0.6
                          ? "⚠ concentração crítica — diversifique"
                          : conc >= 0.4
                            ? "atenção — diversifique se possível"
                            : "OK"}
                      </div>
                    </div>
                    <div className="md:col-span-3 text-right space-y-0.5">
                      <div className="text-xs">
                        <span className="text-fg-dim">a pagar </span>
                        <span className="font-mono text-fg font-semibold">{formatBRL(r.a_pagar)}</span>
                      </div>
                      {r.vencidas > 0 && (
                        <div className="text-xs">
                          <span className="text-fg-dim">vencidas </span>
                          <span className="font-mono text-danger font-semibold">{formatBRL(r.vencidas)}</span>
                        </div>
                      )}
                      <div className="text-xs">
                        <span className="text-fg-dim">pago </span>
                        <span className="font-mono text-success">{formatBRL(r.pagas)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-border bg-bg-card p-5 text-sm text-fg-muted">
        <strong className="text-fg">Por que isso importa:</strong> os fundos
        avaliam você pelo histórico de pagamento (
        <Link href="/painel/score" className="text-accent hover:underline">veja seu score</Link>
        ). Se um fundo recusa sua próxima op e ele responde por 70%+ das suas
        antecipações, sua liquidez fica comprometida. Buscar mais de um fundo
        reduz esse risco operacional.
      </div>
    </PainelShell>
  );
}

function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "border-danger/40 bg-red-50"
      : "border-border bg-bg-elev";
  const labelCls = tone === "danger" ? "text-danger" : "text-fg-dim";
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
