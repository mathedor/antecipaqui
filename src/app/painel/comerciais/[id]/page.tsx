import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getCurrentFundo } from "@/lib/actions/fundos";
import { getComercialDesempenho } from "@/lib/actions/comercial-desempenho";
import { ComercialDesempenhoPanel } from "@/components/dashboards/comercial-desempenho-panel";

export const metadata = { title: "Desempenho do comercial" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function FundoComercialDetailPage({ params }: Params) {
  const user = await requireActiveUser();
  if (user.role !== "fundo") redirect("/painel");

  const fundo = await getCurrentFundo();
  if (!fundo) redirect("/painel");

  const { id } = await params;
  const d = await getComercialDesempenho(id);
  if (!d) notFound();
  // Bloqueia se não é comercial do fundo
  if (d.fundoId !== fundo.id) redirect("/painel/comerciais");

  return (
    <PainelShell
      role="fundo"
      userName={user.nome}
      active="/painel/comerciais"
    >
      <div className="mb-6">
        <Link
          href="/painel/comerciais"
          className="text-xs text-fg-muted hover:text-accent"
        >
          ← seus comerciais
        </Link>
      </div>
      <ComercialDesempenhoPanel
        d={d}
        fundoNome={fundo.nomeFantasia ?? fundo.razaoSocial}
      />
    </PainelShell>
  );
}
