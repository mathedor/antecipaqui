import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import {
  getAtendimento,
  listEventos,
} from "@/lib/actions/atendimentos";
import { getCurrentImobMembership } from "@/lib/actions/imobiliaria-membros";
import { AtendimentoDetail } from "@/components/dashboards/atendimento-detail";

export const metadata = { title: "Atendimento" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AtendimentoDetailPage({ params }: Params) {
  const user = await requireActiveUser();
  if (user.role !== "imobiliaria" && user.role !== "corretor")
    redirect("/painel");

  const me = await getCurrentImobMembership();
  if (!me) redirect("/painel/onboarding");

  const { id } = await params;
  const a = await getAtendimento(id);
  if (!a) notFound();
  const eventos = await listEventos(id);

  return (
    <PainelShell
      role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"}
      userName={user.nome}
      active="/painel/atendimentos"
    >
      <Link
        href="/painel/atendimentos"
        className="text-xs text-fg-muted hover:text-accent inline-block mb-3"
      >
        ← pipeline
      </Link>
      <AtendimentoDetail
        atendimento={a}
        eventos={eventos}
        currentUserId={user.id}
      />
    </PainelShell>
  );
}
