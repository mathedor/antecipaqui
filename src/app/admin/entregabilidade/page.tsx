import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { PageHelp } from "@/components/page-help";
import { AdminEntregabilidade } from "@/components/admin-entregabilidade";
import { getEmailHealth } from "@/lib/actions/email-health";

export const metadata = { title: "Admin · Entrega de e-mail" };
export const dynamic = "force-dynamic";

export default async function AdminEntregabilidadePage() {
  const admin = await requireAdmin();
  const health = await getEmailHealth();

  return (
    <AdminShell active="/admin/entregabilidade" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">saúde · e-mail</div>
        <h1 className="text-display-md">
          Entrega de <span className="text-gradient-blue">e-mail</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Se o domínio remetente não estiver verificado, o provedor recusa todos
          os envios e ninguém recebe nada. Esta tela mostra o estado do domínio e
          todo e-mail que não saiu.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-entregabilidade" />
        </div>
      </div>

      <AdminEntregabilidade health={health} />
    </AdminShell>
  );
}
