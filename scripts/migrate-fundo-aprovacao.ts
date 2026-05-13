/**
 * Migration:
 *   - colunas em operacoes pra decisão do fundo
 *   - tabela fundo_regras_auto_aprovacao
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-fundo-aprovacao.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: fundo_aprovacao + regras");

  // Colunas na operacoes
  await db.execute(sql`
    ALTER TABLE operacoes
      ADD COLUMN IF NOT EXISTS fundo_aprovacao text,
      ADD COLUMN IF NOT EXISTS fundo_aprovado_em timestamptz,
      ADD COLUMN IF NOT EXISTS fundo_aprovado_por_user_id text REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS fundo_recusa_motivo text,
      ADD COLUMN IF NOT EXISTS fundo_regra_auto_id uuid
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS operacoes_fundo_aprovacao_idx
      ON operacoes (fundo_aprovacao)
  `);
  console.log("  ✓ colunas operacoes.fundo_*");

  // Backfill: ops com fundo já definido e aprovado_em preenchido →
  // marca como 'aprovada' (admin já fechou, presume aval do fundo)
  const r1 = await db.execute(sql`
    UPDATE operacoes
    SET fundo_aprovacao = 'aprovada',
        fundo_aprovado_em = aprovado_em
    WHERE fundo_id IS NOT NULL
      AND aprovado_em IS NOT NULL
      AND fundo_aprovacao IS NULL
  `);
  console.log(`     backfill aprovadas: ${(r1 as { rowCount?: number }).rowCount ?? "?"}`);

  // Tabela regras
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fundo_regras_auto_aprovacao (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      fundo_id uuid NOT NULL REFERENCES fundos(id) ON DELETE CASCADE,
      nome text NOT NULL,
      ativa boolean NOT NULL DEFAULT true,
      prioridade int NOT NULL DEFAULT 100,
      taxa_minima numeric(6,4),
      prazo_maximo_meses int,
      valor_maximo_comissao numeric(15,2),
      construtoras_ids jsonb,
      contador_acionamentos int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS fundo_regras_fundo_idx
      ON fundo_regras_auto_aprovacao (fundo_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS fundo_regras_ativa_idx
      ON fundo_regras_auto_aprovacao (ativa)
  `);
  console.log("  ✓ tabela fundo_regras_auto_aprovacao");

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
