/**
 * Migration: tabela ia_usos — medidor genérico de consumo de IA fora do
 * Cícero (o Cícero já grava tokens em cicero_mensagens). 100% aditiva e
 * idempotente (IF NOT EXISTS).
 *
 * Pra rodar (demo = neondb, que é o DATABASE_URL do .env.local):
 *   npx tsx --env-file=.env.local scripts/migrate-ia-usos.ts
 *
 * Pra rodar em produção (mesmo endpoint Neon, database antecipaqui_prod):
 *   passe DATABASE_URL apontando pro database antecipaqui_prod.
 */

import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  const dbName = (process.env.DATABASE_URL ?? "").match(/\/([a-z_]+)\?/)?.[1] ?? "?";
  console.log(`🔧 Migration: tabela ia_usos (database: ${dbName})`);

  console.log("  → ia_usos...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ia_usos (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      origem text NOT NULL,
      modelo text,
      tokens_in bigint NOT NULL DEFAULT 0,
      tokens_out bigint NOT NULL DEFAULT 0,
      tokens_cache_leitura bigint NOT NULL DEFAULT 0,
      tokens_cache_criacao bigint NOT NULL DEFAULT 0,
      lote boolean NOT NULL DEFAULT false,
      criado_em timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS ia_usos_criado_idx ON ia_usos (criado_em)
  `);

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Migration falhou:", e);
    process.exit(1);
  });
