/**
 * Diagnóstico do Resend: verifica configuração e tenta validar a API key.
 *
 * Pra rodar:
 *   set -a && source .env.local && set +a && npx tsx scripts/test-resend.ts
 *
 * Pra mandar email de teste (precisa do email):
 *   set -a && source .env.local && set +a && \
 *     TEST_EMAIL_TO=seu@email.com npx tsx scripts/test-resend.ts
 */

import "dotenv/config";

async function main() {
  console.log("\n🔎 Diagnóstico Resend\n" + "=".repeat(50));

  // 1. Env vars
  const key = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM || "Antecipaqui <noreply@antecipaqui.digital>";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  console.log("\n📋 Env vars:");
  console.log(
    `  RESEND_API_KEY:    ${key ? "✓ definida (" + key.slice(0, 8) + "…)" : "✗ AUSENTE"}`,
  );
  console.log(
    `  RESEND_FROM:       ${process.env.RESEND_FROM ? "✓ " + from : "⚠ usando default → " + from}`,
  );
  console.log(`  NEXT_PUBLIC_SITE_URL: ${siteUrl ? "✓ " + siteUrl : "✗ AUSENTE"}`);

  if (!key) {
    console.log("\n❌ RESEND_API_KEY ausente — emails estão sendo MOCKADOS (console.log).");
    console.log("\n📝 Pra ativar:");
    console.log("  1. Crie conta em https://resend.com (free tier: 100 emails/dia)");
    console.log(
      "  2. Verifique seu domínio (antecipaqui.digital) → Dashboard > Domains > Add Domain → adicione DKIM/SPF/MX",
    );
    console.log("  3. API Keys → Create → permissão Sending access");
    console.log("  4. Adicione no .env.local:");
    console.log("     RESEND_API_KEY=re_xxxxxxxxxxxx");
    console.log('     RESEND_FROM="Antecipaqui <noreply@antecipaqui.digital>"');
    console.log("  5. No Vercel: Settings → Environment Variables → adicionar as duas pra Production+Preview+Development");
    console.log("  6. Redeploy");
    process.exit(0);
  }

  // 2. Valida key listando domínios
  console.log("\n🔌 Testando conexão com a API Resend...");
  let resend: import("resend").Resend;
  try {
    const { Resend } = await import("resend");
    resend = new Resend(key);
  } catch (e) {
    console.log("✗ Erro ao instanciar cliente:", (e as Error).message);
    process.exit(1);
  }

  try {
    const r = await resend.domains.list();
    if (r.error) {
      console.log("✗ API key inválida ou sem permissão:", r.error.message);
      console.log("\n💡 Verifique no painel Resend se a key está ativa e tem permissão 'Full access' ou 'Sending access'.");
      process.exit(1);
    }
    const domains = r.data?.data ?? [];
    console.log(`✓ Conexão OK. ${domains.length} domínio(s) cadastrado(s) na conta.`);

    if (domains.length === 0) {
      console.log("\n⚠ Nenhum domínio verificado. Você só consegue mandar email pro próprio email da conta Resend.");
      console.log("   Adicione antecipaqui.digital em https://resend.com/domains");
    } else {
      console.log("\n📍 Domínios:");
      for (const d of domains) {
        const statusIcon =
          d.status === "verified" ? "✓" : d.status === "pending" ? "⏳" : "✗";
        console.log(`  ${statusIcon} ${d.name} · status: ${d.status} · região: ${d.region}`);
      }

      const fromDomain = from.match(/@([^>\s]+)/)?.[1];
      if (fromDomain) {
        const matched = domains.find(
          (d: { name: string; status: string }) =>
            d.name === fromDomain && d.status === "verified",
        );
        if (matched) {
          console.log(
            `\n✓ RESEND_FROM (${fromDomain}) está VERIFICADO — emails enviam normalmente.`,
          );
        } else {
          console.log(
            `\n⚠ RESEND_FROM aponta pra "${fromDomain}" mas esse domínio não está verificado.`,
          );
          console.log(
            `   Resend só permite enviar de domínios verificados. Verifique em https://resend.com/domains`,
          );
        }
      }
    }
  } catch (e) {
    console.log("✗ Erro chamando a API:", (e as Error).message);
    process.exit(1);
  }

  // 3. Envio de teste opcional
  const testTo = process.env.TEST_EMAIL_TO;
  if (testTo) {
    console.log(`\n✉ Enviando email de teste pra ${testTo}...`);
    try {
      const r = await resend.emails.send({
        from,
        to: testTo,
        subject: "Antecipaqui · teste de configuração Resend",
        text: `Olá!\n\nEste é um email de teste enviado pelo script scripts/test-resend.ts.\n\nSe você recebeu, a integração está funcionando.\n\nEnviado em: ${new Date().toISOString()}`,
        html: `<p>Olá!</p><p>Este é um email de teste enviado pelo <code>scripts/test-resend.ts</code>.</p><p>Se você recebeu, a integração está funcionando.</p><p style="color:#999;font-size:12px">Enviado em: ${new Date().toISOString()}</p>`,
      });
      if (r.error) {
        console.log("✗ Erro ao enviar:", r.error.message);
      } else {
        console.log(`✓ Email enviado! ID: ${r.data?.id}`);
        console.log(`  Cheque a inbox de ${testTo} (e a pasta spam).`);
      }
    } catch (e) {
      console.log("✗ Exceção:", (e as Error).message);
    }
  } else {
    console.log("\n💡 Pra testar envio real, defina TEST_EMAIL_TO:");
    console.log("   TEST_EMAIL_TO=seu@email.com npx tsx scripts/test-resend.ts");
  }

  console.log("\n" + "=".repeat(50) + "\n");
}

main().catch((e) => {
  console.error("Erro inesperado:", e);
  process.exit(1);
});
