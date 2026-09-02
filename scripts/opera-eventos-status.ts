/**
 * Eventos de webhook que a OPERA mandou pra nós (PROD), do mais novo pro
 * mais velho. Só leitura — serve pra conferir se a ponta deles já está
 * chamando os nossos endpoints.
 *
 *   npx tsx scripts/opera-eventos-status.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente — rode com .env.local");
  const sql = neon(url.replace("/neondb?", "/antecipaqui_prod?"));

  const resumo = await sql`
    SELECT tipo, status, count(*)::int AS total,
      min(created_at) AS primeiro, max(created_at) AS ultimo
    FROM opera_eventos GROUP BY tipo, status ORDER BY ultimo DESC`;
  console.log("═══ opera_eventos — resumo por tipo/status ═══");
  console.log(resumo.length ? JSON.stringify(resumo, null, 2) : "(vazio — nenhum webhook recebido ainda)");

  const eventos = await sql`
    SELECT id, tipo, externo_evento_id, status, erro, created_at,
      processado_em, payload
    FROM opera_eventos ORDER BY created_at DESC LIMIT 6`;
  console.log("\n═══ últimos 6 eventos (com payload) ═══");
  console.log(JSON.stringify(eventos, null, 2));

  const [saude] = await sql`
    SELECT razao_social, integracao_ultimo_ok_em, integracao_ultimo_erro
    FROM fundos WHERE integracao_tipo = 'opera' LIMIT 1`;
  console.log("\n═══ saúde da integração ═══");
  console.log(JSON.stringify(saude, null, 2));
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
