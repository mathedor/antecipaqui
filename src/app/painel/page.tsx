import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { CorretorDashboard } from "@/components/dashboards/corretor-dashboard";
import { ConstrutoraDashboard } from "@/components/dashboards/construtora-dashboard";
import { FundoDashboard } from "@/components/dashboards/fundo-dashboard";

export const metadata = {
  title: "Painel",
};

export default async function PainelPage() {
  const user = await requireActiveUser();

  // Admin → /admin
  if (user.role === "admin") {
    redirect("/admin");
  }

  // Onboarding pendente → vai direto pra escolha de tipo + dados
  // Fundo nunca passa por onboarding (admin já cadastrou os dados)
  if (user.role !== "fundo" && user.onboardingStatus === "pendente") {
    redirect("/painel/onboarding");
  }

  if (user.role === "fundo") {
    return <FundoDashboard user={user} />;
  }

  if (user.role === "construtora") {
    return <ConstrutoraDashboard user={user} />;
  }

  return <CorretorDashboard user={user} />;
}
