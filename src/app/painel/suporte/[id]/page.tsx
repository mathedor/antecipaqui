import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { getTicketDetail } from "@/lib/actions/tickets";
import { PainelShell } from "@/components/painel-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { TicketThread } from "@/components/ticket-thread";

export const metadata = {
  title: "Ticket",
};

type Params = { params: Promise<{ id: string }> };

export default async function TicketDetailPage({ params }: Params) {
  const user = await requireActiveUser();
  if (user.role === "admin") {
    const { id } = await params;
    redirect(`/admin/tickets/${id}`);
  }

  const { id } = await params;
  const detail = await getTicketDetail(id);
  if (!detail) notFound();

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

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {detail.ticket.assunto}
          </h1>
          <p className="text-xs text-fg-dim font-mono mt-1">
            #{detail.ticket.id.slice(0, 8)}
          </p>
        </div>
        <TicketStatusBadge status={detail.ticket.status} />
      </div>

      <TicketThread
        ticketId={detail.ticket.id}
        ticketStatus={detail.ticket.status}
        messages={detail.messages}
        viewerRole={detail.viewerRole}
      />
    </PainelShell>
  );
}
