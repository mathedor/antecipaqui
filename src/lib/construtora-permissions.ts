/** Permissões internas dos membros da construtora.
 *
 *  Cada construtora tem 1 owner (construtoras.ownerUserId) + N membros
 *  convidados (construtora_membros.role_interna). Esse módulo define o que
 *  cada role interna pode ver/fazer.
 */

import "server-only";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoraMembros, construtoras } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";

export type RoleInterna =
  | "owner"
  | "financeiro"
  | "comercial"
  | "juridico"
  | "outro";

export type ConstrutoraArea =
  // financeiro / dinheiro
  | "duplicatas"
  | "extrato"
  | "forecast"
  | "cashback"
  // comercial / vendas
  | "operacoes"
  | "empreendimentos"
  | "score"
  | "risco"
  // jurídico / documentos
  | "documentos"
  | "pendencias"
  // sempre acessível pra todos os membros
  | "chats"
  | "painel"
  // só owner
  | "equipe"
  | "perfil";

const MATRIZ: Record<ConstrutoraArea, RoleInterna[]> = {
  // Owner sempre pode tudo, então adicionamos owner em todas
  duplicatas: ["owner", "financeiro"],
  extrato: ["owner", "financeiro"],
  forecast: ["owner", "financeiro"],
  cashback: ["owner", "financeiro"],
  operacoes: ["owner", "comercial"],
  empreendimentos: ["owner", "comercial"],
  score: ["owner", "comercial", "financeiro"],
  risco: ["owner", "comercial", "financeiro"],
  documentos: ["owner", "juridico"],
  pendencias: ["owner", "juridico"],
  chats: ["owner", "financeiro", "comercial", "juridico", "outro"],
  painel: ["owner", "financeiro", "comercial", "juridico", "outro"],
  equipe: ["owner"],
  perfil: ["owner"],
};

export function hasConstrutoraPermission(
  role: RoleInterna,
  area: ConstrutoraArea,
): boolean {
  return MATRIZ[area].includes(role);
}

/** Descobre a role interna do user na construtora dele.
 *  - Se for ownerUserId da construtora → "owner"
 *  - Senão olha construtora_membros pelo userId → role_interna
 *  - Se não achar, retorna null (não é membro) */
export async function getConstrutoraMembroRole(
  userId: string,
): Promise<{ role: RoleInterna; construtoraId: string } | null> {
  // Owner?
  const [owner] = await db
    .select({ id: construtoras.id })
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, userId))
    .limit(1);
  if (owner) {
    return { role: "owner", construtoraId: owner.id };
  }

  // Membro?
  const [membro] = await db
    .select({
      roleInterna: construtoraMembros.roleInterna,
      construtoraId: construtoraMembros.construtoraId,
    })
    .from(construtoraMembros)
    .where(eq(construtoraMembros.userId, userId))
    .limit(1);

  if (!membro) return null;

  const role = (
    ["owner", "financeiro", "comercial", "juridico", "outro"].includes(
      membro.roleInterna,
    )
      ? membro.roleInterna
      : "outro"
  ) as RoleInterna;

  return { role, construtoraId: membro.construtoraId };
}

/** Helper de uso em páginas: confirma que o user logado pode acessar a `area`
 *  da construtora. Se não puder, redireciona pra /painel. Retorna user + role +
 *  construtoraId quando autorizado. */
export async function requireConstrutoraPermission(area: ConstrutoraArea) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "construtora") redirect("/painel");
  const info = await getConstrutoraMembroRole(user.id);
  if (!info) redirect("/painel/onboarding");
  if (!hasConstrutoraPermission(info.role, area)) {
    redirect("/painel");
  }
  return { user, role: info.role, construtoraId: info.construtoraId };
}

/** Lista de hrefs do nav da construtora permitidos por role interna.
 *  Usado pra filtrar links no painel-shell. */
export function getConstrutoraAllowedNav(
  role: RoleInterna,
): Set<string> {
  const hrefToArea: Record<string, ConstrutoraArea> = {
    "/painel": "painel",
    "/painel/operacoes": "operacoes",
    "/painel/duplicatas": "duplicatas",
    "/painel/extrato": "extrato",
    "/painel/empreendimentos": "empreendimentos",
    "/painel/documentos": "documentos",
    "/painel/pendencias": "pendencias",
    "/painel/forecast": "forecast",
    "/painel/risco": "risco",
    "/painel/score": "score",
    "/painel/cashback": "cashback",
    "/painel/equipe": "equipe",
    "/painel/atendimentos-parceiros": "operacoes",
    "/painel/suporte": "chats",
    "/painel/perfil": "perfil",
  };
  const allowed = new Set<string>();
  for (const [href, area] of Object.entries(hrefToArea)) {
    if (hasConstrutoraPermission(role, area)) allowed.add(href);
  }
  return allowed;
}
