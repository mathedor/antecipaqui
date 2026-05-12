/**
 * Migration: adiciona operacoes.taxa_fundo_snapshot (numeric 6,4 NULL).
 *
 * Backfill estratégia: pra TODAS as operações já aprovadas (aprovado_em
 * IS NOT NULL), grava o snapshot como a taxa_mensal_base atual do fundo.
 * Idempotente — só preenche onde está NULL.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-taxa-fundo-snapshot.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: operacoes.taxa_fundo_snapshot");

  console.log("  → Adicionando coluna...");
  await db.execute(sql`
    ALTER TABLE operacoes
      ADD COLUMN IF NOT EXISTS taxa_fundo_snapshot numeric(6,4)
  `);

  console.log("  → Backfill (snapshot = taxa atual do fundo)...");
  const result = await db.execute(sql`
    UPDATE operacoes o
    SET taxa_fundo_snapshot = f.taxa_mensal_base
    FROM fundos f
    WHERE o.fundo_id = f.id
      AND o.aprovado_em IS NOT NULL
      AND o.taxa_fundo_snapshot IS NULL
  `);
  console.log(`     atualizadas: ${(result as { rowCount?: number }).rowCount ?? "?"}`);

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
