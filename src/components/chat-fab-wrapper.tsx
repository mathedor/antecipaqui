import { getCurrentDbUser } from "@/lib/auth-user";
import { ChatFab } from "@/components/chat-fab";

/** Renderiza o FAB de chat só pra usuários autenticados ativos. Server
 *  component que checa role e passa pro client. */
export async function ChatFabWrapper() {
  let user: Awaited<ReturnType<typeof getCurrentDbUser>> = null;
  try {
    user = await getCurrentDbUser();
  } catch {
    return null;
  }
  if (!user || !user.isActive) return null;
  return <ChatFab isAdmin={user.role === "admin"} />;
}