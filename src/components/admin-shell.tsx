import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { SairButton } from "@/components/sair-button";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { VersionFooter } from "@/components/version-footer";
import { AdminNav, type AdminNavItem } from "@/components/admin-nav";

const nav: AdminNavItem[] = [
  {
    type: "submenu",
    label: "Registros",
    matchPrefix: ["/admin/operacoes", "/admin/usuarios", "/admin/construtoras"],
    items: [
      { href: "/admin/operacoes", label: "Operações" },
      { href: "/admin/usuarios", label: "Imobiliárias / Corretores" },
      { href: "/admin/construtoras", label: "Construtoras" },
    ],
  },
  { type: "link", href: "/admin/tickets", label: "Tickets" },
  { type: "link", href: "/admin/mural", label: "Mural" },
  { type: "link", href: "/admin/relatorios", label: "Relatórios" },
  { type: "link", href: "/admin/configuracoes", label: "Configurações" },
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
          <Link
            href="/admin"
            className="text-fg hover:text-accent transition-colors"
            title="Dashboard"
          >
            <Logo size={32} />
          </Link>
          <AdminNav nav={nav} active={active} />
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
