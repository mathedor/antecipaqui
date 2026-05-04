/**
 * Diagnóstico ZapSign: testa o token chamando endpoint público de profile.
 *
 * Pra rodar:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-zapsign.ts
 */

import "dotenv/config";

async function main() {
  console.log("\n🔎 Diagnóstico ZapSign\n" + "=".repeat(50));

  const token = process.env.ZAPSIGN_API_TOKEN;
  console.log("\n📋 Env vars:");
  console.log(
    `  ZAPSIGN_API_TOKEN: ${token ? "✓ definida (" + token.slice(0, 8) + "…, " + token.length + " chars)" : "✗ AUSENTE"}`,
  );

  if (!token) {
    console.log("\n❌ ZAPSIGN_API_TOKEN ausente.");
    console.log("\n📝 Pra ativar:");
    console.log("  1. Acesse https://app.zapsign.com.br");
    console.log("  2. Configurações → API → Gerar token");
    console.log("  3. Adicione no .env.local: ZAPSIGN_API_TOKEN=<token>");
    console.log("  4. Vercel: Settings → Environment Variables (Production+Preview+Development)");
    process.exit(0);
  }

  // Valida formato esperado (UUID 36 chars)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    console.log(
      `\n⚠ Formato suspeito. Token padrão ZapSign é UUID (36 chars). O atual tem ${token.length} chars.`,
    );
    console.log("   Pode ser que dois tokens estejam concatenados — verifique no painel.");
  }

  // Tenta listar documentos (endpoint raiz)
  console.log("\n🔌 Testando conexão com API ZapSign...");
  const url = `https://api.zapsign.com.br/api/v1/docs/?api_token=${encodeURIComponent(token)}`;
  try {
    const r = await fetch(url);
    console.log(`  HTTP ${r.status} ${r.statusText}`);
    if (r.status === 401 || r.status === 403) {
      const body = await r.text();
      console.log("✗ Token inválido ou sem permissão.");
      console.log("  Resposta:", body.slice(0, 300));
      process.exit(1);
    }
    if (!r.ok) {
      const body = await r.text();
      console.log("✗ Erro inesperado.");
      console.log("  Resposta:", body.slice(0, 300));
      process.exit(1);
    }
    const data = (await r.json()) as {
      count?: number;
      results?: Array<{ token: string; name: string; status: string }>;
    };
    console.log(
      `✓ Conexão OK. Conta tem ${data.count ?? 0} documento(s) cadastrado(s).`,
    );

    if (data.results && data.results.length > 0) {
      console.log("\n📄 Últimos documentos:");
      for (const d of data.results.slice(0, 5)) {
        console.log(`  • ${d.name} · status: ${d.status} · token: ${d.token.slice(0, 12)}…`);
      }
    } else {
      console.log("  (nenhum documento criado ainda — esperado pra conta nova)");
    }
  } catch (e) {
    console.log("✗ Exceção chamando a API:", (e as Error).message);
    process.exit(1);
  }

  // Verifica webhook
  console.log("\n🔔 Webhook recomendado:");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";
  console.log(`  ${siteUrl}/api/zapsign/webhook`);
  console.log(
    "  → Configure em https://app.zapsign.com.br → Configurações → Webhooks",
  );
  console.log(
    "  Eventos: doc_signed, doc_partially_signed, doc_finished",
  );

  console.log("\n" + "=".repeat(50) + "\n");
}

main().catch((e) => {
  console.error("Erro inesperado:", e);
  process.exit(1);
});
