import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { listAllUsers } from "@/lib/actions/admin";

export const metadata = {
  title: "Admin · Usuários",
};

const STATUS_DISPLAY: Record<string, { label: string; class: string }> = {
  pendente: {
    label: "Pendente",
    class: "bg-bg-soft text-fg-dim border-border",
  },
  documentos_enviados: {
    label: "Aguardando análise",
    class: "bg-yellow-50 text-warn border-yellow-200",
  },
  aprovado: {
    label: "Aprovado",
    class: "bg-green-50 text-success border-green-200",
  },
  recusado: {
    label: "Recusado",
    class: "bg-red-50 text-danger border-red-200",
  },
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Admin",
};

export default async function AdminUsuariosPage() {
  const admin = await requireAdmin();
  const all = await listAllUsers();
  const corretoresImob = all.filter(
    (u) => u.role === "corretor" || u.role === "imobiliaria",
  );
  const construtoraUsers = all.filter((u) => u.role === "construtora");
  const adminUsers = all.filter((u) => u.role === "admin");

  return (
    <AdminShell active="/admin/usuarios" userName={admin.nome}>
      <div className="mb-8">
        <div className="eyebrow mb-2">usuários</div>
        <h1 className="text-display-md">
          Corretores & <span className="text-gradient-blue">imobiliárias</span>
        </h1>
        <p className="mt-2 text-fg-muted">
          {corretoresImob.length} corretores/imobiliárias · {construtoraUsers.length} construtoras · {adminUsers.length} admin{adminUsers.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-bg-elev overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 text-[10px] uppercase tracking-wider text-fg-dim font-mono border-b border-border bg-bg-card">
          <div className="col-span-3">Nome</div>
          <div className="col-span-3">Email</div>
          <div className="col-span-2">Tipo</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Operações</div>
          <div className="col-span-1"></div>
        </div>
        <ul>
          {all.map((u) => {
            const status =
              STATUS_DISPLAY[u.onboardingStatus] ?? STATUS_DISPLAY.pendente;
            return (
              <li key={u.id} className="border-b border-border last:border-0">
                <Link
                  href={`/admin/usuarios/${u.id}`}
                  className="grid grid-cols-12 gap-3 px-6 py-4 hover:bg-bg-card transition-colors group items-center"
                >
                  <div className="col-span-6 md:col-span-3 text-sm text-fg truncate">
                    {u.nome ?? "(sem nome)"}
                  </div>
                  <div className="hidden md:block col-span-3 font-mono text-xs text-fg-muted truncate">
                    {u.email}
                  </div>
                  <div className="col-span-3 md:col-span-2 text-sm text-fg-muted">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${status.class}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <div className="hidden md:block col-span-1 text-right text-sm tabular font-mono">
                    {u.totalOperacoes}
                  </div>
                  <div className="hidden md:block col-span-1 text-right text-fg-dim group-hover:text-accent group-hover:translate-x-1 transition-all">
                    →
                  </div>
                </Link>
              </li>
            );
          })}
          {all.length === 0 && (
            <li className="px-6 py-12 text-center text-fg-muted">
              Nenhum usuário cadastrado ainda.
            </li>
          )}
        </ul>
      </div>
    </AdminShell>
  );
}
