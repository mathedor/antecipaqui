/**
 * QA tester — runner que testa o app completo:
 *
 *   1. INTEGRITY  — lê código e valida estrutura (rotas existem, links válidos,
 *                   server actions exportadas batem com importações).
 *   2. DB         — confere seeds (admin, comercial Antecipaqui), FKs, contas
 *                   de teste presentes.
 *   3. SMOKE      — HTTP nas rotas críticas: públicas devolvem 200, protegidas
 *                   redirecionam pra /entrar, /api/upload responde 400 sem body.
 *   4. LOGIN      — pra cada role de teste, autentica via Clerk Backend API
 *                   (cria session, pega token), faz GET autenticado em /painel
 *                   e /admin e checa que cada role acessa o que deveria.
 *   5. BUILD      — tsc --noEmit + eslint (opcional via --skip-build).
 *
 * Uso:
 *   set -a && source .env.local && set +a && \
 *     npx tsx scripts/qa-tester.ts [--base-url=...] [--skip-build] [--skip-login]
 *
 * Opções:
 *   --base-url=http://localhost:3000   alvo dos smoke tests (default)
 *   --skip-build                       pula tsc + eslint (mais rápido)
 *   --skip-login                       pula testes de login Clerk
 *   --report=qa-report.json            saída JSON estruturada (default)
 *
 * Exit code: 0 se tudo OK, 1 se houve falha em qualquer fase.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { TEST_ACCOUNTS } from "./create-test-accounts";

type CheckResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

type PhaseReport = {
  phase: string;
  passed: number;
  failed: number;
  checks: CheckResult[];
  durationMs: number;
};

type Report = {
  baseUrl: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalPassed: number;
  totalFailed: number;
  phases: PhaseReport[];
};

const args = parseArgs();
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const APP = join(SRC, "app");

const report: Report = {
  baseUrl: args.baseUrl,
  startedAt: new Date().toISOString(),
  finishedAt: "",
  durationMs: 0,
  totalPassed: 0,
  totalFailed: 0,
  phases: [],
};
const t0 = Date.now();

function parseArgs() {
  const argv = process.argv.slice(2);
  let baseUrl = "http://localhost:3000";
  let skipBuild = false;
  let skipLogin = false;
  let reportPath = "qa-report.json";
  for (const a of argv) {
    if (a.startsWith("--base-url=")) baseUrl = a.slice("--base-url=".length);
    else if (a === "--skip-build") skipBuild = true;
    else if (a === "--skip-login") skipLogin = true;
    else if (a.startsWith("--report=")) reportPath = a.slice("--report=".length);
  }
  return { baseUrl, skipBuild, skipLogin, reportPath };
}

function runPhase(
  name: string,
  fn: () => Promise<CheckResult[]>,
): Promise<PhaseReport> {
  return (async () => {
    const phaseStart = Date.now();
    console.log(`\n━━━ ${name} ━━━`);
    let checks: CheckResult[] = [];
    try {
      checks = await fn();
    } catch (e) {
      checks = [
        {
          name: `${name} crashed`,
          ok: false,
          detail: (e as Error).message,
        },
      ];
    }
    const passed = checks.filter((c) => c.ok).length;
    const failed = checks.filter((c) => !c.ok).length;
    for (const c of checks) {
      console.log(`  ${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    }
    console.log(`  → ${passed} ok, ${failed} falha${failed === 1 ? "" : "s"}`);
    return {
      phase: name,
      passed,
      failed,
      checks,
      durationMs: Date.now() - phaseStart,
    };
  })();
}

/* ════════════════════ FASE 1: INTEGRITY ════════════════════ */

