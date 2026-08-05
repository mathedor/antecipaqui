import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PageHelp } from "@/components/page-help";
import { EquipeManager } from "@/components/equipe-manager";
import { listMembrosConstrutora } from "@/lib/actions/construtora-membros";
import {
  requireConstrutoraPermission,
  getConstrutoraAllowedNav,
} from "@/lib/construtora-permissions";
import { EquipeImobManager } from "@/components/dashboards/equipe-imob-manager";
import {
  getCurrentImobMembership,
  listMembrosDaImob,
} from "@/lib/actions/imobiliaria-membros";
import { unidadeLabel } from "@/lib/imobiliaria-perms";

export const metadata = { title: "Equipe" };
export const dynamic = "force-dynamic";

export default async function EquipePage() {
  const user = await requireActiveUser();

  // Imobiliária / corretor — fluxo novo
  if (user.role === "imobiliaria" || user.role === "corretor") {
    const me = await getCurrentImobMembership();
    if (!me) redirect("/painel/onboarding");
    const membros = await listMembrosDaImob();
    return (
      <PainelShell
        role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"}
        userName={user.nome}
        active="/painel/equipe"
      >
        <div className="mb-6">
          <div className="eyebrow mb-2">equipe · {me.imobiliariaRazaoSocial}</div>
          <h1 className="text-display-md">
            Seu <span className="text-gradient-blue">time</span>
          </h1>
          <p className="mt-2 text-fg-muted max-w-2xl">
            Convide corretores e gerentes pra acessarem a imobiliária. Cada
            role tem permissões diferentes — corretor só vê os atendimentos
            dele, financeiro foca em extrato, owner manda em tudo.
          </p>
          <div className="mt-2">
            <PageHelp pageKey="painel-equipe-imob" />
          </div>
        </div>
        <EquipeImobManager
          membros={membros}
          canManage={me.canManageMembros}
          unidades={me.unidades.map((u) => ({
            id: u.id,
            label: unidadeLabel(u),
          }))}
        />
      </PainelShell>
    );
  }

  // Construtora — fluxo legado
  if (user.role !== "construtora") redirect("/painel");

  const { role } = await requireConstrutoraPermission("equipe");

  let data: Awaited<ReturnType<typeof listMembrosConstrutora>> | null = null;
  try {
    data = await listMembrosConstrutora();
  } catch {
    redirect("/painel/onboarding");
  }
  if (!data) redirect("/painel/onboarding");

  const isOwner = data.owner?.id === user.id;

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/equipe"
      allowedHrefs={getConstrutoraAllowedNav(role)}
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">equipe</div>
        <h1 className="text-display-md">
          Seu <span className="text-gradient-blue">time</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Convide colegas (financeiro, comercial, jurídico) pra acessarem o
          painel da sua construtora. Cada role vê apenas a área pertinente.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-equipe-construtora" />
        </div>
      </div>

      <EquipeManager
        owner={
          data.owner
            ? {
                id: data.owner.id,
                nome: data.owner.nome,
                email: data.owner.email,
                telefone: data.owner.telefone,
              }
            : null
        }
        membros={data.membros.map((m) => ({
          id: m.id,
          userId: m.userId,
          roleInterna: m.roleInterna,
          nome: m.nome,
          email: m.email,
          telefone: m.telefone,
          addedAt: m.addedAt,
          aceitoEm: m.aceitoEm,
        }))}
        canManage={isOwner}
      />
    </PainelShell>
  );
}
