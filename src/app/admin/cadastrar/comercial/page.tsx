import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminCadastrarComercialForm } from "@/components/admin-cadastrar-comercial-form";

export const metadata = { title: "Admin · Cadastrar comercial" };

export default async function AdminCadastrarComercialPage() {
  const admin = await requireAdmin();

  return (
    <AdminShell active="/admin/cadastrar" userName={admin.nome}>
      <Link
        href="/admin/cadastrar"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← cadastrar
      </Link>
      <h1 className="text-display-md mb-2">
        Cadastrar <span className="text-gradient-blue">comercial</span>
      </h1>
      <p className="text-fg-muted mb-8 max-w-2xl">
        Membro da equipe comercial (interna ou parceira). Pode ser pessoa
        física ou jurídica. Recebe convite Clerk por email pra definir senha
        e acessar o painel.
      </p>

      <AdminCadastrarComercialForm />
    </AdminShell>
  );
}
