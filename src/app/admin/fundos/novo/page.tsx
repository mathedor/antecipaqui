import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { FundoOnboardingWizard } from "@/components/fundo-onboarding-wizard";

export const metadata = { title: "Admin · Novo fundo" };

export default async function AdminNovoFundoPage() {
  const admin = await requireAdmin();
  return (
    <AdminShell active="/admin/fundos" userName={admin.nome}>
      <Link
        href="/admin/fundos"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← fundos
      </Link>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-display-md mb-2">
            Novo <span className="text-gradient-blue">fundo</span>
          </h1>
          <p className="text-fg-muted max-w-2xl">
            Wizard guiado em 6 passos. Cole o CNPJ no primeiro passo e
            preenchemos quase tudo automaticamente via Receita Federal.
          </p>
        </div>
        <Link
          href="/admin/fundos/novo/avancado"
          className="text-xs text-fg-muted hover:text-accent shrink-0 font-mono uppercase tracking-wider"
        >
          modo avançado →
        </Link>
      </div>

      <FundoOnboardingWizard />
    </AdminShell>
  );
}
