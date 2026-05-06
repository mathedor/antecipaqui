import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { listMyChats } from "@/lib/actions/chat";
import { chatCategoriaLabel } from "@/lib/chat-helpers";
import { PainelShell } from "@/components/painel-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";

export const metadata = {
  title: "Chats",
};

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORIA_BADGE: Record<string, { bg: string; text: string }> = {
  suporte: { bg: "bg-accent-soft", text: "text-accent" },
  operacoes: { bg: "bg-violet-50", text: "text-violet-700" },
  negociacoes: { bg: "bg-orange-50", text: "text-orange-700" },
  confirmacao: { bg: "bg-green-50", text: "text-success" },
  documentos: { bg: "bg-yellow-50", text: "text-warn" },
  geral: { bg: "bg-bg-card", text: "text-fg-muted" },
  cashback: { bg: "bg-yellow-50", text: "text-warn" },
};

export default async function ChatsPage() {
  const user = await requireActiveUser();
  if (user.role === "admin") redirect("/admin/tickets");

  const chats = await listMyChats();

  const role = (
    user.role === "fundo"
      ? "fundo"
      : user.role === "construtora"
        ? "construtora"
        : user.role === "imobiliaria"
          ? "imobiliaria"
          : user.role === "comercial"
            ? "comercial"
            : "corretor"
  ) as
    | "construtora"
    | "corretor"
    | "imobiliaria"
    | "fundo"
    | "comercial";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/suporte">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            <span className="text-gradient-blue">Chats</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Suas conversas com o time, com fundos e com construtoras.
          </p>
        </div>
        <Link
          href="/painel/suporte/novo"
          className="btn-primary !h-11 !px-5"
        >
          + Novo chat
        </Link>
      </div>

      {chats.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 md:p-14 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-2xl font-bold tracking-tight">
            Nenhum chat aberto
          </h2>
          <p className="mt-3 text-fg-muted max-w-md mx-auto">
            Abra um chat pra falar com o suporte, com o fundo da operação ou
            com a construtora.
          </p>
          <Link
            href="/painel/suporte/novo"
            className="btn-primary mt-6 !h-12 !px-6"
          >
            Abrir primeiro chat <span className="arrow">→</span>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {chats.map((t) => {
            const badge =
              CATEGORIA_BADGE[t.categoria] ?? CATEGORIA_BADGE.geral;
            return (
              <li key={t.id}>
                <Link
                  href={`/painel/suporte/${t.id}`}
                  className="grid grid-cols-12 gap-3 px-5 py-4 rounded-2xl border border-border bg-bg-elev hover:border-accent transition-colors items-center"
                >
                  <div className="col-span-12 md:col-span-7">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold ${badge.bg} ${badge.text}`}
                      >
                        {chatCategoriaLabel(t.categoria)}
                      </span>
                      <span className="font-bold text-fg truncate">
                        {t.assunto}
                      </span>
                    </div>
                    <div className="text-xs text-fg-muted font-mono mt-0.5">
                      Atualizado em {formatDateTime(t.updatedAt)}
                    </div>
                  </div>
                  <div className="col-span-8 md:col-span-4 flex md:justify-end">
                    <TicketStatusBadge status={t.status} />
                  </div>
                  <div className="col-span-4 md:col-span-1 text-right text-fg-dim">
                    →
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PainelShell>
  );
}