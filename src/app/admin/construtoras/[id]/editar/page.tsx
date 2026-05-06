import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminEditConstrutoraForm } from "@/components/admin-edit-construtora-form";
import { RepositorioPanel } from "@/components/repositorio-panel";
import { getConstrutoraDetail } from "@/lib/actions/admin";
import { listRepositorioFiles } from "@/lib/actions/repositorio";
import { listFundosForSelector } from "@/lib/actions/fundos";

export const metadata = { title: "Admin · Editar construtora" };

type Params = { params: Promise<{ id: string }> };

function pickDoc<T extends { tipo: string; url: string; nomeOriginal: string }>(
  docs: T[],
  tipo: string,
) {
  const d = docs.find((x) => x.tipo === tipo);
  return d ? { url: d.url, name: d.nomeOriginal } : null;
}

export default async function AdminEditarConstrutora({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getConstrutoraDetail(id);
  if (!detail) notFound();
  const [repositorioFilesList, fundos] = await Promise.all([
    listRepositorioFiles({ construtoraId: id }),
    listFundosForSelector(),
  ]);

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
        Altere razão social, CNPJ, endereço, dados de contato e documentos.
      </p>

      <AdminEditConstrutoraForm
        construtora={detail.construtora}
        initialDocs={{
          contratoSocial: pickDoc(detail.documentos, "contrato_social"),
          comprovanteEndereco: pickDoc(detail.documentos, "comprovante_endereco"),
        }}
        fundos={fundos}
      />

      <div className="mt-8">
        <RepositorioPanel
          targetConstrutoraId={id}
          files={repositorioFilesList}
        />
      </div>
    </AdminShell>
  );
}
