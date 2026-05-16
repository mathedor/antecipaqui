import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { PendenciasInbox } from "@/components/pendencias-inbox";
import {
  listAntecipacoesPendentes,
  listRenegociacoesPendentes,
} from "@/lib/actions/pendencias-decisao";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Pendências" };

export default async function AdminPendenciasPage() {
  const admin = await requireAdmin();
  const [antecipacoes, renegociacoes] = await Promise.all([
    listAntecipacoesPendentes(),
    listRenegociacoesPendentes(),
  ]);

  return (
    <AdminShell active="/admin/pendencias" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">decisões pendentes</div>
        <h1 className="text-display-md">
          Pendências de <span className="text-gradient-blue">decisão</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Antecipações e renegociações solicitadas pelas construtoras. Decida
          ou contate o fundo correspondente. Aprovar renegociação aplica a
          mudança automaticamente.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-pendencias" />
        </div>
      </div>

      <PendenciasInbox
        antecipacoes={antecipacoes}
        renegociacoes={renegociacoes}
        adminContext={true}
      />
    </AdminShell>
  );
}
