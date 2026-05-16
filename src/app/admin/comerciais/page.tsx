import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { ComerciaisTable } from "@/components/comerciais-table";
import { listAllComerciais } from "@/lib/actions/comerciais";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Comerciais" };

export default async function AdminComerciaisPage() {
  const admin = await requireAdmin();
  const list = await listAllComerciais();

  return (
    <AdminShell active="/admin/comerciais" userName={admin.nome}>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="eyebrow mb-2">comerciais</div>
          <h1 className="text-display-md">
            Equipe <span className="text-gradient-blue">comercial</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            {list.length} comercial(is) cadastrado(s).
          </p>
          <div className="mt-2">
            <PageHelp pageKey="admin-comerciais" />
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/comerciais/comissoes"
            className="inline-flex items-center h-11 px-4 rounded-lg border border-border bg-bg-elev text-fg text-sm font-semibold hover:border-accent transition-colors"
          >
            💼 Comissões
          </Link>
          <Link
            href="/admin/cadastrar/comercial"
            className="btn-primary !h-11 !px-5"
          >
            + Novo comercial
          </Link>
        </div>
      </div>

      <ComerciaisTable rows={list} />
    </AdminShell>
  );
}
