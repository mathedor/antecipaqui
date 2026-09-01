/**
 * Baixa o schema OpenAPI da OperAPI (autenticado com a credencial do fundo
 * de PRODUÇÃO) e imprime a definição do CriarClienteRequest.
 *
 *   npx tsx scripts/baixar-schema-opera.ts [NomeDoSchema]
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

async function main() {
  const sql = neon(
    process.env.DATABASE_URL!.replace("/neondb?", "/antecipaqui_prod?"),
  );
  const [fundo] = await sql`
    SELECT integracao_api_url AS url,
      integracao_credenciais->>'usuario' AS usuario,
      integracao_credenciais->>'senha' AS senha
    FROM fundos WHERE integracao_tipo = 'opera' LIMIT 1`;
  if (!fundo) throw new Error("fundo opera não encontrado");

  const auth = await fetch(`${fundo.url}/operapi/autenticacao/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: fundo.usuario, password: fundo.senha }),
  });
  if (!auth.ok) throw new Error(`auth HTTP ${auth.status}`);
  const { access } = (await auth.json()) as { access: string };

  let texto = "";
  for (const tent of [
    { url: `${fundo.url}/operapi/schema/?format=json`, accept: "application/json" },
    { url: `${fundo.url}/operapi/schema/`, accept: "application/vnd.oai.openapi+json" },
    { url: `${fundo.url}/operapi/schema/`, accept: "*/*" },
  ]) {
    const res = await fetch(tent.url, {
      headers: { authorization: `Bearer ${access}`, accept: tent.accept },
    });
    console.log(`GET ${tent.url} (accept ${tent.accept}) → ${res.status}`);
    if (res.ok) {
      texto = await res.text();
      break;
    }
  }
  if (!texto) throw new Error("nenhuma variação do schema respondeu 200");
  const destino = "/tmp/operapi-schema.json";
  writeFileSync(destino, texto);
  console.log(`schema salvo em ${destino} (${texto.length} bytes)`);

  const spec = JSON.parse(texto) as {
    components?: { schemas?: Record<string, unknown> };
  };
  const schemas = spec.components?.schemas ?? {};
  console.log("\nSchemas disponíveis:", Object.keys(schemas).join(", "));

  const alvo = process.argv[2] ?? "CriarClienteRequest";
  const achado = Object.entries(schemas).filter(([k]) =>
    k.toLowerCase().includes(alvo.toLowerCase()),
  );
  for (const [nome, def] of achado) {
    console.log(`\n═══ ${nome} ═══`);
    console.log(JSON.stringify(def, null, 2));
  }
}

main().then(() => process.exit(0), (e) => { console.error("erro:", (e as Error).message); process.exit(1); });
