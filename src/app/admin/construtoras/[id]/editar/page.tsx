import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminEditConstrutoraForm } from "@/components/admin-edit-construtora-form";
import { getConstrutoraDetail } from "@/lib/actions/admin";

export const metadata = { title: "Admin · Editar construtora" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminEditarConstrutora({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getConstrutoraDetail(id);
  if (!detail) notFound();

  return (
    <AdminShell active="/admin/construtoras" userName={admin.nome}>
      <Link
        href={`/admin/construtoras/${id}`}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← {detail.construtora.razaoSocial}
      </Link>
      <h1 className="text-display-md mb-2">
        Editar <span className="text-gradient-blue">construtora</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Altere razão social, CNPJ, endereço e dados de contato.
      </p>

      <AdminEditConstrutoraForm construtora={detail.construtora} />
    </AdminShell>
  );
}
