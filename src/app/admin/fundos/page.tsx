import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminFundosTable } from "@/components/admin-fundos-table";
import { listAllFundos } from "@/lib/actions/fundos";

export const metadata = { title: "Admin · Fundos" };

export default async function AdminFundosPage() {
  const admin = await requireAdmin();
  const list = await listAllFundos();

  return (
    <AdminShell active="/admin/fundos" userName={admin.nome}>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="eyebrow mb-2">fundos</div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Fundos</span> investidores
          </h1>
          <p className="mt-2 text-fg-muted">
            {list.length} {list.length === 1 ? "fundo" : "fundos"} cadastrado
            {list.length === 1 ? "" : "s"} — cada um com taxa-base, contrato e
            login próprios
          </p>
        </div>
        <Link href="/admin/fundos/novo" className="btn-primary !h-11 !px-5">
          + Novo fundo
        </Link>
      </div>

      <AdminFundosTable rows={list} />
    </AdminShell>
  );
}
