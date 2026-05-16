import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { getAtendimentoParaConstrutora } from "@/lib/actions/atendimento-construtoras";
import { AtendimentoParceiroDetail } from "@/components/dashboards/atendimento-parceiro-detail";

export const metadata = { title: "Atendimento parceiro" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ atendimentoId: string }> };

export default async function AtendimentoParceiroDetailPage({
  params,
}: Params) {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");

  const { atendimentoId } = await params;
  const data = await getAtendimentoParaConstrutora(atendimentoId);
  if (!data) notFound();

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/atendimentos-parceiros"
    >
      <Link
        href="/painel/atendimentos-parceiros"
        className="text-xs text-fg-muted hover:text-accent inline-block mb-3"
      >
        ← atendimentos parceiros
      </Link>
      <AtendimentoParceiroDetail
        atendimento={data.atendimento}
        vinculo={data.vinculo}
        imob={data.imob}
        corretor={data.corretor}
        eventos={data.eventos}
      />
    </PainelShell>
  );
}
