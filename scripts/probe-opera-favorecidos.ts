/**
 * SONDA — contas de recebimento (favorecidos) que o fundo tem cadastradas
 * para um CNPJ de cedente.
 *
 *   GET /operapi/consulta-favorecidos/{cnpj}/
 *
 * O ERP da OPERA exige o campo `favorecidos` no envio da operação, com o
 * CÓDIGO da conta na base deles — daí a consulta. O cadastro das contas
 * acontece dentro da esteira de cadastro deles.
 *
 *   npx tsx scripts/probe-opera-favorecidos.ts [cnpj]
 */
import { config } from "dotenv";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  "/neondb?",
  "/antecipaqui_prod?",
);

async function main() {
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { fundos } = await import("../src/db/schema");

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.integracaoTipo, "opera"))
    .limit(1);
  if (!fundo?.integracaoApiUrl) throw new Error("fundo opera sem URL");
  const cred = fundo.integracaoCredenciais as { usuario: string; senha: string };

  const cnpj = (process.argv[2] ?? "45989202000146").replace(/\D/g, "");
  const base = fundo.integracaoApiUrl.replace(/\/+$/, "");

  const auth = await fetch(`${base}/operapi/autenticacao/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cred.usuario, password: cred.senha }),
  });
  if (!auth.ok) throw new Error(`auth HTTP ${auth.status}`);
  const { access } = (await auth.json()) as { access: string };

  const url = `${base}/operapi/consulta-favorecidos/${cnpj}/`;
  console.log(`GET ${url}`);
  const res = await fetch(url, {
    headers: { accept: "application/json", authorization: `Bearer ${access}` },
  });
  const corpo = await res.text();
  console.log(`HTTP ${res.status}`);
  try {
    console.log(JSON.stringify(JSON.parse(corpo), null, 2));
  } catch {
    console.log(corpo.slice(0, 2000));
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
