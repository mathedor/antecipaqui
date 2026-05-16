import Link from "next/link";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { TicketStatusBadge } from "@/components/ticket-status-badge";
import { listMyChats } from "@/lib/actions/chat";
import { chatCategoriaLabel } from "@/lib/chat-helpers";
import { PageHelp } from "@/components/page-help";

export const metadata = {
  title: "Admin · Tickets",
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "aberto", label: "Abertos" },
  { value: "aguardando_resposta", label: "Aguardando" },
  { value: "finalizado", label: "Finalizados" },
];

const CATEGORIA_OPTIONS = [
  { value: "", label: "Todas categorias" },
  { value: "suporte", label: "Suporte" },
  { value: "operacoes", label: "Operações" },
  { value: "negociacoes", label: "Negociações" },
  { value: "confirmacao", label: "Confirmação" },
  { value: "documentos", label: "Documentos" },
  { value: "cashback", label: "Cashback" },
];

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Admin",
  fundo: "Fundo",
  comercial: "Comercial",
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

type Search = {
  searchParams: Promise<{
    status?: string;
    categoria?: string;
    q?: string;
    arquivados?: string;
    unread?: string;
  }>;
};

export default async function AdminTicketsPage({ searchParams }: Search) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const categoriaFilter = sp.categoria ?? "";
  const q = sp.q ?? "";
  const includeArquivados = sp.arquivados === "1";
  const onlyUnread = sp.unread === "1";

  const tickets = await listMyChats({
    q: q || undefined,
    categoria: categoriaFilter || undefined,
    status: statusFilter || undefined,
    includeArquivados,
    onlyUnread,
  });

  const activeFilters: string[] = [];
  if (statusFilter) activeFilters.push(statusFilter);
  if (categoriaFilter) activeFilters.push(categoriaFilter);
  if (q) activeFilters.push(`busca: "${q}"`);
  if (onlyUnread) activeFilters.push("só não lidos");
  if (includeArquivados) activeFilters.push("inclui arquivados");

  return (
    <AdminShell active="/admin/tickets" userName={admin.nome}>
      <div className="mb-6">
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Tickets</span> de suporte
        </h1>
        <p className="mt-2 text-fg-muted">
          {tickets.length}{" "}
          {tickets.length === 1 ? "ticket" : "tickets"}
          {activeFilters.length > 0 && (
            <span className="font-mono text-xs">
              {" "}
              · {activeFilters.join(" · ")}
            </span>
          )}
        </p>
        <div className="mt-2">
          <PageHelp pageKey="admin-tickets" />
        </div>
      </div>

      {/* Filtros */}
      <form
        method="get"
        action="/admin/tickets"
        className="mb-6 rounded-2xl border border-border bg-bg-elev p-4 grid grid-cols-12 gap-3"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por assunto..."
          className="col-span-12 md:col-span-5 h-10 px-3 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
        />
        <select
          name="categoria"
          defaultValue={categoriaFilter}
          className="col-span-6 md:col-span-3 h-10 px-3 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
        >
          {CATEGORIA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="col-span-6 md:col-span-2 h-10 px-3 rounded-lg border border-border bg-bg text-fg text-sm focus:border-accent outline-none"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="col-span-12 md:col-span-2 h-10 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark"
        >
          Filtrar
        </button>
        <label className="col-span-6 md:col-span-3 flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            name="unread"
            value="1"
            defaultChecked={onlyUnread}
          />
          Só com mensagens novas
        </label>
        <label className="col-span-6 md:col-span-3 flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            name="arquivados"
            value="1"
            defaultChecked={includeArquivados}
          />
          Incluir arquivados
        </label>
        <Link
          href="/admin/tickets"
          className="col-span-12 md:col-span-6 flex items-center justify-end text-xs text-accent hover:underline"
        >
          Limpar filtros
        </Link>
      </form>

      {tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-fg-muted">Nenhum ticket bate com esses filtros.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/tickets/${t.id}`}
                className="grid grid-cols-12 gap-3 px-5 py-4 rounded-2xl border border-border bg-bg-elev hover:border-accent transition-colors items-center"
              >
                <div className="col-span-12 md:col-span-5">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-mono font-semibold bg-accent-soft text-accent">
                      {chatCategoriaLabel(t.categoria)}
                    </span>
                    <span className="font-bold text-fg truncate">
                      {t.assunto}
                    </span>
                    {t.unreadCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-bold">
                        {t.unreadCount}
                      </span>
                    )}
                    {t.arquivadoEm && (
                      <span className="text-[10px] text-warn font-mono uppercase tracking-wider">
                        📦 arquivado
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-fg-muted truncate mt-0.5">
                    {t.userNome ?? t.userEmail} ·{" "}
                    {ROLE_LABEL[t.userRole ?? ""] ?? t.userRole}
                  </div>
                </div>
                <div className="col-span-6 md:col-span-3 text-xs text-fg-muted font-mono">
                  {formatDateTime(t.updatedAt)}
                </div>
                <div className="col-span-6 md:col-span-3 flex md:justify-end">
                  <TicketStatusBadge status={t.status} forAdmin />
                </div>
                <div className="hidden md:block col-span-1 text-right text-fg-dim">
                  →
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
