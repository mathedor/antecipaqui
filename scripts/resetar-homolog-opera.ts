/**
 * RESET DO ESPELHO DE HOMOLOGAÇÃO — usar quando a OPERA excluir o cliente de
 * teste da base deles (pedido comum durante a homologação). Zera a situação
 * do espelho em opera_clientes pra esteira recomeçar do "não consultado";
 * jobs antigos ficam como histórico (todos concluídos, a fila não os relê).
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
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
