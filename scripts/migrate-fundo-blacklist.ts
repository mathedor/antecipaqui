/**
 * Migration: cria tabela fundo_blacklist (construtoras bloqueadas por fundo).
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-fundo-blacklist.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: fundo_blacklist");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fundo_blacklist (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      fundo_id uuid NOT NULL REFERENCES fundos(id) ON DELETE CASCADE,
      construtora_id uuid NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
      motivo text,
      blocked_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS fundo_blacklist_unico
      ON fundo_blacklist (fundo_id, construtora_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS fundo_blacklist_fundo_idx
      ON fundo_blacklist (fundo_id)
  `);
  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
