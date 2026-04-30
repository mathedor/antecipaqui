import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { listConstrutorasForSelect } from "@/lib/actions/operacoes";
import { NovaOperacaoForm } from "@/components/nova-operacao-form";
import { PainelShell } from "@/components/painel-shell";

export const metadata = {
  title: "Nova operação",
};

export default async function NovaOperacaoPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  if (user.onboardingStatus === "pendente") {
    redirect("/painel/onboarding");
  }

  const construtoras = await listConstrutorasForSelect();

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  return (
    <PainelShell
      role={role}
      userName={user.nome}
      active="/painel/operacoes/nova"
    >
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            Nova <span className="text-gradient-blue">operação</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Preencha os dados da venda. O valor presente é calculado em tempo
            real conforme você digita.
          </p>
        </div>
      </div>

      <NovaOperacaoForm construtoras={construtoras} />
    </PainelShell>
  );
}
