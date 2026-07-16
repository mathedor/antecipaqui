import { getCurrentDbUser } from "@/lib/auth-user";
import { CiceroWidget } from "@/components/cicero-widget";

/** Renderiza o Cícero (atendente IA) só pra usuários autenticados ativos.
 *  Server component que resolve o user e passa nome/role pro client. */
export async function CiceroWidgetWrapper() {
  let user: Awaited<ReturnType<typeof getCurrentDbUser>> = null;
  try {
    user = await getCurrentDbUser();
  } catch {
    return null;
  }
  if (!user || !user.isActive) return null;
  return <CiceroWidget nome={user.nome ?? user.email} role={user.role} />;
}
