import Link from "next/link";
import { Logo } from "@/components/logo";
import { SairButton } from "@/components/sair-button";
import { DocumentosGate } from "@/components/documentos-gate";
import { NotificationBell } from "@/components/notification-bell";
import { VersionFooter } from "@/components/version-footer";
import { UserButtonWithPerfil } from "@/components/user-button-with-perfil";
import { NavDropdown } from "@/components/nav-dropdown";
import { getImpersonationStatus } from "@/lib/actions/admin-impersonate";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { ComercialTourMount } from "@/components/onboarding/comercial-tour-mount";
import { CorretorTourMount } from "@/components/onboarding/corretor-tour-mount";
import { CorretorEquipeTourMount } from "@/components/onboarding/corretor-equipe-tour-mount";
import { FundoTourMount } from "@/components/onboarding/fundo-tour-mount";
import { ConstrutoraTourMount } from "@/components/onboarding/construtora-tour-mount";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getCurrentImobMembership } from "@/lib/actions/imobiliaria-membros";
import {
  MobileBottomNav,
  type MobileNavItem,
} from "@/components/mobile-bottom-nav";

type Role =
  | "corretor"
  | "imobiliaria"
  | "construtora"
  | "admin"
  | "fundo"
  | "comercial";

type NavItem =
  | { href: string; label: string; submenu?: undefined }
  | { label: string; submenu: { href: string; label: string }[]; href?: undefined };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  corretor: [
    { href: "/painel/atendimentos", label: "Atendimentos" },
    { href: "/painel/operacoes", label: "Operações" },
    { href: "/painel/coleta-comprador", label: "Link de Dados" },
    {
      label: "Análise",
      submenu: [
        { href: "/painel/forecast-corretor", label: "Projeção" },
        { href: "/painel/relatorio", label: "Relatório" },
        { href: "/painel/convites", label: "Convites" },
      ],
    },
    {
      label: "Gestão",
      submenu: [
        { href: "/painel/equipe", label: "Equipe" },
        { href: "/painel/filiais", label: "Matriz e filiais" },
        { href: "/painel/perfil", label: "Meus dados" },
      ],
    },
    { href: "/painel/suporte", label: "Chats" },
  ],
  imobiliaria: [
    { href: "/painel/atendimentos", label: "Atendimentos" },
    { href: "/painel/operacoes", label: "Operações" },
    { href: "/painel/coleta-comprador", label: "Link de Dados" },
    {
      label: "Análise",
      submenu: [
        { href: "/painel/forecast-corretor", label: "Projeção" },
        { href: "/painel/relatorio", label: "Relatório" },
        { href: "/painel/convites", label: "Convites" },
      ],
    },
    {
      label: "Gestão",
      submenu: [
        { href: "/painel/equipe", label: "Equipe" },
        { href: "/painel/filiais", label: "Matriz e filiais" },
        { href: "/painel/perfil", label: "Meus dados" },
      ],
    },
    { href: "/painel/suporte", label: "Chats" },
  ],
  construtora: [
    { href: "/painel/operacoes", label: "Operações" },
    { href: "/painel/atendimentos-parceiros", label: "Atendimentos parceiros" },
    { href: "/painel/duplicatas", label: "Duplicatas" },
    { href: "/painel/extrato", label: "Extrato" },
    { href: "/painel/risco", label: "Risco" },
    { href: "/painel/score", label: "Score" },
    { href: "/painel/cashback", label: "Cashback" },
    {
      label: "Gestão",
      submenu: [
        { href: "/painel/documentos", label: "Documentos" },
        { href: "/painel/equipe", label: "Equipe" },
        { href: "/painel/empreendimentos", label: "Empreendimentos" },
        { href: "/painel/pendencias", label: "Pendências" },
        { href: "/painel/forecast", label: "Forecast" },
      ],
    },
    { href: "/painel/suporte", label: "Chats" },
  ],
  admin: [
    { href: "/admin/operacoes", label: "Operações" },
    { href: "/admin/usuarios", label: "Imobiliárias / Corretores" },
    { href: "/admin/construtoras", label: "Construtoras" },
    { href: "/admin/tickets", label: "Tickets" },
    { href: "/admin/mural", label: "Mural" },
    { href: "/admin/relatorios", label: "Relatórios" },
    { href: "/admin/configuracoes", label: "Configurações" },
    { href: "/admin/entregabilidade", label: "Entrega de e-mail" },
  ],
  fundo: [
    { href: "/painel/aprovar", label: "Aprovar" },
    { href: "/painel/pendencias-decisao", label: "Pendências" },
    { href: "/painel/operacoes", label: "Operações" },
    { href: "/painel/daily", label: "Daily" },
    { href: "/painel/recebimentos", label: "Recebimentos" },
    { href: "/painel/faturas", label: "Faturas" },
    {
      label: "Gestão",
      submenu: [
        { href: "/painel/recaps", label: "Recaps" },
        { href: "/painel/forecast", label: "Forecast" },
        { href: "/painel/risco", label: "Risco" },
        { href: "/painel/parceiros", label: "Parceiros" },
        { href: "/painel/comerciais", label: "Comerciais vinculados" },
      ],
    },
    {
      label: "Integração",
      submenu: [
        { href: "/painel/regras", label: "Regras" },
        { href: "/painel/api", label: "API" },
        { href: "/painel/webhooks", label: "Webhooks" },
        { href: "/painel/diagnostico", label: "Diagnóstico" },
      ],
    },
    { href: "/painel/suporte", label: "Chats" },
  ],
  comercial: [
    { href: "/painel/operacoes", label: "Operações" },
    {
      label: "Captação",
      submenu: [
        { href: "/painel/prospects", label: "Mapa de prospects" },
        { href: "/painel/prospeccao", label: "Pipeline de leads" },
        { href: "/painel/cadastrar-imob", label: "Cadastro express" },
        { href: "/painel/convidar", label: "Link de convite" },
      ],
    },
    { href: "/painel/daily", label: "Daily" },
    {
      label: "Financeiro",
      submenu: [
        { href: "/painel/comissoes", label: "Comissões" },
        { href: "/painel/comissoes/holerite", label: "Holerite mensal" },
      ],
    },
    { href: "/painel/relatorios", label: "Relatórios" },
    {
      label: "Gestão",
      submenu: [
        { href: "/painel/templates", label: "Templates" },
        { href: "/painel/perfil", label: "Meus dados" },
      ],
    },
    { href: "/painel/suporte", label: "Chats" },
  ],
};

