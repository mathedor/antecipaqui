import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { SairButton } from "@/components/sair-button";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { VersionFooter } from "@/components/version-footer";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/operacoes", label: "Operações" },
  { href: "/admin/usuarios", label: "Imobiliárias / Corretores" },
  { href: "/admin/construtoras", label: "Construtoras" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/mural", label: "Mural" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export function AdminShell({
  children,
  active,
  userName,
}: {
  children: React.ReactNode;
  active: string;
  userName?: string | null;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-6">
          <Link href="/admin" className="text-fg hover:text-accent transition-colors">
            <Logo size={32} />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 h-10 inline-flex items-center text-sm font-medium rounded-lg transition-colors ${
                  active === item.href
                    ? "text-fg bg-bg-card"
                    : "text-fg-muted hover:text-fg hover:bg-bg-card/50"
                }`}
              >
                {item.label}
                {active === item.href && (
                  <span className="absolute -bottom-px left-3 right-3 h-px bg-accent" />
                )}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex chip chip-accent">
              admin{userName ? ` · ${userName.split(" ")[0]}` : ""}
            </span>
            <NotificationBell />
            <SairButton />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8 md:py-12">{children}</main>
      <VersionFooter />
    </div>
  );
}
