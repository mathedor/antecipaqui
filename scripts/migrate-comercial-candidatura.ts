/**
 * Migration: auto-cadastro de comercial (/quero-ser-comercial).
 *
 *   - enums comercial_origem e comercial_aprovacao
 *   - colunas em comerciais: origem, aprovacao, experiencia,
 *     recusa_motivo, decidido_em
 *   - índice por aprovacao (fila de candidaturas no admin)
 *
 * Backfill: todo comercial que já existe foi cadastrado pelo admin,
 * então nasce origem='admin' / aprovacao='aprovada'.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-comercial-candidatura.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: comercial_candidatura");

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE comercial_origem AS ENUM ('admin', 'candidatura');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `);
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE comercial_aprovacao AS ENUM ('pendente', 'aprovada', 'recusada');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `);
  console.log("  ✓ enums");

  await db.execute(sql`
    ALTER TABLE comerciais
      ADD COLUMN IF NOT EXISTS origem comercial_origem NOT NULL DEFAULT 'admin',
      ADD COLUMN IF NOT EXISTS aprovacao comercial_aprovacao NOT NULL DEFAULT 'aprovada',
      ADD COLUMN IF NOT EXISTS experiencia text,
      ADD COLUMN IF NOT EXISTS recusa_motivo text,
      ADD COLUMN IF NOT EXISTS decidido_em timestamptz
  `);
  console.log("  ✓ colunas comerciais.origem / aprovacao / experiencia / recusa_motivo / decidido_em");

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS comerciais_aprovacao_idx
      ON comerciais (aprovacao)
  `);
  console.log("  ✓ índice comerciais_aprovacao_idx");

  const res = (await db.execute(sql`
    SELECT count(*)::int AS total FROM comerciais WHERE aprovacao = 'aprovada'
  `)) as unknown as { rows?: { total: number }[] } & { total: number }[];
  const total = Array.isArray(res) ? res[0]?.total : res.rows?.[0]?.total;
  console.log(`     comerciais já aprovados (backfill do default): ${total ?? "?"}`);

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
