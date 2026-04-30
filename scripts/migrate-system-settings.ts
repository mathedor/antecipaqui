/**
 * Migration: tabela system_settings (configurações do admin).
 *
 * Key-value simples — guarda taxa mensal e outras configs futuras.
 * Auditoria embutida (updated_by + updated_at).
 *
 * Idempotente.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ CREATE TABLE system_settings if missing");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key text PRIMARY KEY,
      value text NOT NULL,
      updated_by text REFERENCES users(id) ON DELETE SET NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  // Seed inicial: taxa_mensal = 0.06 (6%) se ainda não existe
  console.log("→ Seed default taxa_mensal = 0.06 (se ausente)");
  await sql.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('taxa_mensal', '0.06')
    ON CONFLICT (key) DO NOTHING
  `);

  console.log("✓ migration ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
