import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminFundoForm } from "@/components/admin-fundo-form";
import { FundoCustosPadraoEditor } from "@/components/fundo-custos-padrao-editor";
import { listCustosPadraoFundo } from "@/lib/actions/fundo-custos-padrao";

export const metadata = { title: "Admin · Editar fundo" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminEditarFundo({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, id))
    .limit(1);
  if (!fundo) notFound();

  const custosPadrao = await listCustosPadraoFundo(id);

  return (
    <AdminShell active="/admin/fundos" userName={admin.nome}>
      <Link
        href={`/admin/fundos/${id}`}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← {fundo.razaoSocial}
      </Link>
      <h1 className="text-display-md mb-2">
        Editar <span className="text-gradient-blue">fundo</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Dados, taxa, encargos de atraso, cobrança e custos padrão.
      </p>

      <AdminFundoForm fundo={fundo} />

      <div className="mt-8">
        <FundoCustosPadraoEditor
          fundoId={id}
          custos={custosPadrao.map((c) => ({
            id: c.id,
            fundoId: c.fundoId,
            titulo: c.titulo,
            valor: c.valor,
            ordem: c.ordem,
          }))}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-bg-elev p-6">
        <h3 className="font-bold mb-1">CNAB — remessa/retorno</h3>
        <p className="text-xs text-fg-muted mb-4">
          Acesse a tela dedicada pra gerar arquivo de remessa com parcelas
          pendentes ou importar arquivo de retorno do banco.
        </p>
        <Link
          href={`/admin/fundos/${id}/cnab`}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold text-fg hover:border-accent hover:text-accent"
        >
          📂 Abrir CNAB →
        </Link>
      </div>
    </AdminShell>
  );
}