const ROLE_LABEL: Record<Role, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Administrador",
  fundo: "Fundo investidor",
  comercial: "Comercial",
};

const MOBILE_SHORTCUTS: Record<Role, MobileNavItem[]> = {
  corretor: [
    { href: "/painel/operacoes", label: "Operações", icon: "table" },
    { href: "/painel/operacoes/nova", label: "Nova", icon: "doc" },
    { href: "/painel/forecast-corretor", label: "Projeção", icon: "report" },
    { href: "/painel/convites", label: "Convites", icon: "tag" },
  ],
  imobiliaria: [
    { href: "/painel/operacoes", label: "Operações", icon: "table" },
    { href: "/painel/operacoes/nova", label: "Nova", icon: "doc" },
    { href: "/painel/forecast-corretor", label: "Projeção", icon: "report" },
    { href: "/painel/convites", label: "Convites", icon: "tag" },
  ],
  construtora: [
    { href: "/painel", label: "Painel", icon: "home" },
    { href: "/painel/operacoes", label: "Ops", icon: "table" },
    { href: "/painel/duplicatas", label: "Dup.", icon: "wallet" },
    { href: "/painel/cashback", label: "Cashback", icon: "money" },
  ],
  admin: [
    { href: "/admin", label: "Painel", icon: "home" },
    { href: "/admin/operacoes", label: "Ops", icon: "table" },
    { href: "/admin/tickets", label: "Tickets", icon: "ticket" },
  ],
  fundo: [
    { href: "/painel", label: "Painel", icon: "home" },
    { href: "/painel/operacoes", label: "Ops", icon: "table" },
    { href: "/painel/daily", label: "Daily", icon: "table" },
    { href: "/painel/recebimentos", label: "Receb.", icon: "wallet" },
  ],
  comercial: [
    { href: "/painel", label: "Painel", icon: "home" },
    { href: "/painel/daily", label: "Daily", icon: "table" },
    { href: "/painel/perfil", label: "Perfil", icon: "config" },
    { href: "/painel/suporte", label: "Chats", icon: "ticket" },
  ],
};

