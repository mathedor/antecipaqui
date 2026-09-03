/**
 * SONDA — estado de uma operação já enviada, na esteira interna do fundo.
 *
 * Bate em GET /operapi/consulta-integracao-operacao/?operacao_id={uuid} com a
 * credencial do fundo integrado. Sem argumento, usa a última operação
 * espelhada em opera_operacoes.
 *
 *   npx tsx scripts/probe-opera-status-operacao.ts [operacao_id]
 */
import { config } from "dotenv";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  "/neondb?",
  "/antecipaqui_prod?",
);

async function main() {
  const { desc, eq, isNotNull } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { fundos, operaOperacoes, operacoes } = await import("../src/db/schema");

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.integracaoTipo, "opera"))
    .limit(1);
  if (!fundo?.integracaoApiUrl) throw new Error("fundo opera sem URL");
  const cred = fundo.integracaoCredenciais as { usuario: string; senha: string };

  let externoId = process.argv[2];
  let numero = "";
  if (!externoId) {
    const [ultima] = await db
      .select({ externoId: operaOperacoes.externoId, numero: operacoes.numero })
      .from(operaOperacoes)
      .innerJoin(operacoes, eq(operacoes.id, operaOperacoes.operacaoId))
      .where(isNotNull(operaOperacoes.externoId))
      .orderBy(desc(operaOperacoes.enviadaEm))
      .limit(1);
    if (!ultima?.externoId)
      throw new Error("nenhuma operação enviada — nada a consultar");
    externoId = ultima.externoId;
    numero = ultima.numero;
  }
  console.log(`operação ${numero || "(informada)"} → operacao_id ${externoId}`);

  const base = fundo.integracaoApiUrl.replace(/\/+$/, "");
  const auth = await fetch(`${base}/operapi/autenticacao/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cred.usuario, password: cred.senha }),
  });
  if (!auth.ok) throw new Error(`auth HTTP ${auth.status}`);
  const { access } = (await auth.json()) as { access: string };

  const res = await fetch(
    `${base}/operapi/consulta-integracao-operacao/?operacao_id=${encodeURIComponent(externoId)}`,
    { headers: { accept: "application/json", authorization: `Bearer ${access}` } },
  );
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
