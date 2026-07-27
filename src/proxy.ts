import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/painel(.*)",
  "/admin(.*)",
  "/operacoes(.*)",
]);

// ── Trava EM MANUTENÇÃO (controlada pela Ana) ────────────────────────────────
// Fail-open: qualquer erro/timeout na Ana → site segue no ar normal.
// Cache local de 15s por instância; timeout de 800ms na consulta.
const manut = { t: 0, m: false };
async function emManutencao(): Promise<boolean> {
  const agora = Date.now();
  if (agora - manut.t < 15000) return manut.m;
  manut.t = agora; // marca antes: erro não martela a Ana
  try {
    const r = await fetch("https://www.ana.show/api/manutencao/antecipaqui", {
      signal: AbortSignal.timeout(800),
    });
    manut.m = r.ok && (await r.json()).m === true;
  } catch {
    manut.m = false;
  }
  return manut.m;
}

// Rotas que NUNCA são bloqueadas pela manutenção:
// pulso da Ana, a própria página de manutenção, assets/estáticos,
// webhooks de pagamento/assinatura (cobrança, contrato, ZapSign) e crons.
function passaLivre(pathname: string): boolean {
  return (
    pathname.startsWith("/api/ana") ||
    pathname.startsWith("/api/cobranca/webhook") ||
    pathname.startsWith("/api/contrato-assinatura/webhook") ||
    pathname.startsWith("/api/zapsign/webhook") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname === "/manutencao" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export default clerkMiddleware(async (auth, req) => {
  // Check de manutenção ANTES de qualquer lógica de auth.
  // Demo (NEXT_PUBLIC_DEMO=1) nunca entra em manutenção.
  const { pathname } = req.nextUrl;
  if (process.env.NEXT_PUBLIC_DEMO !== "1" && !passaLivre(pathname) && (await emManutencao())) {
    return NextResponse.rewrite(new URL("/manutencao", req.url));
  }

  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) return redirectToSignIn({ returnBackUrl: req.url });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals + all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
