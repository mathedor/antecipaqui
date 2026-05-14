import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { listRecaps, type RecapDados, type RecapPeriodo } from "@/lib/recaps";
import { RecapsManager } from "@/components/recaps-manager";

export const metadata = { title: "Recaps · Admin" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  periodo?: RecapPeriodo;
  from?: string;
  to?: string;
}>;

export default async function AdminRecapsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const periodo = params.periodo;
  const from = params.from;
  const to = params.to;

  const rows = await listRecaps({
    escopo: "admin",
    fundoId: null,
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
    <AdminShell active="/admin/relatorios" userName={admin.nome}>
      <div className="mb-6">
        <Link
          href="/admin/relatorios"
          className="text-xs text-fg-muted hover:text-accent"
        >
          ← Relatórios
        </Link>
        <div className="eyebrow mt-2 mb-2">resumos periódicos</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Recaps</span> diários · semanais · mensais
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Resumos automáticos do movimento da plataforma. Gerados todos os dias
          às 00:30 (UTC-3). Cada recap salva ops feitas, inadimplência,
          aprovações de fundos, novos corretores e prazo médio de análise.
        </p>
      </div>

      <RecapsManager
        recaps={recaps}
        escopo="admin"
        filtros={{ periodo, from, to }}
      />
    </AdminShell>
  );
}
