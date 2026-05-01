import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminEditUserForm } from "@/components/admin-edit-user-form";
import { RepositorioPanel } from "@/components/repositorio-panel";
import { getUserDetail } from "@/lib/actions/admin";
import { listRepositorioFiles } from "@/lib/actions/repositorio";

export const metadata = { title: "Admin · Editar usuário" };

function pickDoc<T extends { tipo: string; url: string; nomeOriginal: string }>(
  docs: T[],
  tipo: string,
) {
  const d = docs.find((x) => x.tipo === tipo);
  return d ? { url: d.url, name: d.nomeOriginal } : null;
}

type Params = { params: Promise<{ id: string }> };

export default async function AdminEditarUsuario({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getUserDetail(id);
  if (!detail) notFound();
  const repositorioFilesList = await listRepositorioFiles({ userId: id });

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
        initialDocs={{
          contratoSocial: pickDoc(detail.documentos, "contrato_social"),
          comprovanteEndereco: pickDoc(detail.documentos, "comprovante_endereco"),
          creci: pickDoc(detail.documentos, "creci"),
        }}
      />

      <div className="mt-8">
        <RepositorioPanel
          targetUserId={id}
          files={repositorioFilesList}
        />
      </div>
    </AdminShell>
  );
}
