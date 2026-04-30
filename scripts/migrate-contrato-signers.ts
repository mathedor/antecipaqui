/**
 * Migration: adiciona coluna `signers` (jsonb) em `contratos` pra guardar
 * dados dos signatários ZapSign (cedente, construtora, antecipaqui).
 *
 * Idempotente — usa IF NOT EXISTS.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ ALTER TABLE contratos ADD COLUMN signers jsonb (if missing)");
  await sql.query(
    `ALTER TABLE contratos ADD COLUMN IF NOT EXISTS signers jsonb`,
  );

  console.log("✓ migration ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
