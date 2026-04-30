/**
 * Migration: adiciona infra do sistema de bloqueio + tickets.
 *
 *  - construtoras.is_active  (default true) — espelha a coluna em users
 *  - tabela tickets + ticket_messages (sistema de suporte)
 *
 * Idempotente — usa IF NOT EXISTS / DO $$.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ ALTER construtoras ADD is_active boolean default true");
  await sql.query(
    `ALTER TABLE construtoras ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true`,
  );

  console.log("→ CREATE TYPE ticket_status if missing");
  await sql.query(`
    DO $$ BEGIN
      CREATE TYPE ticket_status AS ENUM ('aberto', 'aguardando_resposta', 'finalizado');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  console.log("→ CREATE TABLE tickets if missing");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assunto text NOT NULL,
      status ticket_status NOT NULL DEFAULT 'aberto',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      finalizado_em timestamptz
    )
  `);

  console.log("→ CREATE TABLE ticket_messages if missing");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      from_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_role text NOT NULL,
      body text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await sql.query(
    `CREATE INDEX IF NOT EXISTS tickets_user_idx ON tickets(user_id)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS ticket_messages_ticket_idx ON ticket_messages(ticket_id)`,
  );

  console.log("✓ migration ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
