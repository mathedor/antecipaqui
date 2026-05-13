/** Matriz de permissões por perfil de admin (caminho B — perfis pré-definidos).
 *  null/undefined = trata como 'super' (legado: admins antigos sem profile). */

export type AdminProfile = "super" | "financeiro" | "operacoes" | "suporte";

export type AdminArea =
  | "dashboard"
  | "operacoes"
  | "construtoras"
  | "cadastrar"
  | "convites"
  | "pendentes"
  | "tickets"
  | "mural"
  | "fundos"
  | "comerciais"
  | "usuarios"
  | "relatorios"
  | "interno"
  | "configuracoes"
  | "manage_admins";

export const ADMIN_PROFILE_LABEL: Record<AdminProfile, string> = {
  super: "Super-admin",
  financeiro: "Financeiro",
  operacoes: "Operações",
  suporte: "Suporte",
};

export const ADMIN_PROFILE_DESCRIPTION: Record<AdminProfile, string> = {
  super:
    "Acesso total · pode gerenciar outros admins, configurações e operações.",
  financeiro:
    "Painel financeiro: Invoice (interno), Fundos, Relatórios e Comerciais.",
  operacoes:
    "Operacional: Operações, Construtoras, Cadastrar, Convites e Pendentes.",
  suporte: "Atendimento: Tickets, Mural, Daily e Usuários (leitura).",
};

/** Áreas que cada perfil pode acessar. */
const PERMISSIONS: Record<AdminProfile, AdminArea[]> = {
  super: [
    "dashboard",
    "operacoes",
    "construtoras",
    "cadastrar",
    "convites",
    "pendentes",
    "tickets",
    "mural",
    "fundos",
    "comerciais",
    "usuarios",
    "relatorios",
    "interno",
    "configuracoes",
    "manage_admins",
  ],
  financeiro: [
    "dashboard",
    "interno",
    "fundos",
    "relatorios",
    "comerciais",
    "usuarios", // read-only — UI bloqueia edição
  ],
  operacoes: [
    "dashboard",
    "operacoes",
    "construtoras",
    "cadastrar",
    "convites",
    "pendentes",
    "usuarios",
  ],
  suporte: [
    "dashboard",
    "tickets",
    "mural",
    "relatorios", // pode ver daily
    "usuarios", // read-only
  ],
};

/** Resolve o perfil. null/undefined ou string desconhecida → 'super' (legado). */
export function resolveAdminProfile(
  profile: string | null | undefined,
): AdminProfile {
  if (
    profile === "super" ||
    profile === "financeiro" ||
    profile === "operacoes" ||
    profile === "suporte"
  )
    return profile;
  return "super";
}

export function hasAdminPermission(
  profile: string | null | undefined,
  area: AdminArea,
): boolean {
  const p = resolveAdminProfile(profile);
  return PERMISSIONS[p].includes(area);
}

export function getAdminAllowedAreas(
  profile: string | null | undefined,
): AdminArea[] {
  return PERMISSIONS[resolveAdminProfile(profile)];
}

/** Mapeia path do app pro AdminArea correspondente. Usado no shell pra
 *  filtrar menus e em guards de página. */
export function pathToAdminArea(path: string): AdminArea | null {
  if (path === "/admin" || path === "/admin/") return "dashboard";
  if (path.startsWith("/admin/decidir")) return "operacoes";
  if (path.startsWith("/admin/operacoes")) return "operacoes";
  if (path.startsWith("/admin/construtoras")) return "construtoras";
  if (path.startsWith("/admin/cadastrar")) return "cadastrar";
  if (path.startsWith("/admin/convites")) return "convites";
  if (path.startsWith("/admin/pendentes")) return "pendentes";
  if (path.startsWith("/admin/tickets")) return "tickets";
  if (path.startsWith("/admin/mural")) return "mural";
  if (path.startsWith("/admin/fundos")) return "fundos";
  if (path.startsWith("/admin/comerciais")) return "comerciais";
  if (path.startsWith("/admin/usuarios/admins")) return "manage_admins";
  if (path.startsWith("/admin/usuarios")) return "usuarios";
  if (path.startsWith("/admin/relatorios")) return "relatorios";
  if (path.startsWith("/admin/interno")) return "interno";
  if (path.startsWith("/admin/faturas")) return "interno";
  if (path.startsWith("/admin/configuracoes")) return "configuracoes";
  return null;
}