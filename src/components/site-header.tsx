"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { LINKS } from "@/lib/links";

const nav = [
  { href: LINKS.comoFunciona, label: "Como funciona" },
  { href: LINKS.paraConstrutoras, label: "Para construtoras" },
  { href: LINKS.simulador, label: "Simulador" },
  { href: LINKS.perguntas, label: "Perguntas" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "backdrop-blur-xl bg-bg/80 border-b border-border"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="mx-auto max-w-6xl px-6 h-18 md:h-20 flex items-center justify-between">
          <Link
            href={LINKS.home}
            aria-label="Antecipaqui — início"
            className="text-fg hover:text-accent transition-colors"
          >
            <Logo />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-fg-muted hover:text-fg transition-colors relative group font-medium"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 right-full h-px bg-accent transition-all duration-300 group-hover:right-0" />
              </Link>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {mounted && isLoaded && isSignedIn ? (
              <Link href="/painel" className="btn-primary !h-10 !px-5">
                Acessar painel <span className="arrow">→</span>
              </Link>
            ) : (
              // SSR e primeiro paint: sempre os botões deslogados.
              // Após mount + Clerk carregar, troca por "Acessar painel" se
              // logado. Isso evita hydration mismatch.
              <>
                <SignInButton
                  mode="modal"
                  forceRedirectUrl="/painel"
                  signUpForceRedirectUrl="/painel"
                >
                  <button
                    type="button"
                    className="text-sm font-medium text-fg-muted hover:text-fg transition-colors px-4 h-10 inline-flex items-center"
                  >
                    Entrar
                  </button>
                </SignInButton>
                <SignUpButton
                  mode="modal"
                  forceRedirectUrl="/painel"
                  signInForceRedirectUrl="/painel"
                >
                  <button type="button" className="btn-primary !h-10 !px-5">
                    Cadastre-se <span className="arrow">→</span>
                  </button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileMenu />
    </>
  );
}
