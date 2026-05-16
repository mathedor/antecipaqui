/** Helpers de impersonation — server-side.
 *
 *  Admin pode "ver como" um user (corretor/imob/construtora/fundo/comercial)
 *  setando um cookie. `getCurrentDbUser()` retorna o user impersonado em vez
 *  do admin. Toda ação é auditada com a flag impersonatedBy.
 *
 *  Cookie expira em 4 horas. Não pode impersonar outro admin.
 */

export const IMPERSONATE_COOKIE_NAME = "aq_impersonate_user_id";
export const IMPERSONATE_COOKIE_MAX_HOURS = 4;
