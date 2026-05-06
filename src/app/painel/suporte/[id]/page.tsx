import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { getChatDetail, chatCategoriaLabel } from "@/lib/actions/chat";
import { PainelShell } from "@/components/painel-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { ChatThread } from "@/components/chat-thread";

export const metadata = {
  title: "Chat",
};

type Params = { params: Promise<{ id: string }> };

export default async function ChatDetailPage({ params }: Params) {
  const user = await requireActiveUser();
  const { id } = await params;
  const detail = await getChatDetail(id);
  if (!detail) notFound();

  const role = (
    user.role === "fundo"
      ? "fundo"
      : user.role === "construtora"
        ? "construtora"
        : user.role === "imobiliaria"
          ? "imobiliaria"
          : user.role === "comercial"
            ? "comercial"
            : user.role === "admin"
              ? "admin"
              : "corretor"
  ) as
    | "construtora"
    | "corretor"
    | "imobiliaria"
    | "fundo"
    | "comercial"
    | "admin";

  const backHref = user.role === "admin" ? "/admin/tickets" : "/painel/suporte";

  return (
    <PainelShell
      role={role}
      userName={user.nome}
      active={user.role === "admin" ? "/admin/tickets" : "/painel/suporte"}
    >
      <Link
        href={backHref}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← chats
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold bg-accent-soft text-accent">
              {chatCategoriaLabel(detail.ticket.categoria)}
            </span>
            {detail.ticket.operacaoId && (
              <Link
                href={`/painel/operacoes/${detail.ticket.operacaoId}`}
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
        <TicketStatusBadge status={detail.ticket.status} />
      </div>

      <ChatThread
        ticketId={detail.ticket.id}
        ticketStatus={detail.ticket.status}
        ticketCategoria={detail.ticket.categoria}
        initialMessages={detail.messages}
        participantes={detail.participantes}
        viewerId={detail.viewerId}
        viewerRole={detail.viewerRole}
      />
    </PainelShell>
  );
}