import { UserButtonWithPerfil } from "@/components/user-button-with-perfil";
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
import {
  ADMIN_PROFILE_LABEL,
  hasAdminPermission,
  pathToAdminArea,
  resolveAdminProfile,
} from "@/lib/admin-permissions";
import { getCurrentDbUser } from "@/lib/auth-user";

const navFull: AdminNavItem[] = [
  { type: "link", href: "/admin/decidir", label: "Decidir" },
  { type: "link", href: "/admin/risco-global", label: "Risco" },
  { type: "link", href: "/admin/pendencias", label: "Pendências" },
  {
    type: "submenu",
    label: "Gestão",
    matchPrefix: [
      "/admin/tickets",
      "/admin/mural",
      "/admin/interno",
      "/admin/configuracoes",
      "/admin/faturas",
      "/admin/credito",
    ],
    items: [
      { href: "/admin/tickets", label: "Tickets" },
      { href: "/admin/mural", label: "Mural" },
      { href: "/admin/interno/invoice", label: "Invoice" },
      { href: "/admin/faturas", label: "Faturas dos fundos" },
      { href: "/admin/credito", label: "Análise de crédito" },
      { href: "/admin/webhooks", label: "Webhooks" },
      { href: "/admin/backups", label: "Backups & exports" },
      { href: "/admin/configuracoes", label: "Configurações" },
    ],
  },
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
      { href: "/admin/usuarios/admins", label: "Administradores" },
    ],
  },
  {
    type: "submenu",
    label: "Relatórios",
    matchPrefix: ["/admin/relatorios"],
    items: [
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
      { href: "/admin/relatorios/borderos", label: "Borderôs consolidados" },
      { href: "/admin/relatorios/recaps", label: "Recaps Diários" },
      { href: "/admin/relatorios/logs", label: "Logs de auditoria" },
      { href: "/admin/relatorios/saude", label: "Saúde do sistema" },
    ],
  },
  {
    type: "submenu",
    label: "Cadastrar",
    matchPrefix: ["/admin/cadastrar", "/admin/fundos/novo"],
    items: [
      {
        href: "/admin/cadastrar/imobiliaria",
        label: "Imobiliária / Corretor",
      },
      { href: "/admin/cadastrar/construtora", label: "Construtora" },
      { href: "/admin/cadastrar/comercial", label: "Comercial" },
      { href: "/admin/fundos/novo", label: "Fundo de investimento" },
      { href: "/admin/cadastrar/operacao", label: "Operação" },
    ],
  },
];

/** Filtra menu items pelo perfil do admin. */
function filterNavForProfile(
  profile: string | null | undefined,
): AdminNavItem[] {
  return navFull
    .map((item): AdminNavItem | null => {
      if (item.type === "link") {
        const area = pathToAdminArea(item.href);
        if (area && !hasAdminPermission(profile, area)) return null;
        return item;
      }
      // submenu — filtra items, retorna null se sobrar 0
      const allowedItems = item.items.filter((sub) => {
        const area = pathToAdminArea(sub.href);
        if (!area) return true;
        return hasAdminPermission(profile, area);
      });
      if (allowedItems.length === 0) return null;
      return { ...item, items: allowedItems };
    })
    .filter((x): x is AdminNavItem => x !== null);
}

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
      { href: "/admin/decidir", label: "Decidir", icon: "doc" },
      { href: "/admin/risco-global", label: "Risco", icon: "report" },
      { href: "/admin/pendencias", label: "Pendências", icon: "doc" },
    ],
  },
  {
    section: "gestão",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: "ticket" },
      { href: "/admin/mural", label: "Mural de recados", icon: "tag" },
      { href: "/admin/interno/invoice", label: "Invoice", icon: "money" },
      { href: "/admin/faturas", label: "Faturas dos fundos", icon: "money" },
      { href: "/admin/configuracoes", label: "Configurações", icon: "config" },
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
      { href: "/admin/fundos", label: "Fundos", icon: "list" },
      { href: "/admin/comerciais", label: "Comerciais", icon: "list" },
    ],
  },
  {
    section: "relatórios",
    items: [
      { href: "/admin/relatorios", label: "Todos os relatórios", icon: "report" },
      { href: "/admin/relatorios/daily", label: "Daily", icon: "report" },
      { href: "/admin/relatorios/borderos", label: "Borderôs", icon: "doc" },
    ],
  },
  {
    section: "outros",
    items: [
      { href: "/notificacoes", label: "Notificações", icon: "doc" },
    ],
  },
];

export async function AdminShell({
  children,
  active,
  userName,
}: {
  children: React.ReactNode;
  active: string;
  userName?: string | null;
}) {
  const userLabel = userName ?? "Admin";
  const me = await getCurrentDbUser();
  const profile = resolveAdminProfile(me?.adminProfile);
  const nav = filterNavForProfile(me?.adminProfile);
  const profileLabel = ADMIN_PROFILE_LABEL[profile];
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
            <NotificationBell />
            <span className="hidden md:inline-flex">
              <SairButton />
            </span>
            <span className="hidden md:inline-flex">
              <UserButtonWithPerfil
                profileLabel={profileLabel}
                userName={userName}
              />
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
