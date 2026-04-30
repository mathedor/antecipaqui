"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

/**
 * Mostra SiteHeader + SiteFooter (chrome de marketing) apenas em rotas
 * "públicas". Em rotas pós-login (/painel, /admin, /notificacoes) e nas
 * páginas de auth (/entrar, /cadastre-se), cada section cuida do próprio
 * shell — então NÃO renderiza nada aqui.
 *
 * Usado em src/app/layout.tsx wrapping <main>.
 */

const HIDE_PREFIXES = [
  "/painel",
  "/admin",
  "/notificacoes",
  "/entrar",
  "/cadastre-se",
];

function shouldHide(pathname: string | null) {
  if (!pathname) return false;
  return HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function MarketingHeader() {
  const pathname = usePathname();
  if (shouldHide(pathname)) return null;
  return <SiteHeader />;
}

export function MarketingFooter() {
  const pathname = usePathname();
  if (shouldHide(pathname)) return null;
  return <SiteFooter />;
}
