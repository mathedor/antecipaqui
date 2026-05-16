import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos as fundosTable } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { getComercialDesempenho } from "@/lib/actions/comercial-desempenho";
import { ComercialDesempenhoPanel } from "@/components/dashboards/comercial-desempenho-panel";

export const metadata = { title: "Admin · Desempenho do comercial" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function AdminComercialDesempenhoPage({
  params,
}: Params) {
  const admin = await requireAdmin();
  const { id } = await params;

  const d = await getComercialDesempenho(id);
  if (!d) notFound();

  let fundoNome: string | null = null;
  if (d.fundoId) {
    const [f] = await db
      .select({
        nomeFantasia: fundosTable.nomeFantasia,
        razaoSocial: fundosTable.razaoSocial,
      })
      .from(fundosTable)
      .where(eq(fundosTable.id, d.fundoId))
      .limit(1);
    if (f) fundoNome = f.nomeFantasia ?? f.razaoSocial;
  }

  return (
    <AdminShell active="/admin/comerciais" userName={admin.nome}>
      <div className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/admin/comerciais/${id}`}
            className="text-xs text-fg-muted hover:text-accent"
          >
            ← {d.nome}
          </Link>
          <div className="eyebrow mt-2 mb-2">acompanhamento · 360</div>
          <h1 className="text-display-md">
            Desempenho{" "}
            <span className="text-gradient-blue">{d.nome}</span>
          </h1>
        </div>
      </div>
      <ComercialDesempenhoPanel d={d} fundoNome={fundoNome} />
    </AdminShell>
  );
}
