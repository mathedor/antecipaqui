/**
 * Captura screenshots das páginas principais por role.
 * Usa Clerk Backend API pra criar sign-in tokens (auto-login via ticket URL).
 *
 * Uso:
 *   set -a && source .env.local && set +a && npx tsx scripts/capturar-screenshots.ts
 */
import { chromium, type Page, type BrowserContext } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join(__dirname, "screenshots");

if (!process.env.CLERK_SECRET_KEY) {
  console.error("❌ CLERK_SECRET_KEY ausente. Source .env.local antes.");
  process.exit(1);
}

const CLERK_SECRET = process.env.CLERK_SECRET_KEY;
const CLERK_API = "https://api.clerk.com/v1";

async function clerkReq<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    throw new Error(`${method} ${path} → ${r.status} ${await r.text()}`);
  }
  return r.json() as Promise<T>;
}

async function getUserId(email: string): Promise<string> {
  const arr = (await clerkReq<Array<{ id: string }>>(
    `/users?email_address=${encodeURIComponent(email)}`,
  )) as Array<{ id: string }>;
  if (!arr[0]) throw new Error(`user não encontrado: ${email}`);
  return arr[0].id;
}

async function createSignInToken(userId: string): Promise<string> {
  const r = await clerkReq<{ token: string; url: string }>(
    "/sign_in_tokens",
    "POST",
    { user_id: userId, expires_in_seconds: 600 },
  );
  return r.token;
}

async function loginComToken(page: Page, ticket: string) {
  // URL com ticket pra Clerk consumir e estabelecer sessão
  const url = `${BASE}/entrar?__clerk_ticket=${ticket}&__clerk_status=sign_in`;
  await page.goto(url, { waitUntil: "networkidle" });
  // espera redirect pra /painel ou /admin
  await page.waitForURL(/\/(painel|admin)/, { timeout: 30000 });
  await page.waitForTimeout(2000);
}

type ShotPlan = {
  email: string;
  label: string;
  rotas: Array<{ path: string; nome: string }>;
};

const PLANOS: ShotPlan[] = [
  {
    email: "mathe@diretoriow.com.br",
    label: "admin",
    rotas: [
      { path: "/admin", nome: "admin-painel" },
      { path: "/admin/decidir", nome: "admin-decidir" },
      { path: "/admin/operacoes", nome: "admin-operacoes" },
      { path: "/admin/relatorios", nome: "admin-relatorios" },
      { path: "/admin/relatorios/borderos", nome: "admin-borderos-relatorio" },
      { path: "/admin/risco-global", nome: "admin-risco-global" },
      { path: "/admin/fundos", nome: "admin-fundos" },
      { path: "/admin/configuracoes", nome: "admin-configuracoes" },
      { path: "/admin/pendencias", nome: "admin-pendencias" },
    ],
  },
  {
    email: "mathe+fundo-teste@diretoriow.com.br",
    label: "fundo",
    rotas: [
      { path: "/painel", nome: "fundo-painel" },
      { path: "/painel/aprovar", nome: "fundo-aprovar" },
      { path: "/painel/forecast", nome: "fundo-forecast" },
      { path: "/painel/risco", nome: "fundo-risco" },
      { path: "/painel/regras", nome: "fundo-regras" },
      { path: "/painel/api", nome: "fundo-api" },
      { path: "/painel/perfil", nome: "fundo-perfil" },
    ],
  },
  {
    email: "mathe+construtora-teste@diretoriow.com.br",
    label: "construtora",
    rotas: [
      { path: "/painel", nome: "construtora-painel" },
      { path: "/painel/duplicatas", nome: "construtora-duplicatas" },
      { path: "/painel/extrato", nome: "construtora-extrato" },
      { path: "/painel/empreendimentos", nome: "construtora-empreendimentos" },
      { path: "/painel/equipe", nome: "construtora-equipe" },
    ],
  },
  {
    email: "mathe+corretor-teste@diretoriow.com.br",
    label: "corretor",
    rotas: [
      { path: "/painel", nome: "corretor-painel" },
      { path: "/painel/operacoes/nova", nome: "corretor-nova-operacao" },
      { path: "/painel/operacoes/importar", nome: "corretor-importar" },
      { path: "/painel/coleta-comprador", nome: "corretor-coleta" },
      { path: "/painel/simular", nome: "corretor-simular" },
      { path: "/painel/forecast-corretor", nome: "corretor-forecast" },
      { path: "/painel/relatorio", nome: "corretor-relatorio" },
    ],
  },
  {
    email: "mathe+comercial-teste@diretoriow.com.br",
    label: "comercial",
    rotas: [
      { path: "/painel", nome: "comercial-painel" },
      { path: "/painel/operacoes", nome: "comercial-operacoes" },
    ],
  },
];

const PUBLICAS = [
  { path: "/", nome: "publica-home" },
  { path: "/entrar", nome: "publica-entrar" },
  { path: "/como-funciona", nome: "publica-como-funciona" },
];

async function capturar(page: Page, path: string, nome: string) {
  try {
    await page.goto(`${BASE}${path}`, {
      waitUntil: "networkidle",
      timeout: 25000,
    });
    await page.waitForTimeout(1500);
    const out = join(OUT_DIR, `${nome}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  ✓ ${nome}.png`);
  } catch (e) {
    console.log(`  ✗ ${nome}: ${(e as Error).message.slice(0, 100)}`);
  }
}

async function rodarPlano(
  context: BrowserContext,
  plano: ShotPlan,
): Promise<void> {
  console.log(`\n─── ${plano.label.toUpperCase()} (${plano.email}) ───`);
  const page = await context.newPage();
  try {
    const userId = await getUserId(plano.email);
    const token = await createSignInToken(userId);
    await loginComToken(page, token);
    console.log("  ✓ logado");
    for (const r of plano.rotas) {
      await capturar(page, r.path, r.nome);
    }
  } catch (e) {
    console.error(`  ✗ falha: ${(e as Error).message.slice(0, 200)}`);
  } finally {
    await page.close();
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  console.log("🌐 Browser iniciado");

  console.log("\n─── PÚBLICAS ───");
  const ctxPub = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });
  const pagPub = await ctxPub.newPage();
  for (const r of PUBLICAS) {
    await capturar(pagPub, r.path, r.nome);
  }
  await ctxPub.close();

  for (const plano of PLANOS) {
    const ctx = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    await rodarPlano(ctx, plano);
    await ctx.close();
  }

  await browser.close();
  console.log("\n✅ Screenshots salvos em scripts/screenshots/");
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
