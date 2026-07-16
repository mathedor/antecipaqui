/* Fotografa as telas reais do demo pro deck de apresentação.
 * Rodar: node scripts/shots-apresentacao.cjs
 * Usa demo.antecipaqui.digital (dados seed + Cícero com IA ativa).
 * Contas de teste: senha padrão de scripts/create-test-accounts.ts. */
const path = require("path");
const fs = require("fs");
// puppeteer-core emprestado do projeto anamna (mesma máquina)
const puppeteer = require("/Users/mathemez/dev/anamna/node_modules/puppeteer-core");

const OUT = path.join(__dirname, "..", "antecipaqui-apresentacao", "img");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "https://demo.antecipaqui.digital";

// Clerk pede código de email no sign-in via browser (verificação de device);
// então autenticamos via sign-in token da Backend API — sem senha, sem código.
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "..", ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const CLERK = "https://api.clerk.com/v1";
async function clerkApi(p, m, b) {
  const r = await fetch(CLERK + p, {
    method: m,
    headers: { Authorization: "Bearer " + env.CLERK_SECRET_KEY, "Content-Type": "application/json" },
    body: b ? JSON.stringify(b) : undefined,
  });
  if (!r.ok) throw new Error(p + " " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
}

const CONTAS = {
  corretor: "mathe+corretor-teste@diretoriow.com.br",
  imob: "mathe+imob-teste@diretoriow.com.br",
  construtora: "mathe+construtora-teste@diretoriow.com.br",
  fundo: "mathe+fundo-teste@diretoriow.com.br",
  comercial: "mathe+comercial-teste@diretoriow.com.br",
  admin: "mathe+admin-teste@diretoriow.com.br",
};

const falhas = [];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
    args: ["--mute-audio", "--window-size=1440,900"],
  });
  const page = await browser.newPage();
  const desk = () => page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  const mob = () => page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const limpaDemoBanner = () =>
    page.evaluate(() => {
      // faixa de demo
      document.querySelectorAll("div.bg-amber-400").forEach((e) => e.remove());
      // card "Instalar Antecipaqui" (PWA)
      [...document.querySelectorAll("div,section")].forEach((e) => {
        if (
          e.childElementCount > 0 &&
          e.textContent?.includes("Instalar Antecipaqui") &&
          getComputedStyle(e).position === "fixed"
        )
          e.remove();
      });
    }).catch(() => {});

  const shot = async (name, ms = 900) => {
    await wait(ms);
    await limpaDemoBanner();
    await wait(150);
    await page.screenshot({ path: `${OUT}/${name}.jpg`, type: "jpeg", quality: 82 });
    console.log("📸", name);
  };

  const go = (url) =>
    page
      .goto(BASE + url, { waitUntil: "networkidle2", timeout: 60000 })
      .catch(() => page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 60000 }));

  const tenta = async (nome, fn) => {
    try {
      await fn();
    } catch (e) {
      falhas.push(`${nome}: ${e.message}`);
      console.log("⚠️", nome, String(e.message).slice(0, 120));
    }
  };

  const clickText = (sel, text) =>
    page.evaluate(
      (sel, text) => {
        const el = [...document.querySelectorAll(sel)].find((e) =>
          (e.textContent || "").trim().includes(text),
        );
        if (el) el.click();
        else throw new Error("não achei: " + text);
      },
      sel,
      text,
    );

  const logout = async () => {
    await page.evaluate(() => window.Clerk?.signOut?.()).catch(() => {});
    await wait(800);
    const cookies = await page.cookies(BASE).catch(() => []);
    if (cookies.length) await page.deleteCookie(...cookies).catch(() => {});
    await page
      .evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      })
      .catch(() => {});
  };

  const login = async (email) => {
    await logout();
    const found = await clerkApi("/users?email_address=" + encodeURIComponent(email), "GET");
    if (!found[0]) throw new Error("clerk user não achado: " + email);
    const tok = await clerkApi("/sign_in_tokens", "POST", {
      user_id: found[0].id,
      expires_in_seconds: 600,
    });
    await go("/entrar?__clerk_ticket=" + tok.token);
    for (let i = 0; i < 30; i++) {
      await wait(500);
      if (!page.url().includes("/entrar")) break;
    }
    await wait(1500);
    console.log("🔑", email, "→", page.url());
  };

  /** Abre o Cícero, pergunta e espera a resposta (tool-calling pode demorar). */
  const cicero = async (name, pergunta, extraMs = 0) => {
    await page.waitForSelector('button[title="Cícero — atendente Antecipaqui"]', { timeout: 20000 });
    await page.click('button[title="Cícero — atendente Antecipaqui"]');
    await wait(700);
    await page.waitForSelector('input[placeholder="Pergunta pro Cícero…"]', { timeout: 10000 });
    await page.type('input[placeholder="Pergunta pro Cícero…"]', pergunta, { delay: 12 });
    await page.keyboard.press("Enter");
    // espera o indicador de digitação sumir (resposta chegou)
    const t0 = Date.now();
    await wait(1500);
    while (Date.now() - t0 < 120000) {
      const pensando = await page.evaluate(
        () => document.querySelectorAll(".animate-bounce").length > 0,
      );
      if (!pensando) break;
      await wait(1000);
    }
    await wait(600 + extraMs);
    await shot(name, 200);
  };

  await desk();

  /* ===== PÚBLICO ===== */
  await tenta("home", async () => {
    await go("/");
    await shot("home", 1600);
  });

  /* ===== CORRETOR ===== */
  await login(CONTAS.corretor);
  await tenta("painel-corretor", async () => {
    await go("/painel");
    await shot("painel-corretor", 1600);
  });
  await tenta("simulador", async () => {
    await go("/painel/simular");
    await page.waitForSelector("input", { timeout: 15000 });
    // primeiro input de texto = comissão; troca pra 100.000
    await page.evaluate(() => {
      const el = document.querySelector('input[inputmode="numeric"], input[type="text"]');
      if (el) {
        const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        set.call(el, "100000");
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await shot("simulador", 1400);
  });
  await tenta("operacoes", async () => {
    await go("/painel/operacoes");
    await shot("operacoes", 1400);
  });
  await tenta("operacao-detalhe", async () => {
    // pega uma operação realizada do corretor teste direto no banco
    const { neon } = require(path.join(__dirname, "..", "node_modules", "@neondatabase", "serverless"));
    const sql = neon(env.DATABASE_URL);
    const rows = await sql`
      SELECT o.id FROM operacoes o JOIN users u ON u.id = o.corretor_user_id
      WHERE u.email = ${"mathe+corretor-teste@diretoriow.com.br"} AND o.status = ${"realizada"}
      ORDER BY o.created_at DESC LIMIT 1`;
    if (!rows[0]) throw new Error("corretor teste sem operação realizada");
    await go("/painel/operacoes/" + rows[0].id);
    await shot("operacao-detalhe", 1600);
  });
  await tenta("nova-operacao", async () => {
    await go("/painel/operacoes/nova");
    await shot("nova-operacao", 1400);
  });
  await tenta("cicero-calculo", async () => {
    await go("/painel");
    await cicero("cicero-calculo", "Calcula uma operação de R$ 100.000 em 30, 60 e 90 dias");
  });

  /* ===== IMOBILIÁRIA ===== */
  await login(CONTAS.imob);
  await tenta("painel-imob", async () => {
    await go("/painel");
    await shot("painel-imob", 1600);
  });
  await tenta("cicero-vencimentos", async () => {
    await go("/painel/operacoes");
    await cicero("cicero-vencimentos", "Quais são os próximos vencimentos?");
  });

  /* ===== CONSTRUTORA ===== */
  await login(CONTAS.construtora);
  await tenta("painel-construtora", async () => {
    await go("/painel");
    await shot("painel-construtora", 1600);
  });
  await tenta("duplicatas", async () => {
    await go("/painel/duplicatas");
    await shot("duplicatas", 1400);
  });
  await tenta("cicero-pagamento", async () => {
    await go("/painel");
    await cicero("cicero-pagamento", "Como pago minhas parcelas em aberto? Me dá os dados de pagamento");
  });

  /* ===== FUNDO ===== */
  await login(CONTAS.fundo);
  await tenta("painel-fundo", async () => {
    await go("/painel");
    await shot("painel-fundo", 1700);
  });
  await tenta("mesa-decisao", async () => {
    await go("/painel/pendencias-decisao");
    await shot("mesa-decisao", 1500);
  });
  await tenta("risco", async () => {
    await go("/painel/risco");
    await shot("risco", 1600);
  });
  await tenta("forecast", async () => {
    await go("/painel/forecast");
    await shot("forecast", 1600);
  });
  await tenta("recebimentos", async () => {
    await go("/painel/recebimentos");
    await shot("recebimentos", 1500);
  });
  await tenta("cicero-faturamento", async () => {
    await go("/painel");
    await cicero("cicero-faturamento", "Faturamento de hoje");
  });
  await tenta("cicero-inadimplencia", async () => {
    await go("/painel/recebimentos");
    await cicero("cicero-inadimplencia", "Como está a inadimplência?");
  });
  await tenta("cicero-cobranca", async () => {
    await go("/painel");
    await cicero("cicero-cobranca", "Dispara a cobrança por email dos vencidos");
  });

  /* ===== COMERCIAL ===== */
  await login(CONTAS.comercial);
  await tenta("prospects", async () => {
    await go("/painel/prospects");
    await shot("prospects", 2200);
  });
  await tenta("comissoes", async () => {
    await go("/painel/comissoes");
    await shot("comissoes", 1500);
  });
  await tenta("cicero-comissoes", async () => {
    await go("/painel");
    await cicero("cicero-comissoes", "Quanto tenho a receber de comissão?");
  });

  /* ===== ADMIN ===== */
  await login(CONTAS.admin);
  await tenta("admin-visao", async () => {
    await go("/admin");
    await shot("admin-visao", 1800);
  });
  await tenta("admin-decidir", async () => {
    await go("/admin/decidir");
    await shot("admin-decidir", 1500);
  });
  await tenta("admin-relatorio-fundos", async () => {
    await go("/admin/relatorios/fundos");
    await shot("admin-relatorio-fundos", 1700);
  });
  await tenta("cicero-admin", async () => {
    await go("/admin");
    await cicero("cicero-admin", "Me dá o resumo da plataforma");
  });
  await tenta("cicero-fundos", async () => {
    await go("/admin");
    await cicero("cicero-fundos", "Qual fundo está demorando mais pra operar?");
  });

  /* ===== MOBILE ===== */
  await mob();
  await tenta("mobile-cicero", async () => {
    await login(CONTAS.corretor);
    await go("/painel");
    await cicero("mobile-cicero", "Calcula R$ 50.000 em 30 e 60 dias");
  });
  await tenta("mobile-painel", async () => {
    await go("/painel");
    await shot("mobile-painel", 1500);
  });

  await browser.close();
  console.log("\n===== FIM =====");
  if (falhas.length) {
    console.log("FALHAS:\n" + falhas.map((f) => " - " + f).join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Todas as capturas ok.");
  }
})();
