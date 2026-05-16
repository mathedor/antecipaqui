/** Tipos puros — sem "use server", podem ser importados client side. */

export type ImobInternalRole = "owner" | "gerente" | "corretor" | "financeiro";

export type ImobMembership = {
  imobiliariaId: string;
  imobiliariaRazaoSocial: string;
  roleInterna: ImobInternalRole;
  // capabilities derivadas do role
  canManageMembros: boolean;
  canViewFinanceiroConsolidado: boolean;
  canSeeAllOps: boolean;
  canSeeAllAtendimentos: boolean;
  canCreateOperacao: boolean;
  canEditImob: boolean;
};

export const INTERNAL_ROLE_LABEL: Record<ImobInternalRole, string> = {
  owner: "Owner",
  gerente: "Gerente",
  corretor: "Corretor",
  financeiro: "Financeiro",
};

export function capabilitiesFor(role: ImobInternalRole): Omit<
  ImobMembership,
  "imobiliariaId" | "imobiliariaRazaoSocial" | "roleInterna"
> {
  switch (role) {
    case "owner":
      return {
        canManageMembros: true,
        canViewFinanceiroConsolidado: true,
        canSeeAllOps: true,
        canSeeAllAtendimentos: true,
        canCreateOperacao: true,
        canEditImob: true,
      };
    case "gerente":
      return {
        canManageMembros: false,
        canViewFinanceiroConsolidado: true,
        canSeeAllOps: true,
        canSeeAllAtendimentos: true,
        canCreateOperacao: true,
        canEditImob: false,
      };
    case "corretor":
      return {
        canManageMembros: false,
        canViewFinanceiroConsolidado: false,
        canSeeAllOps: false,
        canSeeAllAtendimentos: false,
        canCreateOperacao: true,
        canEditImob: false,
      };
    case "financeiro":
      return {
        canManageMembros: false,
        canViewFinanceiroConsolidado: true,
        canSeeAllOps: true,
        canSeeAllAtendimentos: false,
        canCreateOperacao: false,
        canEditImob: false,
      };
  }
}
