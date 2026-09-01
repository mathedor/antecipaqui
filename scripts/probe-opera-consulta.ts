/** Consulta o CNPJ de teste na OperAPI (mesma chamada da peça 01). */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const CNPJ_TESTE = process.argv[2] ?? "45989123000135";

async function main() {
  const sql = neon(
    process.env.DATABASE_URL!.replace("/neondb?", "/antecipaqui_prod?"),
  );
  const [fundo] = await sql`
    SELECT integracao_api_url AS url,
      integracao_credenciais->>'usuario' AS usuario,
      integracao_credenciais->>'senha' AS senha,
      integracao_contrato->'envio'->>'parceiro' AS parceiro
    FROM fundos WHERE integracao_tipo = 'opera' LIMIT 1`;

  const auth = await fetch(`${fundo.url}/operapi/autenticacao/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: fundo.usuario, password: fundo.senha }),
  });
  if (!auth.ok) throw new Error(`auth HTTP ${auth.status}`);
  const { access } = (await auth.json()) as { access: string };

  const res = await fetch(`${fundo.url}/operapi/consulta-cliente-parceiro/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${access}`,
    },
    body: JSON.stringify({ parceiro: fundo.parceiro, cnpj_cliente: CNPJ_TESTE }),
  });
  console.log(`HTTP ${res.status}`);
  console.log((await res.text()).slice(0, 1000));
}

main().then(() => process.exit(0), (e) => { console.error("erro:", (e as Error).message); process.exit(1); });
