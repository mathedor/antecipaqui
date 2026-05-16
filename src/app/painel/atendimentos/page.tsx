import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listAtendimentos } from "@/lib/actions/atendimentos";
import {
  getCurrentImobMembership,
  listCorretoresDoTime,
} from "@/lib/actions/imobiliaria-membros";
import { AtendimentosKanban } from "@/components/dashboards/atendimentos-kanban";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Atendimentos" };
export const dynamic = "force-dynamic";

export default async function AtendimentosPage() {
  const user = await requireActiveUser();
  if (user.role !== "imobiliaria" && user.role !== "corretor")
    redirect("/painel");

  const me = await getCurrentImobMembership();
  if (!me) redirect("/painel/onboarding");

  const [atendimentos, corretores] = await Promise.all([
    listAtendimentos(),
    listCorretoresDoTime(),
  ]);

  return (
    <PainelShell
      role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"}
      userName={user.nome}
      active="/painel/atendimentos"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">atendimentos · CRM</div>
        <h1 className="text-display-md">
          Pipeline de{" "}
          <span className="text-gradient-blue">vendas</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          {me.canSeeAllAtendimentos
            ? "Todos os atendimentos da imobiliária. Filtre por corretor pra acompanhar quem está vendendo. Cada card vira uma operação encaminhada pra antecipação no fim do funil."
            : "Seus atendimentos. Conforme avança nas etapas, registre cada movimentação na timeline pra não perder histórico."}
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-atendimentos" />
        </div>
      </div>
      <AtendimentosKanban
        initialAtendimentos={atendimentos}
        corretores={corretores}
        canSeeAll={me.canSeeAllAtendimentos}
        currentUserId={user.id}
      />
    </PainelShell>
  );
}
