import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listMyLeads } from "@/lib/actions/comercial-leads";
import { LeadsKanban } from "@/components/dashboards/comercial-leads-kanban";

export const metadata = { title: "Prospecção" };
export const dynamic = "force-dynamic";

export default async function ComercialProspeccaoPage() {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  const leads = await listMyLeads();

  return (
    <PainelShell
      role="comercial"
      userName={user.nome}
      active="/painel/prospeccao"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">prospecção · pipeline</div>
        <h1 className="text-display-md">
          Pipeline de <span className="text-gradient-blue">vendas</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Registre leads que ainda não viraram clientes e mova pelo funil
          conforme avança. Quando virar fechado, vincule à imobiliária
          cadastrada pra trackear o ROI da prospecção.
        </p>
      </div>
      <LeadsKanban initialLeads={leads} />
    </PainelShell>
  );
}
