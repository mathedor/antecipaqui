/**
 * Mapeia user.role pro role aceito pelo <PainelShell>. Usar em TODAS as
 * páginas que renderizam PainelShell pra não trocar o menu pelo do role
 * errado quando alguém acessa uma rota que serve múltiplos roles.
 *
 * Páginas role-específicas devem fazer redirect("/painel") antes — esse
 * helper é só pro caso multi-role.
 */
export type PainelRole =
  | "corretor"
  | "imobiliaria"
  | "construtora"
  | "fundo"
  | "comercial";

export function painelRole(role: string): PainelRole {
  if (role === "imobiliaria") return "imobiliaria";
  if (role === "construtora") return "construtora";
  if (role === "fundo") return "fundo";
  if (role === "comercial") return "comercial";
  return "corretor";
}
