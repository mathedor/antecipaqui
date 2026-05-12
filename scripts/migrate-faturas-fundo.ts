/**
 * Migration: cria enum fatura_fundo_status + tabela faturas_fundo.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-faturas-fundo.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: faturas_fundo");

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE fatura_fundo_status AS ENUM (
        'pendente', 'parcial', 'paga', 'vencida', 'cancelada'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("  ✓ enum fatura_fundo_status");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS faturas_fundo (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      fundo_id uuid NOT NULL REFERENCES fundos(id) ON DELETE RESTRICT,
      ref_mes text NOT NULL,
      valor_devido numeric(15,2) NOT NULL,
      valor_pago numeric(15,2) NOT NULL DEFAULT 0,
      status fatura_fundo_status NOT NULL DEFAULT 'pendente',
      emitida_em timestamptz NOT NULL DEFAULT now(),
      vencimento date,
      paga_em timestamptz,
      observacao text,
      gerada_por_user_id text REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS faturas_fundo_unico
      ON faturas_fundo (fundo_id, ref_mes)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS faturas_fundo_status_idx
      ON faturas_fundo (status)
  `);
  console.log("  ✓ tabela faturas_fundo + índices");

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