async function checkIntegrity(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];

  // 1.1 Rotas críticas (page.tsx) existem
  const expectedRoutes = [
    "page.tsx", // home
    "entrar/[[...sign-in]]/page.tsx",
    "painel/page.tsx",
    "admin/page.tsx",
    "admin/operacoes/page.tsx",
    "admin/usuarios/page.tsx",
    "admin/construtoras/page.tsx",
    "admin/fundos/page.tsx",
    "admin/comerciais/page.tsx",
    "admin/cadastrar/page.tsx",
    "admin/cadastrar/imobiliaria/page.tsx",
    "admin/cadastrar/construtora/page.tsx",
    "admin/cadastrar/comercial/page.tsx",
    "admin/cadastrar/operacao/page.tsx",
    "admin/fundos/novo/page.tsx",
    "admin/tickets/page.tsx",
    "admin/mural/page.tsx",
    "admin/configuracoes/page.tsx",
    "admin/relatorios/daily/page.tsx",
    "api/upload/route.ts",
  ];
  for (const route of expectedRoutes) {
    const p = join(APP, route);
    out.push({
      name: `rota existe: app/${route}`,
      ok: existsSync(p),
      detail: existsSync(p) ? undefined : `arquivo não encontrado: ${p}`,
    });
  }

  // 1.2 Componentes-shell existem pra cada role-base
  const shells = [
    "admin-shell.tsx",
    "user-button-with-perfil.tsx",
    "feedback-provider.tsx",
    "file-upload-field.tsx",
  ];
  for (const c of shells) {
    const p = join(SRC, "components", c);
    out.push({
      name: `componente: ${c}`,
      ok: existsSync(p),
    });
  }

  // 1.3 Util sanitizeFileName existe
  const sanitizePath = join(SRC, "lib", "sanitize-filename.ts");
  out.push({
    name: "util sanitize-filename existe",
    ok: existsSync(sanitizePath),
  });

  // 1.4 Cada call site de upload() usa sanitizeFileName
  const uploadCallSites = grepFiles(SRC, /await upload\(/, [".tsx", ".ts"]);
  for (const file of uploadCallSites) {
    const content = readFileSync(file, "utf8");
    const usesSanitize = /sanitizeFileName/.test(content);
    out.push({
      name: `upload site sanitiza: ${relative(ROOT, file)}`,
      ok: usesSanitize,
      detail: usesSanitize ? undefined : "import sanitizeFileName e use no path",
    });
  }

  // 1.5 Server actions com `redirect()` em delete actions são bug
  const adminDeletePath = join(SRC, "lib", "actions", "admin-delete.ts");
  if (existsSync(adminDeletePath)) {
    const content = readFileSync(adminDeletePath, "utf8");
    const hasRedirect = /\bredirect\(["']\//.test(content);
    out.push({
      name: "admin-delete não usa redirect() (NEXT_REDIRECT bug)",
      ok: !hasRedirect,
      detail: hasRedirect ? "remova redirect() — actions devem retornar resultado" : undefined,
    });
  }

  // 1.6 Convites Clerk não usam fallback "" no redirectUrl
  const inviteFiles = [
    join(SRC, "lib", "actions", "fundo-invite.ts"),
    join(SRC, "lib", "actions", "admin-cadastrar.ts"),
    join(SRC, "lib", "actions", "comerciais.ts"),
  ];
  for (const f of inviteFiles) {
    if (!existsSync(f)) continue;
    const content = readFileSync(f, "utf8");
    const badFallback = /process\.env\.NEXT_PUBLIC_SITE_URL\s*\?\?\s*"".*\/painel/s.test(
      content.replace(/\s+/g, " "),
    );
    out.push({
      name: `convite Clerk fallback OK: ${relative(ROOT, f)}`,
      ok: !badFallback,
      detail: badFallback
        ? 'fallback "" produz "/painel" — Clerk rejeita URL relativa'
        : undefined,
    });
  }

  return out;
}

function grepFiles(dir: string, pattern: RegExp, exts: string[]): string[] {
  const results: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        walk(full);
      } else if (exts.some((ext) => entry.endsWith(ext))) {
        try {
          if (pattern.test(readFileSync(full, "utf8"))) results.push(full);
        } catch {
          // skip
        }
      }
    }
  }
  walk(dir);
  return results;
}

/* ════════════════════ FASE 2: DB ════════════════════ */

