import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { DiagnosticoSeguranca } from "@/components/diagnostico-seguranca";
import { rodarDiagnosticoAdmin } from "@/lib/seguranca/runner";

export const metadata = { title: "Admin · Central de Segurança" };
export const dynamic = "force-dynamic";

export default async function SegurancaPage() {
  const admin = await requireAdmin();

  return (
    <AdminShell active="/admin/seguranca" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">admin · diagnóstico</div>
        <h1 className="text-display-md">
          Central de <span className="text-gradient-blue">Segurança</span>
        </h1>
        <p className="text-fg-muted mt-2 max-w-2xl">
          Os robôs varrem cada frente do sistema — conexão, login, permissões,
          crons, webhooks, integração com fundos, segredos e robustez dos
          dados — e dizem, área por área, se está firme, se pede atenção ou se
          quebrou. Rode antes de um deploy grande, depois de mexer em
          configuração, ou sempre que quiser dormir tranquilo.
        </p>
      </div>

      <DiagnosticoSeguranca rodar={rodarDiagnosticoAdmin} />
    </AdminShell>
  );
}
