/**
 * Migration: adiciona colunas de validação por IA em documentos.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-validacao-documento.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: documentos.validacao_*");
  await db.execute(sql`
    ALTER TABLE documentos
      ADD COLUMN IF NOT EXISTS validacao_status text,
      ADD COLUMN IF NOT EXISTS validacao_confianca numeric(3,2),
      ADD COLUMN IF NOT EXISTS validacao_motivo text
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS documentos_validacao_idx
      ON documentos (validacao_status)
  `);
  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