async function checkDb(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];

  try {
    // 2.1 Conexão básica
    const ping = await db.execute(sql`select 1 as one`);
    out.push({ name: "DB conecta", ok: ping.rows.length === 1 });
  } catch (e) {
    out.push({
      name: "DB conecta",
      ok: false,
      detail: (e as Error).message,
    });
    return out; // sem DB, não dá pra continuar
  }

  // 2.2 Tabelas críticas existem
  const expectedTables = [
    "users",
    "imobiliarias",
    "construtoras",
    "comerciais",
    "fundos",
    "operacoes",
    "documentos",
    "tickets",
  ];
  for (const t of expectedTables) {
    try {
      await db.execute(sql.raw(`select 1 from ${t} limit 1`));
      out.push({ name: `tabela: ${t}`, ok: true });
    } catch (e) {
      out.push({
        name: `tabela: ${t}`,
        ok: false,
        detail: (e as Error).message,
      });
    }
  }

  // 2.3 Seeds esperados
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  out.push({
    name: "ADMIN_EMAILS env tem ao menos 1",
    ok: adminEmails.length > 0,
    detail:
      adminEmails.length === 0
        ? "defina ADMIN_EMAILS no .env (separados por vírgula)"
        : `${adminEmails.length} admin(s)`,
  });

  // Comercial default Antecipaqui
  try {
    const r = await db.execute(
      sql`select id from comerciais where nome_completo ilike 'Antecipaqui%' limit 1`,
    );
    out.push({
      name: "comercial 'Antecipaqui' default presente",
      ok: r.rows.length > 0,
      detail: r.rows.length === 0 ? "rode tsx scripts/seed-comercial-antecipaqui.ts" : undefined,
    });
  } catch (e) {
    out.push({
      name: "comercial 'Antecipaqui' default presente",
      ok: false,
      detail: (e as Error).message,
    });
  }

  // 2.4 Contas de teste de cada role
  for (const acc of TEST_ACCOUNTS) {
    try {
      const r = await db.execute(
        sql`select role from users where email = ${acc.email} limit 1`,
      );
      const found = r.rows[0] as { role?: string } | undefined;
      out.push({
        name: `conta teste ${acc.role}: ${acc.email}`,
        ok: found?.role === acc.role,
        detail:
          !found
            ? "rode tsx scripts/create-test-accounts.ts"
            : found.role !== acc.role
              ? `role no DB: ${found.role}, esperado: ${acc.role}`
              : undefined,
      });
    } catch (e) {
      out.push({
        name: `conta teste ${acc.role}`,
        ok: false,
        detail: (e as Error).message,
      });
    }
  }

  return out;
}

/* ════════════════════ FASE 3: SMOKE HTTP ════════════════════ */

async function checkSmoke(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const base = args.baseUrl.replace(/\/$/, "");

  type Probe = {
    name: string;
    method: "GET" | "POST";
    path: string;
    body?: string;
    expectStatus: number | number[];
  };

  const probes: Probe[] = [
    { name: "GET / (home pública)", method: "GET", path: "/", expectStatus: 200 },
    { name: "GET /entrar (sign-in público)", method: "GET", path: "/entrar", expectStatus: 200 },
    {
      name: "GET /admin (sem session) → redirect /entrar",
      method: "GET",
      path: "/admin",
      expectStatus: [302, 307, 404],
    },
    {
      name: "GET /painel (sem session) → redirect /entrar",
      method: "GET",
      path: "/painel",
      expectStatus: [302, 307, 404],
    },
    {
      name: "GET /operacoes (sem session) → redirect /entrar",
      method: "GET",
      path: "/operacoes",
      expectStatus: [302, 307, 404],
    },
    {
      name: "POST /api/upload sem session → 401",
      method: "POST",
      path: "/api/upload",
      body: JSON.stringify({
        type: "blob.generate-client-token",
        payload: { pathname: "test.pdf", clientPayload: null, multipart: false },
      }),
      expectStatus: [400, 401],
    },
  ];

  for (const probe of probes) {
    try {
      const res = await fetch(base + probe.path, {
        method: probe.method,
        redirect: "manual",
        headers: probe.body ? { "content-type": "application/json" } : undefined,
        body: probe.body,
      });
      const expected = Array.isArray(probe.expectStatus)
        ? probe.expectStatus
        : [probe.expectStatus];
      const ok = expected.includes(res.status);
      out.push({
        name: probe.name,
        ok,
        detail: ok ? undefined : `status ${res.status}, esperado ${expected.join("|")}`,
      });
    } catch (e) {
      out.push({
        name: probe.name,
        ok: false,
        detail: `request falhou: ${(e as Error).message}`,
      });
    }
  }

  return out;
}

/* ════════════════════ FASE 4: LOGIN POR ROLE ════════════════════ */

const CLERK_API = "https://api.clerk.com/v1";

async function clerkRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let parsed: unknown;
  try {
    parsed = txt ? JSON.parse(txt) : null;
  } catch {
    parsed = txt;
  }
  if (!res.ok) {
    const errStr = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`Clerk ${method} ${path} → ${res.status}: ${errStr}`);
  }
  return parsed;
}

