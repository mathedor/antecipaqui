/**
 * Truncate all tables. Preserves schema, drops all data.
 * Uso: tsx scripts/reset-db.ts
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL not set");
}

const sql = neon(process.env.DATABASE_URL);

const tables = [
  "operacao_events",
  "contratos",
  "parcelas_comissao",
  "documentos",
  "operacoes",
  "construtoras",
  "imobiliarias",
  "users",
];

async function main() {
  console.log("⚠️  Truncating all tables...");
  const tableList = tables.map((t) => `"${t}"`).join(", ");
  await sql.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
  console.log(`  · ${tables.length} tabelas zeradas ✓`);
  console.log("✅ Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
