"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "antecipaqui_pwa_dismissed_at";
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const at = parseInt(raw, 10);
  if (!Number.isFinite(at)) return false;
  return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    // @ts-expect-error — non-standard but real
    window.navigator.standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function PwaInstaller() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((e) => console.warn("[sw] registration failed", e));
    }

    if (isStandalone() || recentlyDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS doesn't fire beforeinstallprompt — sugere instalação manual após 30s
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isIos()) {
      timer = setTimeout(() => setShowIosHint(true), 30_000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (timer) clearTimeout(timer);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferred(null);
    setShowIosHint(false);
  }

  async function instalar() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "dismissed") dismiss();
    setDeferred(null);
  }

  if (deferred) {
    return (
      <div
        role="dialog"
        aria-live="polite"
        className="fixed left-4 right-4 bottom-20 md:bottom-6 md:left-auto md:right-6 md:w-[360px] z-40 rounded-2xl border border-accent/30 bg-white shadow-2xl p-4 flex items-start gap-3"
      >
        <div className="text-3xl shrink-0">📲</div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm">Instalar Antecipaqui</div>
          <p className="text-xs text-fg-muted mt-0.5">
            Acesso rápido pela tela inicial, sem abrir navegador.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={instalar}
              className="h-9 px-3 rounded-lg bg-accent text-white font-semibold text-xs hover:bg-accent-dark"
            >
              Instalar
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="h-9 px-3 rounded-lg border border-border text-xs hover:border-fg-muted"
            >
              Depois
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div
        role="dialog"
        aria-live="polite"
        className="fixed left-4 right-4 bottom-20 z-40 rounded-2xl border border-accent/30 bg-white shadow-2xl p-4 flex items-start gap-3"
      >
        <div className="text-3xl shrink-0">📲</div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm">Instale o Antecipaqui</div>
          <p className="text-xs text-fg-muted mt-0.5">
            Toque em <strong>Compartilhar</strong> e depois{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 h-8 px-3 rounded-lg border border-border text-xs hover:border-fg-muted"
          >
            Ok, entendi
          </button>
        </div>
      </div>
    );
  }

  return null;
}