const MOBILE_FULLMENU: Record<
  Role,
  { section: string; items: MobileNavItem[] }[]
> = {
  corretor: [
    {
      section: "principal",
      items: [
        { href: "/painel/atendimentos", label: "Atendimentos (CRM)", icon: "tag" },
        { href: "/painel/operacoes", label: "Operações", icon: "table" },
        { href: "/painel/operacoes/nova", label: "Nova operação", icon: "doc" },
        { href: "/painel/coleta-comprador", label: "Link de Dados", icon: "doc" },
      ],
    },
    {
      section: "análise",
      items: [
        { href: "/painel/forecast-corretor", label: "Projeção", icon: "report" },
        { href: "/painel/relatorio", label: "Relatório", icon: "report" },
        { href: "/painel/convites", label: "Convites recebidos", icon: "tag" },
      ],
    },
    {
      section: "suporte",
      items: [
        { href: "/painel/suporte", label: "Chats", icon: "ticket" },
        { href: "/notificacoes", label: "Notificações", icon: "doc" },
        { href: "/painel/perfil", label: "Meus dados", icon: "config" },
      ],
    },
  ],
  imobiliaria: [
    {
      section: "principal",
      items: [
        { href: "/painel/atendimentos", label: "Atendimentos (CRM)", icon: "tag" },
        { href: "/painel/operacoes", label: "Operações", icon: "table" },
        { href: "/painel/operacoes/nova", label: "Nova operação", icon: "doc" },
        { href: "/painel/coleta-comprador", label: "Link de Dados", icon: "doc" },
      ],
    },
    {
      section: "análise",
      items: [
        { href: "/painel/forecast-corretor", label: "Projeção", icon: "report" },
        { href: "/painel/relatorio", label: "Relatório", icon: "report" },
        { href: "/painel/convites", label: "Convites recebidos", icon: "tag" },
      ],
    },
    {
      section: "gestão",
      items: [
        { href: "/painel/equipe", label: "Equipe", icon: "tag" },
        { href: "/painel/perfil", label: "Meus dados", icon: "config" },
      ],
    },
    {
      section: "suporte",
      items: [
        { href: "/painel/suporte", label: "Chats", icon: "ticket" },
        { href: "/notificacoes", label: "Notificações", icon: "doc" },
      ],
    },
  ],
  construtora: [
    {
      section: "principal",
      items: [
        { href: "/painel/operacoes", label: "Operações", icon: "table" },
        { href: "/painel/atendimentos-parceiros", label: "Atendimentos parceiros", icon: "tag" },
      ],
    },
    {
      section: "financeiro",
      items: [
        { href: "/painel/duplicatas", label: "Duplicatas a pagar", icon: "wallet" },
        { href: "/painel/extrato", label: "Extrato", icon: "money" },
        { href: "/painel/cashback", label: "Cashback", icon: "money" },
      ],
    },
    {
      section: "gestão",
      items: [
        { href: "/painel/documentos", label: "Documentos", icon: "doc" },
        { href: "/painel/equipe", label: "Equipe", icon: "tag" },
        { href: "/painel/empreendimentos", label: "Empreendimentos", icon: "doc" },
        { href: "/painel/pendencias", label: "Pendências", icon: "doc" },
        { href: "/painel/forecast", label: "Forecast", icon: "table" },
      ],
    },
    {
      section: "suporte",
      items: [
        { href: "/painel/suporte", label: "Chats", icon: "ticket" },
        { href: "/notificacoes", label: "Notificações", icon: "doc" },
        { href: "/painel/perfil", label: "Editar perfil", icon: "doc" },
      ],
    },
  ],
  admin: [
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
        { href: "/admin/usuarios", label: "Imobiliárias / Corretores", icon: "list" },
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
        { href: "/admin/configuracoes", label: "Parâmetros", icon: "config" },
        { href: "/admin/entregabilidade", label: "Entrega de e-mail", icon: "doc" },
      ],
    },
  ],
  fundo: [
    {
      section: "principal",
      items: [
        { href: "/painel/aprovar", label: "Aprovar", icon: "doc" },
        { href: "/painel/pendencias-decisao", label: "Pendências", icon: "doc" },
        { href: "/painel/operacoes", label: "Operações", icon: "table" },
        { href: "/painel/daily", label: "Daily", icon: "table" },
      ],
    },
    {
      section: "financeiro",
      items: [
        { href: "/painel/recebimentos", label: "Parcelas a receber", icon: "wallet" },
        { href: "/painel/faturas", label: "Faturas", icon: "money" },
      ],
    },
    {
      section: "gestão",
      items: [
        { href: "/painel/recaps", label: "Recaps", icon: "report" },
        { href: "/painel/forecast", label: "Forecast", icon: "report" },
        { href: "/painel/risco", label: "Risco", icon: "report" },
        { href: "/painel/parceiros", label: "Parceiros", icon: "list" },
        { href: "/painel/comerciais", label: "Comerciais vinculados", icon: "list" },
      ],
    },
    {
      section: "integração",
      items: [
        { href: "/painel/regras", label: "Regras", icon: "config" },
        { href: "/painel/api", label: "API", icon: "config" },
        { href: "/painel/webhooks", label: "Webhooks", icon: "config" },
      ],
    },
    {
      section: "suporte",
      items: [
        { href: "/painel/suporte", label: "Chats", icon: "ticket" },
        { href: "/notificacoes", label: "Notificações", icon: "doc" },
      ],
    },
  ],
  comercial: [
    {
      section: "principal",
      items: [
        { href: "/painel/operacoes", label: "Operações", icon: "table" },
        { href: "/painel/operacoes/nova", label: "Nova operação", icon: "doc" },
        { href: "/painel/daily", label: "Daily", icon: "table" },
        { href: "/painel/relatorios", label: "Relatórios", icon: "report" },
      ],
    },
    {
      section: "captação",
      items: [
        { href: "/painel/prospects", label: "Mapa de prospects", icon: "tag" },
        { href: "/painel/prospeccao", label: "Pipeline de leads", icon: "tag" },
        { href: "/painel/cadastrar-imob", label: "Cadastro express", icon: "doc" },
        { href: "/painel/convidar", label: "Link de convite", icon: "tag" },
      ],
    },
    {
      section: "financeiro",
      items: [
        { href: "/painel/comissoes", label: "Comissões", icon: "money" },
        { href: "/painel/comissoes/holerite", label: "Holerite mensal", icon: "money" },
      ],
    },
    {
      section: "gestão",
      items: [
        { href: "/painel/templates", label: "Templates WhatsApp", icon: "doc" },
        { href: "/painel/perfil", label: "Meus dados", icon: "config" },
      ],
    },
    {
      section: "suporte",
      items: [
        { href: "/painel/suporte", label: "Chats", icon: "ticket" },
        { href: "/notificacoes", label: "Notificações", icon: "doc" },
      ],
    },
  ],
};

