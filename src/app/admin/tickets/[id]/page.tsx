import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { TicketThread } from "@/components/ticket-thread";
import { CashbackSaqueAdminPanel } from "@/components/cashback-saque-admin-panel";
import { getTicketDetail } from "@/lib/actions/tickets";

export const metadata = {
  title: "Admin · Ticket",
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Admin",
};

type Params = { params: Promise<{ id: string }> };

export default async function AdminTicketDetailPage({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;
  const detail = await getTicketDetail(id);
  if (!detail) notFound();

  return (
    <AdminShell active="/admin/tickets" userName={admin.nome}>
      <Link
        href="/admin/tickets"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← tickets
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {detail.ticket.assunto}
          </h1>
          <p className="text-xs text-fg-dim font-mono mt-1">
            #{detail.ticket.id.slice(0, 8)}
          </p>
        </div>
        <TicketStatusBadge status={detail.ticket.status} forAdmin />
      </div>

      {detail.opener && (
        <div className="rounded-2xl border border-border bg-bg-elev p-5 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
            aberto por
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <div className="font-bold">
                {detail.opener.nome ?? detail.opener.email}
              </div>
              <div className="text-xs text-fg-muted">
                <a
                  href={`mailto:${detail.opener.email}`}
                  className="hover:text-accent"
                >
                  {detail.opener.email}
                </a>
                {detail.opener.telefone && (
                  <>
                    {" · "}
                    <a
                      href={`tel:${detail.opener.telefone}`}
                      className="font-mono hover:text-accent"
                    >
                      {detail.opener.telefone}
                    </a>
                  </>
                )}
              </div>
            </div>
            <span className="chip">
              {ROLE_LABEL[detail.opener.role] ?? detail.opener.role}
            </span>
            <Link
              href={
                detail.opener.role === "construtora"
                  ? `/admin/construtoras` // sem detalhe direto pelo userId
                  : `/admin/usuarios/${detail.opener.id}`
              }
              className="ml-auto text-xs text-accent hover:underline"
            >
              ver perfil →
            </Link>
          </div>
        </div>
      )}

      {detail.ticket.categoria === "cashback" && (
        <CashbackSaqueAdminPanel
          ticketId={detail.ticket.id}
          ticketStatus={detail.ticket.status}
          extra={detail.ticket.extra as Record<string, unknown> | null}
        />
      )}

      <TicketThread
        ticketId={detail.ticket.id}
        ticketStatus={detail.ticket.status}
        messages={detail.messages}
        viewerRole={detail.viewerRole}
      />
    </AdminShell>
  );
}
