/**
 * Migration: cria enum comissao_comercial_status + tabela comissoes_comercial,
 * com backfill pras ops aprovadas que têm comercialId definido.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-comissoes-comercial.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: comissoes_comercial");

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE comissao_comercial_status AS ENUM (
        'pendente', 'paga', 'cancelada'
      );
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);
  console.log("  ✓ enum comissao_comercial_status");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS comissoes_comercial (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      operacao_id uuid NOT NULL REFERENCES operacoes(id) ON DELETE CASCADE,
      comercial_id uuid NOT NULL REFERENCES comerciais(id) ON DELETE RESTRICT,
      valor_devido numeric(15,2) NOT NULL,
      valor_pago numeric(15,2) NOT NULL DEFAULT 0,
      status comissao_comercial_status NOT NULL DEFAULT 'pendente',
      gerada_em timestamptz NOT NULL DEFAULT now(),
      paga_em timestamptz,
      paga_por_user_id text REFERENCES users(id) ON DELETE SET NULL,
      observacao text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS comissoes_comercial_unica
      ON comissoes_comercial (operacao_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS comissoes_comercial_comercial_idx
      ON comissoes_comercial (comercial_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS comissoes_comercial_status_idx
      ON comissoes_comercial (status)
  `);
  console.log("  ✓ tabela + índices");

  // Backfill: cria 1 row por op aprovada com comercial_id, status realizada
  // ou enviada_para_pagamento. valor = (spread / 2) × 0.82 × 0.10
  console.log("  → backfill comissoes (ops realizadas / em pagamento)...");
  const result = await db.execute(sql`
    INSERT INTO comissoes_comercial (
      operacao_id, comercial_id, valor_devido, status, gerada_em
    )
    SELECT
      o.id,
      o.comercial_id,
      ROUND(
        GREATEST(
          0,
          o.desagio * (
            1 - LEAST(
              1,
              COALESCE(o.taxa_fundo_snapshot, f.taxa_mensal_base, 0)
                / NULLIF(o.taxa_mensal, 0)
            )
          )
        ) / 2 * 0.82 * 0.10,
        2
      ) AS valor_devido,
      'pendente'::comissao_comercial_status,
      COALESCE(o.aprovado_em, o.created_at)
    FROM operacoes o
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE o.comercial_id IS NOT NULL
      AND o.status IN ('enviada_para_pagamento', 'realizada')
    ON CONFLICT (operacao_id) DO NOTHING
  `);
  console.log(`     criadas: ${(result as { rowCount?: number }).rowCount ?? "?"}`);

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