export async function PainelShell({
  children,
  role,
  userName,
  active,
  allowedHrefs,
}: {
  children: React.ReactNode;
  role: Role;
  userName?: string | null;
  active?: string;
  /** Quando passado, filtra os links do nav pra mostrar só os permitidos.
   *  Usado pra construtora com role interna (financeiro/comercial/jurídico
   *  veem só a área dele). Se ausente, mostra tudo (default). */
  allowedHrefs?: Set<string>;
}) {
  const impersonation = await getImpersonationStatus();
  const isImpersonating = impersonation.active;

  // Auto-trigger dos tours só no primeiro acesso (sem
  // tutorialsCompleted.<tourId>). Reabertura via dropdown não persiste.
  let comercialTourAutoOpen = false;
  let corretorTourAutoOpen = false;
  let corretorEquipeTourAutoOpen = false;
  let fundoTourAutoOpen = false;
  let construtoraTourAutoOpen = false;
  let isImobOwner = false;
  // Membro = tem vinculo com imob mas roleInterna !== 'owner'.
  // Solo = sem nenhum vinculo. Owner = canManageMembros.
  let isImobMembro = false;
  let imobNome = "";
  /** Links removidos do nav por permissão (complementa `allowedHrefs`). */
  const hiddenHrefs = new Set<string>();
  if (role === "comercial") {
    const me = await getCurrentDbUser();
    const tcs =
      (me?.tutorialsCompleted as Record<string, string> | null) ?? {};
    comercialTourAutoOpen = !tcs.comercial;
  } else if (role === "fundo") {
    const me = await getCurrentDbUser();
    const tcs =
      (me?.tutorialsCompleted as Record<string, string> | null) ?? {};
    fundoTourAutoOpen = !tcs.fundo;
  } else if (role === "construtora") {
    const me = await getCurrentDbUser();
    const tcs =
      (me?.tutorialsCompleted as Record<string, string> | null) ?? {};
    construtoraTourAutoOpen = !tcs.construtora;
  } else if (role === "corretor" || role === "imobiliaria") {
    const [me, mem] = await Promise.all([
      getCurrentDbUser(),
      getCurrentImobMembership(),
    ]);
    const tcs =
      (me?.tutorialsCompleted as Record<string, string> | null) ?? {};
    isImobOwner = mem?.canManageMembros ?? false;
    isImobMembro = !!mem && mem.roleInterna !== "owner";
    imobNome = mem?.imobiliariaRazaoSocial ?? "";
    // "Matriz e filiais" é alteração cadastral do grupo — só o responsável
    // pela matriz vê o item no menu.
    if (!mem?.canManageFiliais) hiddenHrefs.add("/painel/filiais");
    if (isImobMembro) {
      corretorEquipeTourAutoOpen = !tcs["corretor-equipe"];
    } else {
      corretorTourAutoOpen = !tcs.corretor;
    }
  }
  const navAll = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.corretor;
  const visivel = (href: string) =>
    !hiddenHrefs.has(href) && (!allowedHrefs || allowedHrefs.has(href));
  const nav =
    allowedHrefs || hiddenHrefs.size > 0
      ? navAll.flatMap<NavItem>((item) => {
          if (item.submenu) {
            const filtered = item.submenu.filter((s) => visivel(s.href));
            return filtered.length > 0
              ? [{ label: item.label, submenu: filtered }]
              : [];
          }
          return visivel(item.href) ? [item] : [];
        })
      : navAll;
  const homeHref = role === "admin" ? "/admin" : "/painel";
  const userLabel = userName ?? ROLE_LABEL[role];
  const roleLabel = ROLE_LABEL[role];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <ImpersonationBanner />
      {role === "comercial" && (
        <ComercialTourMount autoOpen={comercialTourAutoOpen} />
      )}
      {role === "fundo" && <FundoTourMount autoOpen={fundoTourAutoOpen} />}
      {role === "construtora" && (
        <ConstrutoraTourMount autoOpen={construtoraTourAutoOpen} />
      )}
      {(role === "corretor" || role === "imobiliaria") && !isImobMembro && (
        <CorretorTourMount
          autoOpen={corretorTourAutoOpen}
          isImobOwner={isImobOwner}
        />
      )}
      {(role === "corretor" || role === "imobiliaria") && isImobMembro && (
        <CorretorEquipeTourMount
          autoOpen={corretorEquipeTourAutoOpen}
          imobNome={imobNome}
        />
      )}
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-7xl px-4 md:px-6 h-16 flex items-center justify-between gap-3 md:gap-6">
          <Link
            href={homeHref}
            className="text-fg hover:text-accent transition-colors flex items-center"
          >
            <Logo size={32} />
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map((item) => {
              if (item.submenu) {
                return (
                  <NavDropdown
                    key={item.label}
                    label={item.label}
                    items={item.submenu}
                    active={active}
                  />
                );
              }
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
          <div className="flex items-center gap-2 md:gap-3">
            <NotificationBell />
            <span className="hidden md:inline-flex">
              <SairButton isImpersonating={isImpersonating} />
            </span>
            <span className="hidden md:inline-flex">
              <UserButtonWithPerfil
                profileLabel={ROLE_LABEL[role]}
                userName={userName}
                tourId={
                  role === "comercial"
                    ? "comercial"
                    : role === "fundo"
                      ? "fundo"
                      : role === "construtora"
                        ? "construtora"
                        : role === "corretor" || role === "imobiliaria"
                          ? isImobMembro
                            ? "corretor-equipe"
                            : "corretor"
                          : null
                }
              />
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-12">
        <DocumentosGate />
        {children}
      </main>
      <VersionFooter />

      <MobileBottomNav
        shortcuts={MOBILE_SHORTCUTS[role] ?? MOBILE_SHORTCUTS.corretor}
        fullMenu={MOBILE_FULLMENU[role] ?? MOBILE_FULLMENU.corretor}
        userLabel={userLabel}
        roleLabel={roleLabel}
        active={active ?? ""}
      />
    </div>
  );
}
