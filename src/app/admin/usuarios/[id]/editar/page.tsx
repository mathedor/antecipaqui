import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminEditUserForm } from "@/components/admin-edit-user-form";
import { getUserDetail } from "@/lib/actions/admin";

export const metadata = { title: "Admin · Editar usuário" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminEditarUsuario({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();

  return (
    <AdminShell active="/admin/usuarios" userName={admin.nome}>
      <Link
        href={`/admin/usuarios/${id}`}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← {detail.user.nome ?? detail.user.email}
      </Link>
      <h1 className="text-display-md mb-2">
        Editar <span className="text-gradient-blue">cadastro</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Altere os dados pessoais e da imobiliária. Cuidado: mudar a role troca
        a navegação que esse usuário vê no painel.
      </p>

      <AdminEditUserForm
        user={detail.user}
        imobiliaria={detail.imobiliaria ?? null}
      />
    </AdminShell>
  );
}
