import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminEditOperacaoForm } from "@/components/admin-edit-operacao-form";
import { getAdminOperacaoDetail } from "@/lib/actions/admin";

export const metadata = { title: "Admin · Editar operação" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminEditarOperacao({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const op = await getAdminOperacaoDetail(id);
  if (!op) notFound();

  return (
    <AdminShell active="/admin/operacoes" userName={admin.nome}>
      <Link
        href={`/admin/operacoes/${id}`}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← {op.numero}
      </Link>
      <h1 className="text-display-md mb-2">
        Editar <span className="text-gradient-blue">operação</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Ajuste valores, data e parcelas. O valor presente é recalculado no
        salvar — atenção: regerar contrato se já foi gerado.
      </p>

      <AdminEditOperacaoForm
        operacao={{
          id: op.id,
          numero: op.numero,
          valorVenda: op.valorVenda,
          valorComissao: op.valorComissao,
          dataVenda: op.dataVenda,
        }}
        parcelas={op.parcelas.map((p) => ({
          numero: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
        }))}
      />
    </AdminShell>
  );
}
