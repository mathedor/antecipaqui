"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ChatItem = {
  id: string;
  assunto: string;
  status: string;
  categoria: string;
  updatedAt: Date | string;
};

const CATEGORIA_LABEL: Record<string, string> = {
  suporte: "Suporte",
  operacoes: "Operações",
  negociacoes: "Negociações",
  confirmacao: "Confirmação",
  documentos: "Documentos",
  geral: "Geral",
  cashback: "Cashback",
};

const CATEGORIA_COLOR: Record<string, string> = {
  suporte: "bg-accent-soft text-accent",
  operacoes: "bg-violet-50 text-violet-700",
  negociacoes: "bg-orange-50 text-orange-700",
  confirmacao: "bg-green-50 text-success",
  documentos: "bg-yellow-50 text-warn",
  geral: "bg-bg-card text-fg-muted",
  cashback: "bg-yellow-50 text-warn",
};

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatFab({
  isAdmin = false,
}: {
  /** Se true, link "novo chat" não aparece (admin abre via /admin/tickets). */
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  // Esconde em rotas internas do próprio chat (pra não duplicar)
  const hideOnPaths = [
    "/painel/suporte",
    "/admin/tickets",
    "/entrar",
    "/cadastre-se",
    "/onboarding",
  ];
  const shouldHide = hideOnPaths.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/chats/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.chats)) setChats(d.chats);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [open]);

  if (shouldHide) return null;

  return (
    <>
      {/* Botão flutuante */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chats"
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-accent text-white shadow-2xl hover:scale-105 transition-transform flex items-center justify-center print:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Drawer lateral */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/30 print:hidden"
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 bg-bg-elev border-l border-border shadow-2xl flex flex-col print:hidden"
            role="dialog"
            aria-label="Chats"
          >
            <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
                  conversas
                </div>
                <h2 className="text-lg font-bold tracking-tight">Chats</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-9 rounded-lg border border-border text-fg-muted hover:text-fg hover:border-accent transition-colors"
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="px-5 py-3 border-b border-border flex gap-2 flex-wrap">
              {!isAdmin && (
                <Link
                  href="/painel/suporte/novo"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark transition-colors"
                >
                  + Novo chat
                </Link>
              )}
              <Link
                href={isAdmin ? "/admin/tickets" : "/painel/suporte"}
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-fg text-xs font-semibold hover:border-accent hover:text-accent transition-colors"
              >
                Ver todos →
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-sm text-fg-dim">
                  Carregando...
                </div>
              ) : chats.length === 0 ? (
                <div className="p-6 text-center text-sm text-fg-dim">
                  Nenhum chat aberto.
                  {!isAdmin && (
                    <>
                      <br />
                      <Link
                        href="/painel/suporte/novo"
                        onClick={() => setOpen(false)}
                        className="text-accent hover:underline"
                      >
                        Abrir o primeiro
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {chats.map((c) => {
                    const color =
                      CATEGORIA_COLOR[c.categoria] ??
                      CATEGORIA_COLOR.geral;
                    return (
                      <li key={c.id}>
                        <Link
                          href={
                            isAdmin
                              ? `/admin/tickets/${c.id}`
                              : `/painel/suporte/${c.id}`
                          }
                          onClick={() => setOpen(false)}
                          className="block px-5 py-3 hover:bg-bg-card transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold ${color}`}
                            >
                              {CATEGORIA_LABEL[c.categoria] ?? c.categoria}
                            </span>
                            {c.status === "aberto" && (
                              <span className="size-1.5 rounded-full bg-success" />
                            )}
                          </div>
                          <div className="font-semibold text-sm text-fg truncate">
                            {c.assunto}
                          </div>
                          <div className="text-xs text-fg-dim font-mono mt-0.5">
                            {formatDateTime(c.updatedAt)}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}