/**
 * O que a OPERA nos contou (PROD) e o que isso virou aqui dentro. Só leitura.
 * Mostra, nesta ordem: os webhooks que chegaram, o espelho de cada operação,
 * a timeline que o cliente enxerga e os avisos disparados — é a conferência
 * inteira num comando, porque status agora é canal único (webhook-only) e a
 * pergunta que importa é "N entregas do mesmo fato viraram QUANTOS avisos?".
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

  const espelhos = await sql`
    SELECT o.numero, o.status AS status_interno_operacao,
      e.externo_id, e.status_externo, e.status_label, e.status_desconhecido,
      e.observacao, e.link_assinatura IS NOT NULL AS tem_link,
      e.ultimo_evento_em, e.updated_at
    FROM opera_operacoes e JOIN operacoes o ON o.id = e.operacao_id
    ORDER BY e.updated_at DESC LIMIT 10`;
  console.log("\n═══ espelho das operações (o que o fundo já disse) ═══");
  console.log(JSON.stringify(espelhos, null, 2));

  const timeline = await sql`
    SELECT o.numero, ev.type, ev.created_at, ev.payload
    FROM operacao_events ev JOIN operacoes o ON o.id = ev.operacao_id
    WHERE ev.type LIKE 'opera%' ORDER BY ev.created_at DESC LIMIT 10`;
  console.log("\n═══ timeline do cliente (eventos opera_*) ═══");
  console.log(JSON.stringify(timeline, null, 2));

  const avisos = await sql`
    SELECT n.created_at, u.email, n.type, n.title, n.email_sent, n.sms_sent
    FROM notificacoes n LEFT JOIN users u ON u.id = n.user_id
    WHERE n.type LIKE 'opera%' ORDER BY n.created_at DESC LIMIT 10`;
  console.log("\n═══ avisos disparados ═══");
  console.log(JSON.stringify(avisos, null, 2));

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
