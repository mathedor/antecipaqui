import { requireSuperAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { listAdmins } from "@/lib/actions/admin-users";
import {
  ADMIN_PROFILE_LABEL,
  resolveAdminProfile,
} from "@/lib/admin-permissions";
import {
  InviteAdminForm,
  EditAdminProfileForm,
  RevokeAdminButton,
  ToggleAdminActiveButton,
} from "@/components/admin-users-form";

export const metadata = { title: "Admin · Administradores" };

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const PROFILE_BADGE: Record<string, string> = {
  super: "bg-accent-soft text-accent border-accent/40",
  financeiro: "bg-green-50 text-success border-success/40",
  operacoes: "bg-violet-50 text-violet-700 border-violet-300",
  suporte: "bg-yellow-50 text-warn border-warn/40",
};

export default async function AdminUsersPage() {
  const me = await requireSuperAdmin();
  const admins = await listAdmins();

  return (
    <AdminShell active="/admin/usuarios" userName={me.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">acessos · interno</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Administradores</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Gerencie quem tem acesso ao painel admin e qual perfil cada um tem.
          Apenas super-admins veem essa página.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <InviteAdminForm />

        <section className="rounded-2xl border border-border bg-bg-elev p-6">
          <h3 className="font-bold mb-4">Equipe atual ({admins.length})</h3>
          {admins.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Nenhum admin cadastrado (estranho — você é admin pra ver isso).
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {admins.map((a) => {
                const profile = resolveAdminProfile(a.adminProfile);
                const isMe = a.id === me.id;
                return (
                  <li
                    key={a.id}
                    className="py-4 flex items-start gap-3 flex-wrap"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-bold text-fg truncate">
                          {a.nome ?? a.email}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold border ${
                            PROFILE_BADGE[profile] ?? PROFILE_BADGE.super
                          }`}
                        >
                          {ADMIN_PROFILE_LABEL[profile]}
                        </span>
                        {isMe && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono bg-bg-card text-fg-muted border border-border">
                            você
                          </span>
                        )}
                        {!a.isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono bg-red-50 text-danger border border-danger/40">
                            bloqueado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-fg-muted font-mono mt-0.5">
                        {a.email}
                      </div>
                      <div className="text-[10px] text-fg-dim font-mono mt-0.5">
                        criado em {fmtDate(a.createdAt)}
                        {a.updatedAt &&
                          ` · atualizado em ${fmtDate(a.updatedAt)}`}
                      </div>

                      {!isMe && (
                        <>
                          <EditAdminProfileForm
                            userId={a.id}
                            currentProfile={a.adminProfile}
                            email={a.email}
                          />
                          <div className="flex items-center gap-3 mt-2">
                            <ToggleAdminActiveButton
                              userId={a.id}
                              email={a.email}
                              isActive={a.isActive}
                            />
                            <RevokeAdminButton
                              userId={a.id}
                              email={a.email}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}