/**
 * Lê o estado da integração OPERA no fundo — DEMO e PRODUÇÃO — sem expor
 * segredos (mostra só o tipo da credencial e se usuário/senha existem).
 *
 *   npx tsx scripts/check-opera-config.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function checar(rotulo: string, url: string) {
  const sql = neon(url);
  const rows = await sql`
    SELECT id, razao_social, integracao_tipo, integracao_ambiente,
      integracao_api_url,
      integracao_credenciais->>'tipo'                    AS cred_tipo,
      (integracao_credenciais->>'usuario' IS NOT NULL)   AS tem_usuario,
      (integracao_credenciais->>'senha' IS NOT NULL)     AS tem_senha,
      integracao_ultimo_ok_em, integracao_ultimo_erro,
      integracao_contrato->'envio'                       AS envio
    FROM fundos WHERE integracao_tipo = 'opera'`;
  console.log(`\n═══ ${rotulo} ═══`);
  for (const r of rows) {
    console.log(JSON.stringify(r, null, 2));
  }
  if (!rows.length) console.log("(nenhum fundo com integração opera)");
}

async function main() {
  const demo = process.env.DATABASE_URL;
  if (!demo) throw new Error("DATABASE_URL ausente — rode com .env.local");
  await checar("DEMO (neondb)", demo);
  await checar("PROD (antecipaqui_prod)", demo.replace("/neondb?", "/antecipaqui_prod?"));
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
