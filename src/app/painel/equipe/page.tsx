import { redirect } from "next/navigation";
import { PainelShell } from "@/components/painel-shell";
import { EquipeManager } from "@/components/equipe-manager";
import { listMembrosConstrutora } from "@/lib/actions/construtora-membros";
import {
  requireConstrutoraPermission,
  getConstrutoraAllowedNav,
} from "@/lib/construtora-permissions";

export const metadata = { title: "Equipe" };

export default async function EquipePage() {
  const { user, role } = await requireConstrutoraPermission("equipe");

  let data: Awaited<ReturnType<typeof listMembrosConstrutora>> | null = null;
  try {
    data = await listMembrosConstrutora();
  } catch {
    redirect("/painel/onboarding");
  }
  if (!data) redirect("/painel/onboarding");

  // Só o owner pode gerenciar equipe (sistema simples por enquanto)
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
          painel da sua construtora. Cada role vê apenas a área pertinente:
          financeiro tem duplicatas/extrato/forecast; comercial tem operações/
          empreendimentos; jurídico tem documentos/pendências.
        </p>
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
