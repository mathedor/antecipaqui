"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Logo } from "./logo";
import { LINKS } from "@/lib/links";

const navItems = [
  { href: LINKS.comoFunciona, label: "Como funciona", num: "01" },
  { href: LINKS.paraConstrutoras, label: "Para construtoras", num: "02" },
  { href: LINKS.simulador, label: "Simulador", num: "03" },
  { href: LINKS.perguntas, label: "Perguntas", num: "04" },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menu de navegação"
        className="md:hidden fixed bottom-0 left-0 right-0 h-14 z-40 flex items-center justify-center gap-5 bg-bg-elev/90 backdrop-blur-md border-t border-border active:bg-bg-soft transition-colors group"
      >
        <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
        <span className="trigger-arrow text-xl text-fg-muted group-active:text-accent transition-colors">
          ↑
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.5em] text-fg-muted group-active:text-accent transition-colors">
          menu
        </span>
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`md:hidden fixed inset-0 bg-fg/40 backdrop-blur-sm z-[60] transition-opacity duration-500 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden
      />

      <aside
        className="md:hidden fixed bottom-0 left-0 right-0 h-[88dvh] bg-bg border-t border-border rounded-t-3xl z-[70] flex flex-col overflow-hidden shadow-2xl"
        style={{
          transform: open ? "translateY(0)" : "translateY(100%)",
          transition: "transform 600ms cubic-bezier(0.16,1,0.3,1)",
        }}
        aria-hidden={!open}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
        <div className="relative pt-3 pb-1 flex items-center justify-center" aria-hidden>
          <span className="block w-10 h-1 rounded-full bg-border-strong" />
        </div>

        <div className="relative flex items-center justify-between px-6 py-4 border-b border-border">
          <Logo />
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="size-10 rounded-full border border-border flex items-center justify-center text-fg-muted hover:border-accent hover:text-accent transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <nav className="relative flex-1 overflow-y-auto">
          <ul>
            {navItems.map((item, i) => (
              <li key={item.href} className="border-b border-border last:border-0">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-5 px-6 py-6 group transition-colors"
                  style={{
                    transitionDelay: open ? `${250 + i * 70}ms` : "0ms",
                    transform: open ? "translateY(0)" : "translateY(20px)",
                    opacity: open ? 1 : 0,
                    transition:
                      "transform 700ms cubic-bezier(0.16,1,0.3,1), opacity 700ms ease-out, background-color 0.3s ease",
                  }}
                >
                  <span className="font-mono text-xs text-fg-dim group-hover:text-accent transition-colors w-8 shrink-0">
                    {item.num}
                  </span>
                  <span className="text-3xl font-bold tracking-tight group-hover:text-accent transition-colors flex-1">
                    {item.label}
                  </span>
                  <span className="text-fg-dim group-hover:text-accent transition-all duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="relative p-6 border-t border-border space-y-3">
          {!isLoaded ? null : isSignedIn ? (
            <Link
              href="/painel"
              onClick={() => setOpen(false)}
              className="btn-primary !w-full justify-center"
            >
              Acessar painel <span className="arrow">→</span>
            </Link>
          ) : (
            <>
              <SignUpButton
                mode="modal"
                forceRedirectUrl="/painel"
                signInForceRedirectUrl="/painel"
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-primary !w-full justify-center"
                >
                  Cadastre-se grátis <span className="arrow">→</span>
                </button>
              </SignUpButton>
              <SignInButton
                mode="modal"
                forceRedirectUrl="/painel"
                signUpForceRedirectUrl="/painel"
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost !w-full justify-center"
                >
                  Já tenho conta — Entrar
                </button>
              </SignInButton>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
