import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminFundoForm } from "@/components/admin-fundo-form";

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
        Altere dados, taxa-base, contato ou contrato modelo.
      </p>

      <AdminFundoForm fundo={fundo} />
    </AdminShell>
  );
}
