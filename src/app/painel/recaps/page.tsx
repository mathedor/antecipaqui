import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import {
  listRecaps,
  type RecapDados,
  type RecapPeriodo,
} from "@/lib/recaps";
import { RecapsManager } from "@/components/recaps-manager";
import { getCurrentFundo } from "@/lib/actions/fundos";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Recaps · Fundo" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  periodo?: RecapPeriodo;
  from?: string;
  to?: string;
}>;

export default async function FundoRecapsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireActiveUser();
  if (user.role !== "fundo") redirect("/painel");

  const fundo = await getCurrentFundo();
  if (!fundo) redirect("/painel");

  const params = await searchParams;
  const periodo = params.periodo;
  const from = params.from;
  const to = params.to;

  const rows = await listRecaps({
    escopo: "fundo",
    fundoId: fundo.id,
    periodo,
    from,
    to,
    limit: 200,
  });

  const recaps = rows.map((r) => ({
    id: r.id,
    periodo: r.periodo as RecapPeriodo,
    inicio: r.inicio,
    fim: r.fim,
    geradoEm: r.geradoEm,
    dados: r.dados as unknown as RecapDados,
  }));

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/recaps">
      <div className="mb-6">
        <Link
          href="/painel"
          className="text-xs text-fg-muted hover:text-accent"
        >
          ← Painel
        </Link>
        <div className="eyebrow mt-2 mb-2">resumos periódicos</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Recaps</span> do seu fundo
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Resumos automáticos do seu fundo: ops aprovadas, inadimplência,
          prazo médio de análise e antecipações. Gerados diariamente, semanal
          (segunda) e mensal (dia 1).
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-recaps" />
        </div>
      </div>

      <RecapsManager
        recaps={recaps}
        escopo="fundo"
        filtros={{ periodo, from, to }}
      />
    </PainelShell>
  );
}
