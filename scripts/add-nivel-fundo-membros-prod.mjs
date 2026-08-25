/**
 * Aplica em PRODUÇÃO (antecipaqui_prod) a mesma migração já aplicada no demo
 * pelo drizzle-kit push: coluna fundo_membros.nivel.
 *
 * Regra do projeto: toda mudança de schema vai nos DOIS bancos (demo + prod),
 * senão o próximo deploy quebra. Aqui rodamos só o ALTER exato — mais seguro
 * que `drizzle-kit push --force` contra produção.
 *
 * Uso: node scripts/add-nivel-fundo-membros-prod.mjs
 */
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL?.replace("/neondb?", "/antecipaqui_prod?");
if (!url || !url.includes("antecipaqui_prod")) {
  console.error("DATABASE_URL não encontrada ou não deu pra derivar a de prod");
  process.exit(1);
}

const sql = neon(url);

const antes = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'fundo_membros' AND column_name = 'nivel'`;
if (antes.length > 0) {
  console.log("Coluna nivel já existe em antecipaqui_prod — nada a fazer.");
  process.exit(0);
}

await sql`ALTER TABLE "fundo_membros" ADD COLUMN "nivel" text DEFAULT 'membro' NOT NULL`;

const depois = await sql`
  SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'fundo_membros' AND column_name = 'nivel'`;
console.log("Coluna criada em antecipaqui_prod:", depois[0]);
