/**
 * Migration: grupo econômico de imobiliárias (matriz + filiais).
 *
 * Adiciona em `imobiliarias`:
 *   - matriz_id                → auto-referência; NULL = matriz/independente
 *   - possui_filiais           → flag marcada pela matriz no cadastro
 *   - apelido                  → nome interno da unidade ("Filial Curitiba")
 *   - opera_em_nome_da_matriz  → contrato sai no CNPJ da matriz
 *   - is_active                → unidade desativada some do seletor
 *
 * Idempotente. Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/migrate-imobiliaria-filiais.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: imobiliarias · matriz + filiais");

  await db.execute(sql`
    ALTER TABLE imobiliarias
      ADD COLUMN IF NOT EXISTS matriz_id uuid,
      ADD COLUMN IF NOT EXISTS possui_filiais boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS apelido text,
      ADD COLUMN IF NOT EXISTS opera_em_nome_da_matriz boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true
  `);

  // FK auto-referente. ON DELETE CASCADE: apagar a matriz apaga as filiais
  // (o cadastro é um só — não faz sentido filial órfã).
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'imobiliarias_matriz_id_fk'
      ) THEN
        ALTER TABLE imobiliarias
          ADD CONSTRAINT imobiliarias_matriz_id_fk
          FOREIGN KEY (matriz_id) REFERENCES imobiliarias(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS imobiliarias_matriz_idx
      ON imobiliarias (matriz_id)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS imobiliarias_owner_idx
      ON imobiliarias (owner_user_id)
  `);

  // Guard-rail: filial não pode ter filial (hierarquia de 1 nível só).
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION imobiliarias_valida_hierarquia()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.matriz_id IS NOT NULL THEN
        IF NEW.matriz_id = NEW.id THEN
          RAISE EXCEPTION 'Uma imobiliária não pode ser matriz dela mesma';
        END IF;
        IF EXISTS (
          SELECT 1 FROM imobiliarias
          WHERE id = NEW.matriz_id AND matriz_id IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'Filial não pode ter filial (hierarquia de 1 nível)';
        END IF;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await db.execute(sql`
    DROP TRIGGER IF EXISTS imobiliarias_hierarquia_trg ON imobiliarias
  `);
  await db.execute(sql`
    CREATE TRIGGER imobiliarias_hierarquia_trg
      BEFORE INSERT OR UPDATE ON imobiliarias
      FOR EACH ROW EXECUTE FUNCTION imobiliarias_valida_hierarquia();
  `);

  // Backfill: toda imobiliária existente vira matriz/independente com apelido.
  const r = await db.execute(sql`
    UPDATE imobiliarias
      SET apelido = 'Matriz'
      WHERE apelido IS NULL AND matriz_id IS NULL
  `);
  console.log(`   ↳ apelido 'Matriz' aplicado em ${r.rowCount ?? 0} row(s)`);

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
