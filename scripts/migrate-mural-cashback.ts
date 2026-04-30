/**
 * Migration: Mural de recados + Cashback por operação + categoria nos tickets.
 *
 * - mural_messages: recados do admin pra construtoras/imobiliárias.
 * - operacoes.cashback_percent / cashback_valor: cashback decidido pelo
 *   admin na aprovação final (visível só pra construtora).
 * - tickets.categoria + tickets.extra: tickets de saque de cashback
 *   reusam o fluxo existente.
 *
 * Idempotente.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ CREATE TYPE mural_audience if missing");
  await sql.query(`
    DO $$ BEGIN
      CREATE TYPE mural_audience AS ENUM ('imobiliaria', 'construtora', 'both');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  console.log("→ CREATE TABLE mural_messages if missing");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS mural_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      titulo text,
      body text NOT NULL,
      audience mural_audience NOT NULL,
      active boolean NOT NULL DEFAULT true,
      expires_at timestamptz,
      created_by text REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await sql.query(
    `CREATE INDEX IF NOT EXISTS mural_audience_idx ON mural_messages(audience, active)`,
  );

  console.log("→ ALTER operacoes ADD cashback columns");
  await sql.query(
    `ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS cashback_percent numeric(5,4)`,
  );
  await sql.query(
    `ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS cashback_valor numeric(14,2)`,
  );
  await sql.query(
    `ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS cashback_sacado_em timestamptz`,
  );
  await sql.query(
    `ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS cashback_sacado_ticket_id uuid REFERENCES tickets(id) ON DELETE SET NULL`,
  );

  console.log("→ ALTER tickets ADD categoria + extra");
  await sql.query(
    `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'geral'`,
  );
  await sql.query(
    `ALTER TABLE tickets ADD COLUMN IF NOT EXISTS extra jsonb`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS tickets_categoria_idx ON tickets(categoria)`,
  );

  console.log("✓ migration ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
