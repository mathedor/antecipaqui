import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getMyNotifications,
  markAllNotificationsReadAction,
} from "@/lib/actions/notifications";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { AdminShell } from "@/components/admin-shell";

export const metadata = { title: "Notificações" };

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificacoesPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const all = await getMyNotifications(50);
  const unread = all.filter((n) => !n.read);

  async function markAll() {
    "use server";
    await markAllNotificationsReadAction();
  }

  const isAdmin = user.role === "admin";

  const content = (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Notificações</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            {unread.length > 0
              ? `${unread.length} não lida${unread.length === 1 ? "" : "s"} de ${all.length} total`
              : `${all.length} total · todas lidas`}
          </p>
        </div>
        {unread.length > 0 && (
          <form action={markAll}>
            <button
              type="submit"
              className="btn-ghost !h-10 !px-4 text-sm"
            >
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {all.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">🔕</div>
          <h2 className="text-xl font-bold">Sem notificações por aqui</h2>
          <p className="mt-2 text-fg-muted">
            Quando algo acontecer com suas operações, aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {all.map((n) => (
            <li key={n.id}>
              {n.link ? (
                <Link
                  href={n.link}
                  className={`block rounded-2xl border p-4 hover:border-accent transition-colors ${
                    n.read
                      ? "border-border bg-bg-elev"
                      : "border-accent/40 bg-accent-soft"
                  }`}
                >
                  <NotifContent n={n} />
                </Link>
              ) : (
                <div
                  className={`rounded-2xl border p-4 ${
                    n.read
                      ? "border-border bg-bg-elev"
                      : "border-accent/40 bg-accent-soft"
                  }`}
                >
                  <NotifContent n={n} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (isAdmin) {
    return (
      <AdminShell active="" userName={user.nome}>
        {content}
      </AdminShell>
    );
  }
  const role = (
    user.role === "construtora"
      ? "construtora"
      : user.role === "imobiliaria"
        ? "imobiliaria"
        : "corretor"
  ) as "construtora" | "corretor" | "imobiliaria";
  return (
    <PainelShell role={role} userName={user.nome}>
      {content}
    </PainelShell>
  );
}

function NotifContent({
  n,
}: {
  n: {
    title: string;
    body: string | null;
    type: string;
    read: boolean;
    emailSent: boolean;
    smsSent: boolean;
    createdAt: Date;
  };
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {!n.read && <span className="size-2 rounded-full bg-accent" />}
            <h3
              className={`font-bold ${n.read ? "text-fg-muted" : "text-fg"}`}
            >
              {n.title}
            </h3>
          </div>
          {n.body && (
            <p className="text-sm text-fg-muted leading-relaxed whitespace-pre-line">
              {n.body}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] text-fg-dim">
            {formatDate(n.createdAt)}
          </div>
          <div className="mt-1 flex justify-end gap-1">
            {n.emailSent && (
              <span
                className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-bg-card border border-border text-fg-muted"
                title="Email enviado"
              >
                ✉
              </span>
            )}
            {n.smsSent && (
              <span
                className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-bg-card border border-border text-fg-muted"
                title="SMS enviado"
              >
                SMS
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
