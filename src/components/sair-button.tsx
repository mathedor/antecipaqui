"use client";

import { SignOutButton } from "@clerk/nextjs";

type Props = {
  variant?: "ghost" | "danger";
};

export function SairButton({ variant = "ghost" }: Props) {
  const cls =
    variant === "danger"
      ? "inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-danger/40 text-danger hover:bg-red-50 transition-colors text-sm font-semibold"
      : "inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border hover:border-danger hover:text-danger text-sm font-medium text-fg-muted transition-colors";

  return (
    <SignOutButton redirectUrl="/entrar">
      <button type="button" className={cls} aria-label="Sair">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sair
      </button>
    </SignOutButton>
  );
}
