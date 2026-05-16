import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { registerClick } from "@/lib/actions/comercial-convite";
import {
  REF_COOKIE_NAME,
  REF_COOKIE_MAX_DAYS,
} from "@/lib/comercial-convite-constants";

export const dynamic = "force-dynamic";

/** Landing pública /c/[token] — conta clique, seta cookie de origem e
 *  redireciona pra /cadastre-se. O cookie é consumido depois pelo
 *  onboarding (quando a imobiliária é criada). */
export default async function ConviteRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await registerClick(token);

  if (!result.ok) {
    // Token inválido ou inativo — manda pra cadastro sem ref
    redirect("/cadastre-se");
  }

  const cookieStore = await cookies();
  cookieStore.set(REF_COOKIE_NAME, token, {
    maxAge: REF_COOKIE_MAX_DAYS * 24 * 60 * 60,
    httpOnly: false, // false pra debug fácil; sem segredo nessa info
    sameSite: "lax",
    path: "/",
  });

  redirect("/cadastre-se?ref=" + encodeURIComponent(token));
}
