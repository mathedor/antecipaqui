import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comerciais } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminCadastrarComercialForm } from "@/components/admin-cadastrar-comercial-form";

export const metadata = { title: "Admin · Editar comercial" };

type Params = { params: Promise<{ id: string }> };

export default async function AdminEditarComercial({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [c] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.id, id))
    .limit(1);
  if (!c) notFound();

  return (
    <AdminShell active="/admin/comerciais" userName={admin.nome}>
      <Link
        href={`/admin/comerciais/${id}`}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← {c.nomeCompleto}
      </Link>
      <h1 className="text-display-md mb-2">
        Editar <span className="text-gradient-blue">comercial</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Altera dados, contatos e endereço. O email é também o login.
      </p>

      <AdminCadastrarComercialForm comercial={c} />
    </AdminShell>
  );
}
