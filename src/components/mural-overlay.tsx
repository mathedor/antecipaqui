"use client";

import { useEffect, useState } from "react";

type MuralMsg = {
  id: string;
  titulo: string | null;
  body: string;
  audience: "imobiliaria" | "construtora" | "comercial" | "both";
  createdAt: Date | string;
  expiresAt: Date | string | null;
};

type Props = {
  messages: MuralMsg[];
};

const STORAGE_KEY = "antecipaqui_mural_dismissed_until";

function shouldShowBanner() {
  if (typeof window === "undefined") return true;
  const v = window.sessionStorage.getItem(STORAGE_KEY);
  if (!v) return true;
  return Date.now() > parseInt(v, 10);
}

function dismissBannerForSession() {
  if (typeof window === "undefined") return;
  // Esconde o banner pelos próximos 30min — modal full ainda pode ser
  // reaberto pelo botão na nav.
  window.sessionStorage.setItem(
    STORAGE_KEY,
    String(Date.now() + 30 * 60 * 1000),
  );
}

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

export function MuralOverlay({ messages }: Props) {
  const [bannerOpen, setBannerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Pequeno delay pra dar a sensação de slide-in suave
    if (messages.length > 0 && shouldShowBanner()) {
      const t = setTimeout(() => setBannerOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, [messages.length]);

  // Lock body scroll quando modal aberto
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  if (messages.length === 0) return null;

  const ultimo = messages[0];
  const previewTitulo =
    ultimo.titulo ?? "Recado da Antecipaqui";
  const preview = ultimo.body.slice(0, 80);

  function openModal() {
    setModalOpen(true);
    setBannerOpen(false);
  }

  function dismissBanner(e: React.MouseEvent) {
    e.stopPropagation();
    setBannerOpen(false);
    dismissBannerForSession();
  }

  return (
    <>
      {/* Banner slide-in (sempre que houver recado e não foi dismissed) */}
      <div
        className={`fixed right-4 bottom-4 md:right-6 md:bottom-6 z-40 max-w-sm transition-all duration-500 ease-out ${
          bannerOpen
            ? "translate-x-0 opacity-100"
            : "translate-x-[120%] opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-label="Mural de recados"
      >
        <button
          type="button"
          onClick={openModal}
          className="block w-full text-left rounded-2xl border border-accent/40 bg-bg-elev shadow-2xl p-5 hover:border-accent hover:shadow-accent/20 transition-all group"
        >
          <div className="flex items-start gap-3">
            <span className="size-9 rounded-full bg-accent/15 text-accent flex items-center justify-center text-lg shrink-0 mt-0.5">
              📌
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
                  recado novo
                </span>
                {messages.length > 1 && (
                  <span className="font-mono text-[10px] text-fg-muted">
                    +{messages.length - 1} mais
                  </span>
                )}
              </div>
              <div className="font-bold text-fg truncate">
                {previewTitulo}
              </div>
              <p className="mt-1 text-xs text-fg-muted line-clamp-2">
                {preview}
                {ultimo.body.length > 80 ? "…" : ""}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="text-accent group-hover:underline">
                  ver todos os recados
                </span>
                <span
                  onClick={dismissBanner}
                  className="text-fg-dim hover:text-fg transition-colors px-2 py-0.5 rounded hover:bg-bg-card cursor-pointer"
                >
                  fechar
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Modal full overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setModalOpen(false)}
            className="absolute inset-0 w-full h-full bg-fg/65 backdrop-blur-md cursor-default"
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl border border-border bg-bg-elev shadow-2xl">
            <header className="sticky top-0 bg-bg-elev/95 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-0.5">
                  mural de recados
                </div>
                <h2 className="text-xl font-bold tracking-tight">
                  {messages.length}{" "}
                  {messages.length === 1 ? "recado" : "recados"} da
                  Antecipaqui
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Fechar"
                className="size-9 rounded-full border border-border flex items-center justify-center text-fg-muted hover:border-accent hover:text-accent transition-colors"
              >
                ✕
              </button>
            </header>

            <ul className="p-6 space-y-4">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className="rounded-2xl border border-border bg-bg p-5"
                >
                  <div className="flex items-start gap-3">
                    <span className="size-8 rounded-full bg-accent/15 text-accent flex items-center justify-center text-base shrink-0">
                      📌
                    </span>
                    <div className="flex-1 min-w-0">
                      {m.titulo && (
                        <h3 className="font-bold text-base mb-1">
                          {m.titulo}
                        </h3>
                      )}
                      <p className="text-sm text-fg whitespace-pre-line leading-relaxed">
                        {m.body}
                      </p>
                      <div className="mt-3 flex items-center gap-3 flex-wrap text-[11px]">
                        <span className="font-mono text-fg-dim">
                          {formatDateTime(m.createdAt)}
                        </span>
                        {m.expiresAt && (
                          <span className="font-mono text-warn">
                            válido até {formatDateTime(m.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
