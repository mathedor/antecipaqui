"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Item = { href: string; label: string };

export function NavDropdown({
  label,
  items,
  active,
}: {
  label: string;
  items: Item[];
  active?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = active ? items.some((i) => i.href === active) : false;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative px-3 h-10 inline-flex items-center gap-1 text-sm font-medium rounded-lg transition-colors ${
          isActive || open
            ? "text-fg bg-bg-card"
            : "text-fg-muted hover:text-fg hover:bg-bg-card/50"
        }`}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M2 4l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {isActive && (
          <span className="absolute -bottom-px left-3 right-3 h-px bg-accent" />
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 min-w-[12rem] rounded-xl border border-border bg-bg-elev shadow-lg p-1.5 z-40"
        >
          {items.map((item) => {
            const itemActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                  itemActive
                    ? "bg-accent-soft text-accent font-semibold"
                    : "text-fg hover:bg-bg-card"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
