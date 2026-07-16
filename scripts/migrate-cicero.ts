/**
 * Migration: tabelas do Cícero (atendente IA) — cicero_conversas e
 * cicero_mensagens. 100% aditiva e idempotente (IF NOT EXISTS).
 *
 * Pra rodar (demo = neondb, que é o DATABASE_URL do .env.local):
 *   npx tsx --env-file=.env.local scripts/migrate-cicero.ts
 *
 * Pra rodar em produção (mesmo endpoint Neon, database antecipaqui_prod):
 *   passe DATABASE_URL apontando pro database antecipaqui_prod.
 */

import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  const dbName = (process.env.DATABASE_URL ?? "").match(/\/([a-z_]+)\?/)?.[1] ?? "?";
  console.log(`🔧 Migration: tabelas do Cícero (database: ${dbName})`);

  console.log("  → cicero_conversas...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cicero_conversas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_role text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cicero_conversas_user_idx
      ON cicero_conversas (user_id, created_at)
  `);

  console.log("  → cicero_mensagens...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cicero_mensagens (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      conversa_id uuid NOT NULL REFERENCES cicero_conversas(id) ON DELETE CASCADE,
      autor text NOT NULL,
      texto text NOT NULL,
      tools_usadas jsonb,
      modelo text,
      input_tokens integer,
      output_tokens integer,
      erro text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cicero_mensagens_conversa_idx
      ON cicero_mensagens (conversa_id, created_at)
  `);

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Migration falhou:", e);
    process.exit(1);
  });
