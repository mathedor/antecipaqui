import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import {
  listImpersonatableUsers,
  listRecentImpersonations,
} from "@/lib/actions/admin-impersonate";
import { ImpersonationPicker } from "@/components/admin-impersonation-picker";

export const metadata = { title: "Admin · Visualizar como" };
export const dynamic = "force-dynamic";

type Search = {
  searchParams: Promise<{ q?: string; role?: string }>;
};

export default async function AdminVisaoPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const { q, role } = await searchParams;

  const [users, recentes] = await Promise.all([
    listImpersonatableUsers({ search: q, role }),
    listRecentImpersonations(),
  ]);

  return (
    <AdminShell active="/admin/visao" userName={admin.nome}>
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow mb-2">visualizar como · suporte</div>
          <h1 className="text-display-md">
            Acesse a view de{" "}
            <span className="text-gradient-blue">qualquer cliente</span>
          </h1>
          <p className="mt-2 text-fg-muted max-w-2xl">
            Use pra resolver tickets ou debugar comportamento sem precisar do
            login do cliente. Toda ação feita em modo visão é auditada com seu
            ID (admin). Sessão expira em 4 horas.{" "}
            <span className="text-warn font-semibold">
              Email/SMS suprimidos durante a visão
            </span>{" "}
            — cliente não recebe notificação disparada por você.
          </p>
        </div>
        <Link
          href="/admin/visao/historico"
          className="inline-flex items-center gap-1 h-10 px-4 rounded-lg border border-border bg-bg-elev text-fg text-sm font-semibold hover:border-accent hover:text-accent shrink-0"
        >
          📜 histórico
        </Link>
      </div>

      <ImpersonationPicker
        users={users}
        recentes={recentes}
        currentSearch={q ?? ""}
        currentRole={role ?? "_all_"}
      />
    </AdminShell>
  );
}
