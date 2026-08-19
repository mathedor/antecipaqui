import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { consumirDistribuido, ipDaRequisicao } from "@/lib/seguranca/rate-limit";

// Rate limit global por IP nas rotas de API — teto generoso, só corta abuso
// (martelar endpoint caro). Cron e webhooks têm auth própria e são batidos
// pela infra/parceiros, então ficam de fora pra não bloquear tráfego legítimo.
const LIMITE_API = 120;
const JANELA_API_MS = 10_000;
function isentoDeRateLimit(pathname: string): boolean {
  return (
    pathname.startsWith("/api/cron") ||
    pathname.includes("/webhook") ||
    pathname.startsWith("/api/ana") ||
    // Blob é leve e carrega em rajada (galeria de imagens do chat) — fora do
    // teto global pra não gerar falso 429; sua proteção é tratada à parte.
    pathname.startsWith("/api/blob") ||
    !pathname.startsWith("/api/")
  );
}

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
    pathname.startsWith("/api/opera/webhook") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname === "/manutencao" ||
    /\.[a-z0-9]+$/i.test(pathname)
  );
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Rate limit global por IP nas APIs (antes de tudo — barra abuso cedo).
  if (!isentoDeRateLimit(pathname)) {
    const r = await consumirDistribuido(`api:${ipDaRequisicao(req)}`, LIMITE_API, JANELA_API_MS);
    if (!r.ok) {
      return NextResponse.json(
        { error: "Muitas requisições. Aguarde um instante." },
        { status: 429, headers: { "retry-after": String(r.retryEmSeg) } },
      );
    }
  }

  // Check de manutenção ANTES de qualquer lógica de auth.
  // Demo (NEXT_PUBLIC_DEMO=1) nunca entra em manutenção.
  if (process.env.NEXT_PUBLIC_DEMO !== "1" && !passaLivre(pathname) && (await emManutencao())) {
    return NextResponse.rewrite(new URL("/manutencao", req.url));
  }

  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth();
    if (!userId) {
      // Convite do Clerk caindo em rota protegida: rebater pro /entrar
      // enterra o ticket dentro do redirect_url e a tela fica em branco.
      // Mandamos direto pro cadastro com o ticket intacto — o <SignUp>
      // consome o ticket e conclui o convite. Isso também resgata links
      // antigos criados com redirectUrl /painel.
      const ticket = req.nextUrl.searchParams.get("__clerk_ticket");
      if (ticket) {
        const destino = new URL("/cadastre-se", req.url);
        destino.searchParams.set("__clerk_ticket", ticket);
        const status = req.nextUrl.searchParams.get("__clerk_status");
        if (status) destino.searchParams.set("__clerk_status", status);
        return NextResponse.redirect(destino);
      }
      return redirectToSignIn({ returnBackUrl: req.url });
    }
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
