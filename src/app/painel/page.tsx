import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { CorretorDashboard } from "@/components/dashboards/corretor-dashboard";
import { ConstrutoraDashboard } from "@/components/dashboards/construtora-dashboard";

export const metadata = {
  title: "Painel",
};

export default async function PainelPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  if (user.role === "construtora") {
    return <ConstrutoraDashboard user={user} />;
  }

  // Default: corretor / imobiliaria / admin
  return <CorretorDashboard user={user} />;
}
