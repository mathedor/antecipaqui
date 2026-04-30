import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { NovoTicketForm } from "@/components/novo-ticket-form";

export const metadata = {
  title: "Novo ticket",
};

export default async function NovoTicketPage() {
  const user = await requireActiveUser();
  if (user.role === "admin") redirect("/admin/tickets");

  const role = (
    user.role === "construtora"
      ? "construtora"
      : user.role === "imobiliaria"
        ? "imobiliaria"
        : "corretor"
  ) as "construtora" | "corretor" | "imobiliaria";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/suporte">
      <Link
        href="/painel/suporte"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← suporte
      </Link>
      <h1 className="text-display-md mb-2">
        Abrir <span className="text-gradient-blue">ticket</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Conta com calma o que aconteceu. O time responde em até 1 dia útil.
      </p>

      <NovoTicketForm />
    </PainelShell>
  );
}
