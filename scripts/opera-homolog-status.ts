/**
 * Estado da conversa com a OPERA no banco de PRODUÇÃO: jobs da fila e
 * clientes espelhados, do mais novo pro mais velho. Só leitura.
 *
 *   npx tsx scripts/opera-homolog-status.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main() {
  const demo = process.env.DATABASE_URL;
  if (!demo) throw new Error("DATABASE_URL ausente — rode com .env.local");
  const sql = neon(demo.replace("/neondb?", "/antecipaqui_prod?"));

  const jobs = await sql`
    SELECT id, tipo, ref_tipo, ref_id, status, tentativas, ultimo_erro,
      resultado, created_at, concluido_em
    FROM opera_jobs ORDER BY created_at DESC LIMIT 15`;
  console.log("═══ opera_jobs (PROD, últimos 15) ═══");
  console.log(jobs.length ? JSON.stringify(jobs, null, 2) : "(vazio)");

  const clientes = await sql`
    SELECT id, entidade_tipo, entidade_id, cnpj, situacao, protocolo,
      externo_id, motivo, consultado_em, enviado_em, ultima_resposta
    FROM opera_clientes ORDER BY created_at DESC LIMIT 10`;
  console.log("\n═══ opera_clientes (PROD, últimos 10) ═══");
  console.log(clientes.length ? JSON.stringify(clientes, null, 2) : "(vazio)");
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
