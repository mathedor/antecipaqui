import { UserButton } from "@clerk/nextjs";
import { EditarDadosLink } from "@/components/editar-dados-link";
import Link from "next/link";
import { SairButton } from "@/components/sair-button";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { VersionFooter } from "@/components/version-footer";
import { AdminNav, type AdminNavItem } from "@/components/admin-nav";
import {
  MobileBottomNav,
  type MobileNavItem,
} from "@/components/mobile-bottom-nav";

const nav: AdminNavItem[] = [
  { type: "link", href: "/admin/cadastrar", label: "Cadastrar" },
  {
    type: "submenu",
    label: "Registros",
    matchPrefix: [
      "/admin/operacoes",
      "/admin/usuarios",
      "/admin/construtoras",
      "/admin/fundos",
      "/admin/comerciais",
    ],
    items: [
      { href: "/admin/operacoes", label: "Operações" },
      { href: "/admin/usuarios", label: "Imobiliárias / Corretores" },
      { href: "/admin/construtoras", label: "Construtoras" },
      { href: "/admin/fundos", label: "Fundos investidores" },
      { href: "/admin/comerciais", label: "Comerciais" },
    ],
  },
  { type: "link", href: "/admin/tickets", label: "Tickets" },
  { type: "link", href: "/admin/mural", label: "Mural" },
  {
    type: "submenu",
    label: "Relatórios",
    matchPrefix: ["/admin/relatorios"],
    items: [
      { href: "/admin/relatorios", label: "Visão geral" },
      { href: "/admin/relatorios/daily", label: "Daily" },
      { href: "/admin/relatorios/indices", label: "Índices" },
      {
        href: "/admin/relatorios/construtoras",
        label: "Ranking de construtoras",
      },
      {
        href: "/admin/relatorios/imobiliarias",
        label: "Ranking de imobiliárias / corretores",
      },
      { href: "/admin/relatorios/fundos", label: "Ranking de fundos" },
      {
        href: "/admin/relatorios/comerciais",
        label: "Desempenho de comerciais",
      },
      { href: "/admin/relatorios/inadimplentes", label: "Inadimplentes" },
      { href: "/admin/relatorios/logs", label: "Logs de auditoria" },
      { href: "/admin/relatorios/saude", label: "Saúde do sistema" },
    ],
  },
  { type: "link", href: "/admin/configuracoes", label: "Configurações" },
];

const mobileShortcuts: MobileNavItem[] = [
  { href: "/admin", label: "Painel", icon: "home" },
  { href: "/admin/operacoes", label: "Ops", icon: "table" },
  { href: "/admin/tickets", label: "Tickets", icon: "ticket" },
];

const mobileFullMenu: { section: string; items: MobileNavItem[] }[] = [
  {
    section: "principal",
    items: [
      { href: "/admin", label: "Dashboard", icon: "home" },
      { href: "/admin/relatorios", label: "Relatórios", icon: "report" },
      { href: "/admin/mural", label: "Mural de recados", icon: "tag" },
    ],
  },
  {
    section: "registros",
    items: [
      { href: "/admin/operacoes", label: "Operações", icon: "table" },
      {
        href: "/admin/usuarios",
        label: "Imobiliárias / Corretores",
        icon: "list",
      },
      { href: "/admin/construtoras", label: "Construtoras", icon: "list" },
    ],
  },
  {
    section: "suporte",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: "ticket" },
      { href: "/notificacoes", label: "Notificações", icon: "doc" },
    ],
  },
  {
    section: "configurações",
    items: [
      { href: "/admin/configuracoes", label: "Parâmetros do sistema", icon: "config" },
    ],
  },
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
  const userLabel = userName ?? "Admin";
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between gap-3 md:gap-6">
          <Link
            href="/admin"
            className="text-fg hover:text-accent transition-colors flex items-center"
            title="Dashboard"
          >
            <Logo size={32} />
          </Link>
          <AdminNav nav={nav} active={active} />
          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden md:inline-flex chip chip-accent">
              admin{userName ? ` · ${userName.split(" ")[0]}` : ""}
            </span>
            <NotificationBell />
            <span className="hidden md:inline-flex">
              <EditarDadosLink />
            </span>
            <span className="hidden md:inline-flex">
              <SairButton />
            </span>
            <span className="hidden md:inline-flex">
              <UserButton />
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-12">
        {children}
      </main>
      <VersionFooter />

      <MobileBottomNav
        shortcuts={mobileShortcuts}
        fullMenu={mobileFullMenu}
        userLabel={userLabel}
        roleLabel="Administrador"
        active={active}
      />
    </div>
  );
}
