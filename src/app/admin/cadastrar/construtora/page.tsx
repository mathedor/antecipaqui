import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminCadastrarConstrutoraForm } from "@/components/admin-cadastrar-construtora-form";

export const metadata = { title: "Admin · Cadastrar construtora" };

export default async function AdminCadastrarConstrutoraPage() {
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
        Cadastrar <span className="text-gradient-blue">construtora</span>
      </h1>
      <p className="text-fg-muted mb-8 max-w-2xl">
        Cadastra a construtora no banco. Email comercial recebe convite pra completar
        contrato social, comprovante de endereço, etc.
      </p>

      <AdminCadastrarConstrutoraForm />
    </AdminShell>
  );
}
