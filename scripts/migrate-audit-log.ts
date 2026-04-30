/**
 * Migration: tabela audit_logs pra log de ações de TODOS os usuários
 * (login, leitura de cadastros, mudanças de status, etc.).
 *
 * Idempotente.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ CREATE TABLE audit_logs if missing");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text REFERENCES users(id) ON DELETE SET NULL,
      user_role text,
      user_email text,
      action text NOT NULL,
      target_type text,
      target_id text,
      target_label text,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await sql.query(
    `CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id, created_at DESC)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs(target_type, target_id, created_at DESC)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action, created_at DESC)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC)`,
  );

  console.log("✓ migration ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
