import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getConstrutoraByOwnerId } from "@/lib/actions/operacoes";
import { getScoreConstrutora, scoreColorClass } from "@/lib/scoring";
import { getScoreParams } from "@/lib/actions/settings";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { formatBRL } from "@/lib/format";

export const metadata = { title: "Meu score · Painel construtora" };
export const dynamic = "force-dynamic";

export default async function ConstrutoraScorePage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "construtora") redirect("/painel");

  const construtora = await getConstrutoraByOwnerId(user.id);
  if (!construtora) redirect("/painel/onboarding");

  const [score, params, agg] = await Promise.all([
    getScoreConstrutora(construtora.id, "global"),
    getScoreParams(),
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'paga')::int AS pagas,
        COUNT(*) FILTER (WHERE p.status = 'paga' AND p.pago_em <= p.vencimento)::int AS pagas_em_dia,
        COUNT(*) FILTER (WHERE p.status = 'paga' AND p.pago_em > p.vencimento)::int AS pagas_atrasadas,
        COALESCE(
          AVG(EXTRACT(EPOCH FROM (p.pago_em::timestamp - p.vencimento::timestamp))/86400)
            FILTER (WHERE p.status = 'paga' AND p.pago_em > p.vencimento)::float,
          0
        ) AS atraso_medio_dias,
        COALESCE(SUM(p.valor) FILTER (WHERE p.status = 'vencida')::float, 0) AS valor_vencido
      FROM parcelas_comissao p
      INNER JOIN operacoes o ON o.id = p.operacao_id
      WHERE o.construtora_id = ${construtora.id}::uuid
    `),
  ]);

  const stats = (agg as unknown as {
    rows: {
      pagas: number;
      pagas_em_dia: number;
      pagas_atrasadas: number;
      atraso_medio_dias: number;
      valor_vencido: number;
    }[];
  }).rows[0] ?? {
    pagas: 0,
    pagas_em_dia: 0,
    pagas_atrasadas: 0,
    atraso_medio_dias: 0,
    valor_vencido: 0,
  };

  const pctEmDia =
    stats.pagas > 0 ? (stats.pagas_em_dia / stats.pagas) * 100 : 100;

  const dicas: { titulo: string; descricao: string; ativa: boolean }[] = [
    {
      titulo: "Quitar parcelas vencidas",
      descricao: `Você tem ${formatBRL(stats.valor_vencido)} em parcelas vencidas. Cada uma derruba seu score em ${params.pesoVencida}pt (ou ${params.pesoVencidaGrave}pt se passar de ${params.diasGrave} dias).`,
      ativa: stats.valor_vencido > 0 || score.vencidas > 0,
    },
    {
      titulo: "Manter pagamento em dia",
      descricao: `Pague até a data de vencimento. Parcelas atrasadas (mesmo que pagas depois) entram no histórico e podem afetar o score se passarem de ${params.diasGrave} dias.`,
      ativa: stats.pagas_atrasadas > 0,
    },
    {
      titulo: "Construir histórico positivo",
      descricao:
        "Construtoras sem histórico começam com score neutro (50). À medida que paga parcelas em dia, o score sobe automaticamente.",
      ativa: score.totalParcelas < 10,
    },
  ].filter((d) => d.ativa);

  const scoreColor = scoreColorClass(score.score);
  const banda =
    score.score >= 75
      ? { label: "Boa", desc: "Você é vista como confiável pelos fundos e admin." }
      : score.score >= 50
        ? { label: "Neutra", desc: "Histórico ainda em construção ou com alguns atrasos." }
        : { label: "Baixa", desc: "Atrasos significativos afetando a percepção dos fundos." };

  return (
    <PainelShell role="construtora" userName={user.nome} active="/painel/score">
      <div className="mb-8">
        <div className="eyebrow mb-2">painel · construtora</div>
        <h1 className="text-display-md">
          Seu <span className="text-gradient-blue">score</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          É a mesma nota que admin e fundos veem ao analisar suas operações.
          Quanto maior, mais fácil aprovar antecipações.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-1 rounded-2xl border border-border bg-bg-elev p-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-3">
            score atual
          </div>
          <div className={`font-mono tabular text-7xl font-bold ${scoreColor}`}>
            {score.score}
            <span className="text-2xl text-fg-muted font-normal">/100</span>
          </div>
          <div className="mt-3 text-sm">
            <strong className={scoreColor}>{banda.label}</strong>
            <div className="text-fg-muted text-xs mt-1">{banda.desc}</div>
          </div>
        </div>

        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <Stat
            label="Parcelas no histórico"
            value={String(score.totalParcelas)}
            sub={`${stats.pagas} pagas`}
          />
          <Stat
            label="Pagas em dia"
            value={`${pctEmDia.toFixed(0)}%`}
            sub={`${stats.pagas_em_dia} de ${stats.pagas}`}
            tone={pctEmDia >= 80 ? "success" : pctEmDia >= 50 ? "default" : "warn"}
          />
          <Stat
            label="Atrasos leves"
            value={String(score.vencidas - score.vencidasGraves)}
            sub={`< ${params.diasGrave} dias`}
            tone={score.vencidas > 0 ? "warn" : "default"}
          />
          <Stat
            label="Atrasos graves"
            value={String(score.vencidasGraves)}
            sub={`≥ ${params.diasGrave} dias`}
            tone={score.vencidasGraves > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      {/* Fórmula transparente */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 md:p-6 mb-8">
        <h2 className="text-lg font-bold mb-3">Como o score é calculado</h2>
        <div className="space-y-2 text-sm text-fg-muted">
          <p>
            <strong className="text-fg">Base:</strong> 100 pontos pra todas as
            construtoras com histórico. Sem histórico = 50 (neutro).
          </p>
          <p>
            <strong className="text-fg">Cada parcela vencida:</strong> −
            {params.pesoVencida}pt (limite de −50pt total).
          </p>
          <p>
            <strong className="text-fg">Cada vencida grave</strong> (acima de{" "}
            {params.diasGrave} dias de atraso): −{params.pesoVencidaGrave}pt
            adicional (limite de −40pt total).
          </p>
          <p className="font-mono text-xs text-fg-dim mt-3 pt-3 border-t border-border">
            {score.score} = 100 − min(50, {score.vencidas} ×{" "}
            {params.pesoVencida}) − min(40, {score.vencidasGraves} ×{" "}
            {params.pesoVencidaGrave})
          </p>
        </div>
      </div>

      {/* Dicas */}
      {dicas.length > 0 && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6 mb-8">
          <h2 className="text-lg font-bold mb-3">
            💡 Dicas pra melhorar seu score
          </h2>
          <ul className="space-y-3">
            {dicas.map((d) => (
              <li
                key={d.titulo}
                className="rounded-xl bg-bg border border-border p-3"
              >
                <strong className="text-fg">{d.titulo}</strong>
                <p className="text-sm text-fg-muted mt-1">{d.descricao}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Link href="/painel/duplicatas" className="btn-primary !h-11 !px-5">
          Ver duplicatas
        </Link>
        <Link
          href="/painel/forecast"
          className="h-11 px-5 rounded-xl border border-border-strong text-fg font-semibold hover:border-accent transition-colors inline-flex items-center"
        >
          Projeção de pagamento
        </Link>
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
  tone?: "default" | "success" | "warn" | "danger";
}) {
  const borderClass =
    tone === "warn"
      ? "border-warn/40 bg-yellow-50"
      : tone === "danger"
        ? "border-danger/40 bg-red-50"
        : tone === "success"
          ? "border-success/40 bg-green-50"
          : "border-border bg-bg-elev";
  const labelColor =
    tone === "warn"
      ? "text-warn"
      : tone === "danger"
        ? "text-danger"
        : tone === "success"
          ? "text-success"
          : "text-fg-dim";
  return (
    <div className={`rounded-2xl border p-4 ${borderClass}`}>
      <div
        className={`font-mono text-[10px] uppercase tracking-[0.18em] mb-2 ${labelColor}`}
      >
        {label}
      </div>
      <div className="font-mono tabular text-2xl font-bold tracking-tight text-fg">
        {value}
      </div>
      {sub && <div className="text-xs text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
