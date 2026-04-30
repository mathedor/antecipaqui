"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type AdminNavItem =
  | { type: "link"; href: string; label: string }
  | {
      type: "submenu";
      label: string;
      /** Pathnames que ativam visualmente este submenu */
      matchPrefix: string[];
      items: { href: string; label: string }[];
    };

export function AdminNav({
  nav,
  active,
}: {
  nav: AdminNavItem[];
  active: string;
}) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {nav.map((item, i) => {
        if (item.type === "link") {
          const isActive = active === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative px-3 h-10 inline-flex items-center text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "text-fg bg-bg-card"
                  : "text-fg-muted hover:text-fg hover:bg-bg-card/50"
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute -bottom-px left-3 right-3 h-px bg-accent" />
              )}
            </Link>
          );
        }
        return <SubmenuButton key={item.label + i} item={item} active={active} />;
      })}
    </nav>
  );
}

function SubmenuButton({
  item,
  active,
}: {
  item: Extract<AdminNavItem, { type: "submenu" }>;
  active: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const isActive = item.matchPrefix.some(
    (p) => active === p || active.startsWith(p + "/"),
  );

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={`relative px-3 h-10 inline-flex items-center gap-1.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? "text-fg bg-bg-card"
            : "text-fg-muted hover:text-fg hover:bg-bg-card/50"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {item.label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <path d="m2 4 4 4 4-4" />
        </svg>
        {isActive && (
          <span className="absolute -bottom-px left-3 right-3 h-px bg-accent" />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 min-w-[16rem] rounded-xl border border-border bg-bg-elev shadow-2xl py-1 z-40"
          role="menu"
        >
          {item.items.map((sub) => {
            const subActive = active === sub.href;
            return (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className={`flex items-center px-4 h-9 text-sm transition-colors ${
                  subActive
                    ? "text-fg bg-bg-card font-semibold"
                    : "text-fg-muted hover:text-fg hover:bg-bg-card/60"
                }`}
              >
                {sub.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
