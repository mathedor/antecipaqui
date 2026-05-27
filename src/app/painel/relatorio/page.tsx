import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { ImpostosCalculator } from "@/components/impostos-calculator";
import {
  getCorretorFinanceiro,
  getCorretorRankingConstrutoras,
} from "@/lib/actions/corretor-financeiro";
import { getScoreCorretor, scoreColorClass } from "@/lib/scoring";
import { formatBRL } from "@/lib/format";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Relatório · Painel" };
export const dynamic = "force-dynamic";

export default async function CorretorRelatorioPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "corretor" && user.role !== "imobiliaria")
    redirect("/painel");

  const [financeiro, ranking, score] = await Promise.all([
    getCorretorFinanceiro(),
    getCorretorRankingConstrutoras(),
    getScoreCorretor(user.id),
  ]);

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  if (!financeiro || !ranking) {
    return (
      <PainelShell role={role} userName={user.nome} active="/painel/relatorio">
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-10 text-center">
          <h1 className="text-xl font-bold text-warn mb-2">
            Sem dados ainda
          </h1>
          <p className="text-fg-muted">
            Quando você tiver operações cadastradas, esse relatório vai te
            mostrar análise por construtora, custo de antecipação e seu score.
          </p>
        </div>
      </PainelShell>
    );
  }

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/relatorio">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel · relatório</div>
        <h1 className="text-display-md">
          Seu <span className="text-gradient-blue">relatório</span> completo
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Visão analítica das suas operações: ranking das construtoras com
          quem você opera, custo histórico de antecipação e seu score como
          cedente.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-relatorio-corretor" />
        </div>
      </div>

      {/* Score do corretor */}
      <section
        className={`rounded-2xl border p-5 md:p-6 mb-8 ${
          score.score >= 75
            ? "border-success/40 bg-green-50"
            : score.score >= 50
              ? "border-border bg-bg-elev"
              : "border-warn/40 bg-yellow-50"
        }`}
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
              seu score como cedente
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {score.score >= 75
                ? "Excelente histórico"
                : score.score >= 50
                  ? "Histórico padrão"
                  : "Pontos a melhorar"}
            </h2>
            <p className="text-sm text-fg-muted mt-1">
              Score baseado em parcelas pagas em dia das ops que você
              cadastrou ({score.totalParcelas} parcelas no total,{" "}
              {score.vencidas} já vencidas).
            </p>
          </div>
          <div className="text-right">
            <div
              className={`font-mono tabular text-6xl font-bold ${scoreColorClass(score.score)}`}
            >
              {score.score}
              <span className="text-xl text-fg-muted font-normal">/100</span>
            </div>
          </div>
        </div>
      </section>

      {/* Custo histórico */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-8">
        <h2 className="text-lg font-bold tracking-tight mb-1">
          Custo histórico de antecipação
        </h2>
        <p className="text-xs text-fg-muted mb-5">
          Quanto você pagou em juros pra adiantar suas comissões esse ano.
          Material útil pra negociar taxas menores no futuro.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="Já antecipado"
            value={formatBRL(financeiro.totalAntecipadoYTD)}
            sub="creditado em conta"
            tone="success"
          />
          <KpiCard
            label="Custo total"
            value={formatBRL(financeiro.custoTotalAntecipacaoYTD)}
            sub="juros pagos pra antecipar"
            tone="warn"
          />
          <KpiCard
            label="% médio"
            value={`${(financeiro.custoMedioPct * 100).toFixed(2).replace(".", ",")}%`}
            sub="custo / comissão"
          />
        </div>
      </section>

      {/* Ranking de construtoras */}
      <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 mb-6">
        <h2 className="text-lg font-bold tracking-tight mb-1">
          Construtoras parceiras
        </h2>
        <p className="text-xs text-fg-muted mb-5">
          Quem você operou, quem paga em dia, e quanto você pagou em juros
          por cada uma. Ordenado por volume.
        </p>
        {ranking.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong bg-bg-card p-6 text-center text-sm text-fg-muted">
            Nenhuma operação ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-cards">
              <thead className="border-b border-border">
                <tr className="text-[10px] uppercase tracking-wider text-fg-dim font-mono text-left">
                  <th className="py-2">Construtora</th>
                  <th className="py-2 text-right">Ops</th>
                  <th className="py-2 text-right">Comissão total</th>
                  <th className="py-2 text-right">Custo (juros)</th>
                  <th className="py-2 text-right">% em dia</th>
                  <th className="py-2 text-right">Vencidas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((c, i) => {
                  const pctEmDiaCls =
                    c.pctEmDia >= 0.9
                      ? "text-success"
                      : c.pctEmDia >= 0.7
                        ? "text-fg"
                        : "text-danger";
                  return (
                    <tr
                      key={c.construtoraId}
                      className={`border-b border-border last:border-0 ${
                        i % 2 === 1 ? "bg-bg/30" : ""
                      }`}
                    >
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-fg">
                          {c.construtoraNome}
                        </div>
                        {c.diasMedioAtraso > 0 && (
                          <div className="text-[10px] text-fg-dim font-mono">
                            atraso médio: {c.diasMedioAtraso}d
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-fg">
                        {c.qtdOps}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-fg font-semibold">
                        {formatBRL(c.valorComissaoTotal)}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-warn">
                        {formatBRL(c.jurosTotalPago)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono tabular font-bold ${
                          c.parcelasPagas > 0 ? pctEmDiaCls : "text-fg-dim"
                        }`}
                      >
                        {c.parcelasPagas > 0
                          ? `${(c.pctEmDia * 100).toFixed(0)}%`
                          : "—"}
                        {c.parcelasPagas > 0 && (
                          <div className="text-[9px] text-fg-dim font-normal">
                            {c.parcelasPagas} pagas
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 text-right font-mono tabular text-danger">
                        {c.parcelasVencidas > 0 ? c.parcelasVencidas : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-8">
        <ImpostosCalculator />
      </div>

      <p className="text-xs text-fg-muted mt-8">
        <Link href="/painel" className="text-accent hover:underline">
          ← voltar ao painel
        </Link>
      </p>
    </PainelShell>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "warn";
}) {
  const cls =
    tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "success"
        ? "border-success/40 bg-green-50"
        : "border-border bg-bg";
  const labelCls =
    tone === "warn"
      ? "text-warn"
      : tone === "success"
        ? "text-success"
        : "text-fg-dim";
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
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
