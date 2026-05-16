import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PageHelp } from "@/components/page-help";
import { EmpreendimentosManager } from "@/components/empreendimentos-manager";
import { listEmpreendimentosDaConstrutora } from "@/lib/actions/construtora-operacional";

export const metadata = { title: "Empreendimentos" };

export default async function EmpreendimentosPage() {
  const user = await requireActiveUser();
  if (user.role !== "construtora") redirect("/painel");

  const empreendimentos = await listEmpreendimentosDaConstrutora();

  return (
    <PainelShell
      role="construtora"
      userName={user.nome}
      active="/painel/empreendimentos"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">empreendimentos</div>
        <h1 className="text-display-md">
          Seus <span className="text-gradient-blue">projetos</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Agrupe operações por torre, condomínio ou loteamento. Cada operação
          pode ser linkada a um empreendimento — facilita relatórios e
          filtragem.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-empreendimentos" />
        </div>
      </div>

      <EmpreendimentosManager
        empreendimentos={empreendimentos.map((e) => ({
          id: e.id,
          nome: e.nome,
          descricao: e.descricao,
          cidade: e.cidade,
          uf: e.uf,
          isActive: e.isActive,
        }))}
      />
    </PainelShell>
  );
}