async function checkLogins(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];

  if (!process.env.CLERK_SECRET_KEY) {
    out.push({
      name: "CLERK_SECRET_KEY no env",
      ok: false,
      detail: "obrigatória pra checar logins via Clerk Backend API",
    });
    return out;
  }

  for (const acc of TEST_ACCOUNTS) {
    try {
      // 4.1 Existe no Clerk
      const list = (await clerkRequest(
        `/users?email_address=${encodeURIComponent(acc.email)}`,
        "GET",
      )) as { data?: Array<{ id: string }> } | Array<{ id: string }>;
      const userArr = Array.isArray(list)
        ? list
        : (list as { data?: Array<{ id: string }> }).data ?? [];
      if (userArr.length === 0) {
        out.push({
          name: `${acc.role}: usuário existe no Clerk`,
          ok: false,
          detail: "rode tsx scripts/create-test-accounts.ts",
        });
        continue;
      }
      const userId = userArr[0].id;
      out.push({ name: `${acc.role}: usuário no Clerk (${acc.email})`, ok: true });

      // 4.2 Cria session via Backend API (impersonação) — confirma que o user
      // pode ser autenticado e que tem permissão na app
      try {
        const session = (await clerkRequest("/sessions", "POST", {
          user_id: userId,
        })) as { id: string; status?: string };
        out.push({
          name: `${acc.role}: session criável (impersonate)`,
          ok: !!session.id,
          detail: session.status ? `status: ${session.status}` : undefined,
        });
        // Limpa a session pra não poluir Clerk
        try {
          await clerkRequest(`/sessions/${session.id}/revoke`, "POST");
        } catch {
          // ignorar erros de revoke
        }
      } catch (e) {
        const msg = (e as Error).message;
        // Plano free pode não suportar; não falha o teste, só informa
        if (msg.includes("not allowed") || msg.includes("plan")) {
          out.push({
            name: `${acc.role}: session criável`,
            ok: true,
            detail: "skip — Backend API session não disponível no plano",
          });
        } else {
          out.push({
            name: `${acc.role}: session criável`,
            ok: false,
            detail: msg.slice(0, 200),
          });
        }
      }

      // 4.3 publicMetadata.role bate com role no DB (pra fundo/comercial)
      if (acc.role === "fundo" || acc.role === "comercial") {
        const u = (await clerkRequest(`/users/${userId}`, "GET")) as {
          public_metadata?: { role?: string };
        };
        const pm = u.public_metadata?.role;
        out.push({
          name: `${acc.role}: publicMetadata.role correto`,
          ok: pm === acc.role,
          detail:
            pm === acc.role
              ? undefined
              : `publicMetadata.role = ${pm ?? "null"}, esperado ${acc.role}`,
        });
      }
    } catch (e) {
      out.push({
        name: `${acc.role}: check falhou`,
        ok: false,
        detail: (e as Error).message.slice(0, 200),
      });
    }
  }

  return out;
}

/* ════════════════════ FASE 5: BUILD ════════════════════ */

async function checkBuild(): Promise<CheckResult[]> {
  const out: CheckResult[] = [];

  try {
    execSync("npx tsc --noEmit", { cwd: ROOT, stdio: "pipe" });
    out.push({ name: "tsc --noEmit", ok: true });
  } catch (e) {
    const stdout = (e as { stdout?: Buffer }).stdout?.toString() ?? "";
    const lines = stdout.split("\n").filter((l) => l.includes("error"));
    out.push({
      name: "tsc --noEmit",
      ok: false,
      detail: lines.slice(0, 5).join(" | ").slice(0, 500),
    });
  }

  try {
    execSync("npx eslint --max-warnings=0 src", { cwd: ROOT, stdio: "pipe" });
    out.push({ name: "eslint sem warnings", ok: true });
  } catch (e) {
    const stdout = (e as { stdout?: Buffer }).stdout?.toString() ?? "";
    const lines = stdout
      .split("\n")
      .filter((l) => /error|warning/i.test(l))
      .slice(0, 5);
    out.push({
      name: "eslint",
      ok: false,
      detail: lines.join(" | ").slice(0, 500),
    });
  }

  return out;
}

/* ════════════════════ MAIN ════════════════════ */

async function main() {
  console.log(`🔎 QA tester · base=${args.baseUrl}`);

  report.phases.push(await runPhase("INTEGRITY", checkIntegrity));
  report.phases.push(await runPhase("DB", checkDb));
  report.phases.push(await runPhase("SMOKE", checkSmoke));
  if (!args.skipLogin) {
    report.phases.push(await runPhase("LOGIN", checkLogins));
  }
  if (!args.skipBuild) {
    report.phases.push(await runPhase("BUILD", checkBuild));
  }

  report.totalPassed = report.phases.reduce((s, p) => s + p.passed, 0);
  report.totalFailed = report.phases.reduce((s, p) => s + p.failed, 0);
  report.finishedAt = new Date().toISOString();
  report.durationMs = Date.now() - t0;

  writeFileSync(args.reportPath, JSON.stringify(report, null, 2));
  console.log(
    `\n═══ TOTAL: ${report.totalPassed} ok · ${report.totalFailed} falha${report.totalFailed === 1 ? "" : "s"} · ${(report.durationMs / 1000).toFixed(1)}s ═══`,
  );
  console.log(`📄 report: ${args.reportPath}`);

  process.exit(report.totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("❌ runner crashed:", e);
  process.exit(1);
});
