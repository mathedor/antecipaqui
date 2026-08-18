/**
 * Configura a integração OperAPI no fundo Opera Capital — DEMO e PRODUÇÃO.
 *
 * Grava exatamente o que a tela /admin/fundos/[id]/integracao edita:
 * credencial usuário/senha, URL do ambiente da OPERA e a identidade do
 * parceiro (seção `envio` do contrato). Rodar de novo é seguro: preserva o
 * webhook secret e o restante do contrato salvo.
 *
 * A credencial NUNCA fica neste arquivo — vem do ambiente:
 *
 *   OPERA_USUARIO=... OPERA_SENHA=... npx tsx scripts/configurar-opera.ts
 */
import "dotenv/config";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

const API_URL =
  process.env.OPERA_API_URL ?? "https://operadados-dev.operacapital.com.br";
const ENVIO = {
  parceiro: "ANTECIPAQUI",
  cnpjEmpresa: "42.081.459/0001-07",
  operacaoPreCalculada: true,
  faseLiberacao: "N",
  executaFiltro: "S",
  tipoDocumento: "D",
  cadastrarSacado: false,
};

async function configurar(rotulo: string, url: string) {
  const sql = neon(url);
  const [fundo] = await sql`
    SELECT id, razao_social, integracao_contrato, integracao_webhook_secret
    FROM fundos WHERE razao_social ILIKE '%opera capital%' LIMIT 1`;
  if (!fundo) {
    console.log(`[${rotulo}] fundo Opera Capital não encontrado — pulado`);
    return;
  }

  const credenciais = {
    tipo: "usuario_senha",
    usuario: process.env.OPERA_USUARIO,
    senha: process.env.OPERA_SENHA,
  };
  const contrato = {
    ...((fundo.integracao_contrato as Record<string, unknown>) ?? {}),
    envio: ENVIO,
  };
  const segredo =
    fundo.integracao_webhook_secret ??
    crypto.randomBytes(32).toString("base64url");

  await sql`
    UPDATE fundos SET
      integracao_tipo = 'opera',
      integracao_ambiente = 'sandbox',
      integracao_api_url = ${API_URL},
      integracao_credenciais = ${JSON.stringify(credenciais)}::jsonb,
      integracao_contrato = ${JSON.stringify(contrato)}::jsonb,
      integracao_webhook_secret = ${segredo},
      updated_at = now()
    WHERE id = ${fundo.id}`;

  console.log(
    `[${rotulo}] ${fundo.razao_social} (${String(fundo.id).slice(0, 8)}) configurado` +
      (fundo.integracao_webhook_secret ? "" : " · webhook secret novo gerado"),
  );
}

async function main() {
  if (!process.env.OPERA_USUARIO || !process.env.OPERA_SENHA) {
    throw new Error(
      "Defina OPERA_USUARIO e OPERA_SENHA no ambiente antes de rodar",
    );
  }
  const demo = process.env.DATABASE_URL;
  if (!demo) throw new Error("DATABASE_URL ausente — rode com .env.local");
  await configurar("DEMO", demo);
  await configurar("PROD", demo.replace("/neondb?", "/antecipaqui_prod?"));
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
