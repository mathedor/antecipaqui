import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { listAllConstrutoras } from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Construtoras",
};

const STATUS_DISPLAY: Record<string, { label: string; class: string }> = {
  pendente: { label: "Sem dono", class: "bg-bg-soft text-fg-dim border-border" },
  documentos_enviados: {
    label: "Aguardando análise",
    class: "bg-yellow-50 text-warn border-yellow-200",
  },
  aprovado: {
    label: "Aprovada",
    class: "bg-green-50 text-success border-green-200",
  },
  recusado: {
    label: "Recusada",
    class: "bg-red-50 text-danger border-red-200",
  },
};

export default async function AdminConstrutorasPage() {
  const admin = await requireAdmin();
  const list = await listAllConstrutoras();

  return (
    <AdminShell active="/admin/construtoras" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">construtoras</div>
        <h1 className="text-display-md">
          Todas as <span className="text-gradient-blue">construtoras</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          {list.length} {list.length === 1 ? "construtora" : "construtoras"}{" "}
          cadastradas
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border bg-bg-card">
          <div className="col-span-4">Razão social</div>
          <div className="col-span-3">CNPJ</div>
          <div className="col-span-2">Dono</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Ações</div>
        </div>
        <ul>
          {list.map((c) => {
            const status =
              STATUS_DISPLAY[c.onboardingStatus] ?? STATUS_DISPLAY.pendente;
            return (
              <li
                key={c.id}
                className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors items-center border-b border-border last:border-0"
              >
                <Link
                  href={`/admin/construtoras/${c.id}`}
                  className="col-span-7 md:col-span-4 text-sm text-fg truncate hover:text-accent"
                >
                  <div className="truncate">{c.razaoSocial}</div>
                  {c.nomeFantasia && (
                    <div className="text-fg-muted text-xs truncate">
                      {c.nomeFantasia}
                    </div>
                  )}
                </Link>
                <div className="hidden md:block col-span-3 font-mono text-xs text-fg-muted">
                  {c.cnpj}
                </div>
                <div className="hidden md:block col-span-2 text-xs text-fg-muted">
                  {c.ownerUserId ? "✓ tem" : "—"}
                </div>
                <div className="col-span-4 md:col-span-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${status.class}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="hidden md:flex col-span-1 justify-end gap-2">
                  <Link
                    href={`/admin/construtoras/${c.id}/editar`}
                    className="text-xs text-accent hover:underline"
                  >
                    editar
                  </Link>
                </div>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="px-6 py-12 text-center text-fg-muted">
              Nenhuma construtora cadastrada ainda.
            </li>
          )}
        </ul>
      </div>
    </AdminShell>
  );
}
