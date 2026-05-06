import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { ChatThread } from "@/components/chat-thread";
import { CashbackSaqueAdminPanel } from "@/components/cashback-saque-admin-panel";
import { getChatDetail, chatCategoriaLabel } from "@/lib/actions/chat";

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
  const detail = await getChatDetail(id);
  if (!detail) notFound();

  // Quem abriu (primeiro participante criador) — buscamos via tickets.userId
  const [opener] = await db
    .select()
    .from(users)
    .where(eq(users.id, detail.ticket.userId))
    .limit(1);

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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold bg-accent-soft text-accent">
              {chatCategoriaLabel(detail.ticket.categoria)}
            </span>
            {detail.ticket.operacaoId && (
              <Link
                href={`/admin/operacoes/${detail.ticket.operacaoId}`}
                className="font-mono text-[10px] uppercase tracking-wider text-fg-dim hover:text-accent"
              >
                operação vinculada →
              </Link>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {detail.ticket.assunto}
          </h1>
          <p className="text-xs text-fg-dim font-mono mt-1">
            #{detail.ticket.id.slice(0, 8)}
          </p>
        </div>
        <TicketStatusBadge status={detail.ticket.status} forAdmin />
      </div>

      {opener && (
        <div className="rounded-2xl border border-border bg-bg-elev p-5 mb-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
            aberto por
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <div className="font-bold">
                {opener.nome ?? opener.email}
              </div>
              <div className="text-xs text-fg-muted">
                <a
                  href={`mailto:${opener.email}`}
                  className="hover:text-accent"
                >
                  {opener.email}
                </a>
                {opener.telefone && (
                  <>
                    {" · "}
                    <a
                      href={`tel:${opener.telefone}`}
                      className="font-mono hover:text-accent"
                    >
                      {opener.telefone}
                    </a>
                  </>
                )}
              </div>
            </div>
            <span className="chip">
              {ROLE_LABEL[opener.role] ?? opener.role}
            </span>
            <Link
              href={
                opener.role === "construtora"
                  ? `/admin/construtoras`
                  : `/admin/usuarios/${opener.id}`
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

      <ChatThread
        ticketId={detail.ticket.id}
        ticketStatus={detail.ticket.status}
        ticketCategoria={detail.ticket.categoria}
        initialMessages={detail.messages}
        participantes={detail.participantes}
        viewerId={detail.viewerId}
        viewerRole={detail.viewerRole}
      />
    </AdminShell>
  );
}
