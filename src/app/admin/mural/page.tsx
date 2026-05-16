import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminMuralForm } from "@/components/admin-mural-form";
import { AdminMuralList } from "@/components/admin-mural-list";
import { listAllMuralMessages } from "@/lib/actions/mural";
import { PageHelp } from "@/components/page-help";

export const metadata = {
  title: "Admin · Mural de recados",
};

export default async function AdminMuralPage() {
  const admin = await requireAdmin();
  const messages = await listAllMuralMessages();

  return (
    <AdminShell active="/admin/mural" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">comunicação</div>
        <h1 className="text-display-md">
          Mural de <span className="text-gradient-blue">recados</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Recados aparecem como banner deslizante no dashboard do destinatário
          (imobiliária / corretor e/ou construtora). Útil pra avisar de nova
          taxa, cashback do dia, mudanças de fluxo etc.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-mural" />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <section className="rounded-2xl border border-accent/30 bg-accent-soft p-6 sticky top-24">
            <h2 className="font-bold mb-4 tracking-tight">
              Novo recado
            </h2>
            <AdminMuralForm mode="create" />
          </section>
        </div>
        <div className="lg:col-span-7">
          <h2 className="font-bold mb-4 tracking-tight">
            Recados ({messages.length})
          </h2>
          <AdminMuralList messages={messages} />
        </div>
      </div>
    </AdminShell>
  );
}
