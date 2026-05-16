import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { CreditoConsultaForm } from "@/components/credito-consulta-form";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Análise de crédito" };

export default async function CreditoPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="/admin/credito" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">análise de crédito</div>
        <h1 className="text-display-md">
          Consulta de <span className="text-gradient-blue">crédito</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Avaliação de risco de cedentes e construtoras. Score 0-1000 +
          número de restrições. Cache por 30 dias por documento. Stub
          provider — Serasa/Boa Vista quando contratado.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-credito" />
        </div>
      </div>
      <CreditoConsultaForm />
    </AdminShell>
  );
}
