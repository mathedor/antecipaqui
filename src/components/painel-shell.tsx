import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { SairButton } from "@/components/sair-button";
import { NotificationBell } from "@/components/notification-bell";
import { VersionFooter } from "@/components/version-footer";

type Role = "corretor" | "imobiliaria" | "construtora" | "admin";

type NavItem = { href: string; label: string };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  corretor: [
    { href: "/painel", label: "Painel" },
    { href: "/painel/operacoes", label: "Operações" },
    { href: "/painel/operacoes/nova", label: "Nova operação" },
    { href: "/painel/convites", label: "Convites" },
    { href: "/painel/suporte", label: "Suporte" },
  ],
  imobiliaria: [
    { href: "/painel", label: "Painel" },
    { href: "/painel/operacoes", label: "Operações" },
    { href: "/painel/operacoes/nova", label: "Nova operação" },
    { href: "/painel/convites", label: "Convites" },
    { href: "/painel/suporte", label: "Suporte" },
  ],
  construtora: [
    { href: "/painel", label: "Painel" },
    { href: "/painel/operacoes", label: "Operações" },
    { href: "/painel/operacoes/lote", label: "Cadastrar em lote" },
    { href: "/painel/duplicatas", label: "Duplicatas" },
    { href: "/painel/cashback", label: "Cashback" },
    { href: "/painel/suporte", label: "Suporte" },
  ],
  admin: [
    { href: "/admin/operacoes", label: "Operações" },
    { href: "/admin/usuarios", label: "Imobiliárias / Corretores" },
    { href: "/admin/construtoras", label: "Construtoras" },
    { href: "/admin/tickets", label: "Tickets" },
    { href: "/admin/mural", label: "Mural" },
    { href: "/admin/relatorios", label: "Relatórios" },
    { href: "/admin/configuracoes", label: "Configurações" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  corretor: "corretor",
  imobiliaria: "imobiliária",
  construtora: "construtora",
  admin: "admin",
};

/**
 * Shell do painel pós-login (corretor/imobiliária/construtora).
 * Usa NotificationBell + UserButton + nav role-based.
 *
 * Para admin, use AdminShell — tem nav própria e fica em /admin.
 *
 * `active` é o pathname pra destacar o item ativo (passe o pathname atual).
 */
export function PainelShell({
  children,
  role,
  userName,
  active,
}: {
  children: React.ReactNode;
  role: Role;
  userName?: string | null;
  active?: string;
}) {
  const nav = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.corretor;
  const homeHref = role === "admin" ? "/admin" : "/painel";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-6">
          <Link
            href={homeHref}
            className="text-fg hover:text-accent transition-colors"
          >
            <Logo size={32} />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => {
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
            })}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex chip">
              {ROLE_LABEL[role]}
              {userName ? ` · ${userName.split(" ")[0]}` : ""}
            </span>
            <NotificationBell />
            <SairButton />
            <UserButton />
          </div>
        </div>
        {/* Nav mobile */}
        <nav className="md:hidden border-t border-border overflow-x-auto">
          <div className="mx-auto max-w-7xl px-3 py-2 flex gap-1">
            {nav.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 h-9 inline-flex items-center text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? "text-fg bg-bg-card"
                      : "text-fg-muted hover:text-fg"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 md:py-12">{children}</main>
      <VersionFooter />
    </div>
  );
}
