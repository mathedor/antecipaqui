/**
 * RESET DO ESPELHO DE HOMOLOGAÇÃO — usar quando a OPERA excluir o cliente de
 * teste da base deles (pedido comum durante a homologação). Zera a situação
 * do espelho em opera_clientes pra esteira recomeçar do "não consultado";
 * jobs antigos ficam como histórico (todos concluídos, a fila não os relê).
 *
 * Também encerra os jobs VIVOS da fixture (pendente/bloqueado/desistido):
 * eles se referem à tentativa antiga — deixá-los na fila faria o cron de
 * produção retentar um envio que não existe mais do lado de lá.
 *
 * Depois de rodar, dispare a esteira de novo:
 *
 *   npx tsx scripts/resetar-homolog-opera.ts
 *   npx tsx scripts/homologar-opera-cadastro.ts
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const CNPJ_TESTE = "45989123000135";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente — rode com .env.local");
  const sql = neon(url.replace("/neondb?", "/antecipaqui_prod?"));

  const linhas = await sql`
    UPDATE opera_clientes
    SET situacao = 'nao_consultado', externo_id = NULL, protocolo = NULL,
      motivo = NULL, consultado_em = NULL, enviado_em = NULL,
      respondido_em = NULL, ultima_resposta = NULL, updated_at = now()
    WHERE cnpj = ${CNPJ_TESTE}
    RETURNING id, cnpj, situacao`;
  console.log(
    linhas.length
      ? `Espelho resetado: ${JSON.stringify(linhas)}`
      : "Nenhum espelho com o CNPJ de teste — nada a resetar.",
  );

  const jobs = await sql`
    UPDATE opera_jobs
    SET status = 'concluido', ultimo_erro = NULL, proxima_tentativa_em = NULL,
      resultado = jsonb_build_object('resolvidoPor', 'reset da homologação',
        'nota', 'OPERA excluiu o cliente de teste na base deles; esta tentativa deixou de existir do lado de lá'),
      concluido_em = now(), updated_at = now()
    WHERE ref_id IN (SELECT id FROM opera_clientes WHERE cnpj = ${CNPJ_TESTE})
      AND status IN ('pendente', 'processando', 'bloqueado', 'desistido')
    RETURNING id, tipo, status`;
  console.log(
    jobs.length
      ? `Jobs vivos encerrados: ${JSON.stringify(jobs)}`
      : "Nenhum job vivo da fixture — fila limpa.",
  );
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
