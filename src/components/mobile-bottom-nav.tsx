"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SairButton } from "@/components/sair-button";

export type MobileNavItem = {
  href: string;
  label: string;
  icon: "home" | "table" | "ticket" | "report" | "config" | "tag" | "money" | "doc" | "wallet" | "list";
};

type Props = {
  /** Item destacado pra ser primary (geralmente "Painel" ou "Operações") */
  shortcuts: MobileNavItem[];
  /** Lista completa pro overlay */
  fullMenu: { section: string; items: MobileNavItem[] }[];
  /** Header do overlay — mostra chip do role + nome */
  userLabel: string;
  roleLabel: string;
  active: string;
};

export function MobileBottomNav({
  shortcuts,
  fullMenu,
  userLabel,
  roleLabel,
  active,
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Bottom bar fixa */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navegação principal"
      >
        <div
          className="grid h-14"
          style={{
            gridTemplateColumns: `repeat(${shortcuts.length + 1}, minmax(0, 1fr))`,
          }}
        >
          {shortcuts.map((s) => (
            <BottomBtn
              key={s.href}
              href={s.href}
              icon={s.icon}
              label={s.label}
              active={active === s.href}
            />
          ))}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-fg-muted hover:text-accent transition-colors"
            aria-label="Abrir menu"
          >
            <Icon name="menu" />
            <span className="text-[10px] uppercase tracking-wider font-mono">
              menu
            </span>
          </button>
        </div>
      </nav>

      {/* Overlay full */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col bg-bg/95 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
        >
          <header className="flex items-center justify-between gap-3 px-5 h-16 border-b border-border shrink-0">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-accent">
                {roleLabel}
              </div>
              <div className="text-base font-bold truncate">{userLabel}</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="size-10 rounded-full border border-border flex items-center justify-center text-fg-muted hover:border-accent hover:text-accent transition-colors shrink-0"
            >
              ✕
            </button>
          </header>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {fullMenu.map((sec) => (
              <div key={sec.section} className="mb-5">
                <div className="px-3 mb-2 font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                  {sec.section}
                </div>
                <ul className="space-y-1">
                  {sec.items.map((it) => {
                    const isActive = active === it.href;
                    return (
                      <li key={it.href}>
                        <Link
                          href={it.href}
                          onClick={() => setOpen(false)}
                          className={`flex items-center gap-3 px-3 h-12 rounded-xl transition-colors ${
                            isActive
                              ? "bg-accent-soft text-accent"
                              : "text-fg hover:bg-bg-card"
                          }`}
                        >
                          <span
                            className={`size-9 rounded-lg flex items-center justify-center ${
                              isActive
                                ? "bg-accent text-white"
                                : "bg-bg-card text-fg-muted"
                            }`}
                          >
                            <Icon name={it.icon} />
                          </span>
                          <span className="font-medium">{it.label}</span>
                          {isActive && (
                            <span className="ml-auto text-xs text-accent">
                              ●
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <footer
            className="border-t border-border px-3 py-3 flex items-center justify-between gap-3 shrink-0"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          >
            <Link
              href="/painel/perfil"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-xs text-fg-muted hover:text-accent"
            >
              <UserButton />
              <span>Editar dados</span>
            </Link>
            <SairButton />
          </footer>
        </div>
      )}
    </>
  );
}

function BottomBtn({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: MobileNavItem["icon"];
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
        active ? "text-accent" : "text-fg-muted hover:text-fg"
      }`}
    >
      <Icon name={icon} />
      <span className="text-[10px] uppercase tracking-wider font-mono truncate max-w-full px-1">
        {label}
      </span>
    </Link>
  );
}

function Icon({
  name,
}: {
  name: MobileNavItem["icon"] | "menu";
}) {
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "home":
      return (
        <svg {...props}>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v10h14V10" />
        </svg>
      );
    case "table":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...props}>
          <path d="M2 9V7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6Z" />
        </svg>
      );
    case "report":
      return (
        <svg {...props}>
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 3 3 5-5" />
        </svg>
      );
    case "config":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
    case "tag":
      return (
        <svg {...props}>
          <path d="M21 12V6a2 2 0 0 0-2-2H6L2 12l4 8h13a2 2 0 0 0 2-2v-6Z" />
          <line x1="7" y1="12" x2="7.01" y2="12" />
        </svg>
      );
    case "money":
      return (
        <svg {...props}>
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "doc":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...props}>
          <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      );
    case "list":
      return (
        <svg {...props}>
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      );
    case "menu":
      return (
        <svg {...props}>
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      );
  }
}
