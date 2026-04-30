/**
 * Migration: pending_operacoes — operações pré-cadastradas pela construtora
 * em lote, aguardando o corretor/imobiliária se logar e completar (subir
 * docs e simular taxa).
 *
 * Idempotente.
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log("→ CREATE TYPE pending_operacao_status if missing");
  await sql.query(`
    DO $$ BEGIN
      CREATE TYPE pending_operacao_status AS ENUM (
        'aguardando_cedente',
        'reivindicada',
        'descartada'
      );
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `);

  console.log("→ CREATE TABLE pending_operacoes if missing");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS pending_operacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      construtora_id uuid NOT NULL REFERENCES construtoras(id) ON DELETE CASCADE,
      imobiliaria_id uuid REFERENCES imobiliarias(id) ON DELETE SET NULL,
      corretor_email text NOT NULL,
      corretor_nome text,
      corretor_cnpj text,
      corretor_telefone text,
      valor_venda numeric(15,2) NOT NULL,
      valor_comissao numeric(15,2) NOT NULL,
      numero_parcelas integer NOT NULL,
      data_primeira_parcela date NOT NULL,
      data_venda date,
      observacoes text,
      status pending_operacao_status NOT NULL DEFAULT 'aguardando_cedente',
      reivindicado_por_user_id text REFERENCES users(id) ON DELETE SET NULL,
      reivindicado_em timestamptz,
      operacao_id uuid REFERENCES operacoes(id) ON DELETE SET NULL,
      invite_token text NOT NULL UNIQUE,
      created_by_user_id text REFERENCES users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  await sql.query(
    `CREATE INDEX IF NOT EXISTS pending_construtora_idx ON pending_operacoes(construtora_id)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS pending_email_status_idx ON pending_operacoes(corretor_email, status)`,
  );

  console.log("✓ migration ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
