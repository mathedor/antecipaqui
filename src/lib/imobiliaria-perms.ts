/** Tipos puros — sem "use server", podem ser importados client side. */

export type ImobInternalRole = "owner" | "gerente" | "corretor" | "financeiro";

/** Uma unidade do grupo econômico (a matriz ou uma filial). */
export type ImobUnidade = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  /** Nome interno — "Matriz", "Filial Balneário Camboriú". */
  apelido: string | null;
  cnpj: string;
  cidade: string | null;
  uf: string | null;
  isMatriz: boolean;
  /** Contrato de cessão sai no CNPJ + conta da matriz. */
  operaEmNomeDaMatriz: boolean;
  isActive: boolean;
};

export type ImobMembership = {
  /** Unidade de LOTAÇÃO do user (matriz ou filial específica). */
  imobiliariaId: string;
  imobiliariaRazaoSocial: string;
  roleInterna: ImobInternalRole;

  /* ---- grupo econômico ---- */
  /** ID da matriz do grupo. Igual a `imobiliariaId` quando o user é da matriz
   *  (ou quando a imobiliária é independente, sem filiais). */
  matrizId: string;
  /** User está lotado na matriz (vs. lotado numa filial). */
  isMatriz: boolean;
  /** A matriz do grupo declarou que possui filiais. */
  possuiFiliais: boolean;
  /** Unidades que este user enxerga. Quem é da matriz vê o grupo inteiro;
   *  quem é de filial vê só a própria filial. Sempre inclui a lotação. */
  unidades: ImobUnidade[];
  /** IDs pra filtrar operações/atendimentos — derivado de `unidades`. */
  scopeImobIds: string[];

  /* ---- capabilities derivadas do role ---- */
  canManageMembros: boolean;
  canViewFinanceiroConsolidado: boolean;
  canSeeAllOps: boolean;
  canSeeAllAtendimentos: boolean;
  canCreateOperacao: boolean;
  canEditImob: boolean;
  /** Cadastrar/editar/desativar filiais — só owner da MATRIZ. */
  canManageFiliais: boolean;
};

export const INTERNAL_ROLE_LABEL: Record<ImobInternalRole, string> = {
  owner: "Owner",
  gerente: "Gerente",
  corretor: "Corretor",
  financeiro: "Financeiro",
};

/** Roles que, quando lotados na MATRIZ, enxergam o grupo econômico inteiro.
 *  Corretor da matriz opera só pela matriz — quem cuida de filial é membro
 *  lotado nela. */
const ROLES_ESCOPO_GRUPO: ImobInternalRole[] = [
  "owner",
  "gerente",
  "financeiro",
];

export function temEscopoDeGrupo(
  role: ImobInternalRole,
  isMatriz: boolean,
): boolean {
  return isMatriz && ROLES_ESCOPO_GRUPO.includes(role);
}

/** Rótulo curto pra seletores e tabelas. */
export function unidadeLabel(u: {
  apelido: string | null;
  nomeFantasia: string | null;
  razaoSocial: string;
  cidade: string | null;
  uf: string | null;
  isMatriz: boolean;
}): string {
  const nome =
    u.apelido?.trim() ||
    u.nomeFantasia?.trim() ||
    u.razaoSocial;
  const local = [u.cidade, u.uf].filter(Boolean).join("/");
  const prefixo = u.isMatriz ? "Matriz" : "Filial";
  // Evita "Matriz · Matriz" quando o apelido já diz isso
  const base = nome.toLowerCase().startsWith(prefixo.toLowerCase())
    ? nome
    : `${prefixo} · ${nome}`;
  return local ? `${base} (${local})` : base;
}

export function capabilitiesFor(
  role: ImobInternalRole,
  opts?: { isMatriz?: boolean },
): Omit<
  ImobMembership,
  | "imobiliariaId"
  | "imobiliariaRazaoSocial"
  | "roleInterna"
  | "matrizId"
  | "isMatriz"
  | "possuiFiliais"
  | "unidades"
  | "scopeImobIds"
> {
  // Filiais são cadastradas só pelo owner da matriz — é alteração cadastral
  // do grupo, não da unidade.
  const isMatriz = opts?.isMatriz ?? true;

  switch (role) {
    case "owner":
      return {
        canManageMembros: true,
        canViewFinanceiroConsolidado: true,
        canSeeAllOps: true,
        canSeeAllAtendimentos: true,
        canCreateOperacao: true,
        canEditImob: true,
        canManageFiliais: isMatriz,
      };
    case "gerente":
      return {
        canManageMembros: false,
        canViewFinanceiroConsolidado: true,
        canSeeAllOps: true,
        canSeeAllAtendimentos: true,
        canCreateOperacao: true,
        canEditImob: false,
        canManageFiliais: false,
      };
    case "corretor":
      return {
        canManageMembros: false,
        canViewFinanceiroConsolidado: false,
        canSeeAllOps: false,
        canSeeAllAtendimentos: false,
        canCreateOperacao: true,
        canEditImob: false,
        canManageFiliais: false,
      };
    case "financeiro":
      return {
        canManageMembros: false,
        canViewFinanceiroConsolidado: true,
        canSeeAllOps: true,
        canSeeAllAtendimentos: false,
        canCreateOperacao: false,
        canEditImob: false,
        canManageFiliais: false,
      };
  }
}
