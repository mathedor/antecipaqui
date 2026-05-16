import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { AdminFundoForm } from "@/components/admin-fundo-form";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Admin · Novo fundo (avançado)" };

export default async function AdminNovoFundoAvancadoPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="/admin/fundos" userName={admin.nome}>
      <Link
        href="/admin/fundos/novo"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← Voltar pro wizard guiado
      </Link>
      <h1 className="text-display-md mb-2">
        Novo <span className="text-gradient-blue">fundo</span> · avançado
      </h1>
      <p className="text-fg-muted mb-8 max-w-2xl">
        Formulário completo com todos os campos numa tela só. Use o{" "}
        <Link
          href="/admin/fundos/novo"
          className="text-accent hover:underline"
        >
          wizard guiado
        </Link>{" "}
        se quiser passos curtos com auto-preenchimento via CNPJ.
      </p>
      <div className="mt-2 mb-6">
        <PageHelp pageKey="admin-fundos-novo" />
      </div>

      <AdminFundoForm />
    </AdminShell>
  );
}
