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
];

type Search = {
  searchParams: Promise<{
    status?: string;
    categoria?: string;
    q?: string;
    arquivados?: string;
    unread?: string;
  }>;
};

export default async function ChatsPage({ searchParams }: Search) {
  const user = await requireActiveUser();
  if (user.role === "admin") redirect("/admin/tickets");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const categoriaFilter = sp.categoria ?? "";
  const q = sp.q ?? "";
  const includeArquivados = sp.arquivados === "1";
  const onlyUnread = sp.unread === "1";

  const chats = await listMyChats({
    q: q || undefined,
    categoria: categoriaFilter || undefined,
    status: statusFilter || undefined,
    includeArquivados,
    onlyUnread,
  });

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

  const hasFilters =
    !!statusFilter ||
    !!categoriaFilter ||
    !!q ||
    onlyUnread ||
    includeArquivados;

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/suporte">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
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

      {/* Filtros */}
      <form
        method="get"
        action="/painel/suporte"
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
        {hasFilters && (
          <Link
            href="/painel/suporte"
            className="col-span-12 md:col-span-6 flex items-center justify-end text-xs text-accent hover:underline"
          >
            Limpar filtros
          </Link>
        )}
      </form>

      {chats.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-bg-card p-10 md:p-14 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-2xl font-bold tracking-tight">
            {hasFilters ? "Nada encontrado" : "Nenhum chat aberto"}
          </h2>
          <p className="mt-3 text-fg-muted max-w-md mx-auto">
            {hasFilters
              ? "Tenta ajustar os filtros ou limpar a busca."
              : "Abra um chat pra falar com o suporte, com o fundo da operação ou com a construtora."}
          </p>
          {!hasFilters && (
            <Link
              href="/painel/suporte/novo"
              className="btn-primary mt-6 !h-12 !px-6"
            >
              Abrir primeiro chat <span className="arrow">→</span>
            </Link>
          )}
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
