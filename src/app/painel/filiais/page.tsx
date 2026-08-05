import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PageHelp } from "@/components/page-help";
import { FiliaisManager } from "@/components/dashboards/filiais-manager";
import { getGrupoDaImob } from "@/lib/actions/imobiliaria-filiais";

export const metadata = { title: "Matriz e filiais" };
export const dynamic = "force-dynamic";

export default async function FiliaisPage() {
  const user = await requireActiveUser();
  if (user.role !== "imobiliaria" && user.role !== "corretor") {
    redirect("/painel");
  }

  const grupo = await getGrupoDaImob();
  if (!grupo) redirect("/painel/onboarding");

  return (
    <PainelShell
      role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"}
      userName={user.nome}
      active="/painel/filiais"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">cadastro · grupo econômico</div>
        <h1 className="text-display-md">
          Matriz e <span className="text-gradient-blue">filiais</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Um cadastro só para o grupo inteiro. A matriz administra, cada filial
          entra com o CNPJ dela, e na hora de antecipar você escolhe de qual
          unidade é a operação — o fluxo segue igual.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-filiais" />
        </div>
      </div>

      <FiliaisManager grupo={grupo} />
    </PainelShell>
  );
}
