import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminCadastrarImobForm } from "@/components/admin-cadastrar-imob-form";

export const metadata = { title: "Admin · Cadastrar imobiliária" };

export default async function AdminCadastrarImobPage() {
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
        Cadastrar <span className="text-gradient-blue">imobiliária / corretor</span>
      </h1>
      <p className="text-fg-muted mb-8 max-w-2xl">
        Cria a empresa cedente + dispara convite Clerk pro responsável definir
        senha e acessar o painel.
      </p>

      <AdminCadastrarImobForm />
    </AdminShell>
  );
}
