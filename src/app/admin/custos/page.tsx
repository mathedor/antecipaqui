import { requireAdminArea } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { CustosPanel } from "@/components/custos-panel";
import { PageHelp } from "@/components/page-help";

export const metadata = {
  title: "Admin · Custos & Desenvolvimento",
};

/** Mês corrente (YYYY-MM) no fuso de São Paulo. */
function mesCorrenteSP() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  return fmt.format(new Date()).slice(0, 7);
}

export default async function AdminCustosPage() {
  const admin = await requireAdminArea("configuracoes");

  return (
    <AdminShell active="/admin/custos" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">custos &amp; desenvolvimento</div>
        <h1 className="text-display-md">
          Quanto a plataforma{" "}
          <span className="text-gradient-blue">custou e custa</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          O investimento inicial, as contas fixas de cada mês e tudo que foi
          entregue depois do lançamento — entrega por entrega, com data e
          valor. Marque o que já foi pago; a marcação fica salva neste
          navegador.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-custos" />
        </div>
      </div>

      <CustosPanel mesCorrente={mesCorrenteSP()} />
    </AdminShell>
  );
}
