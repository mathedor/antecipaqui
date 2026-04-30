/**
 * Migration: Novo fluxo de status + tabela notificacoes + motivo_pendencia.
 *
 * Mudanças:
 *  - Renomeia enum operacao_status: em_analise→aguardando_aprovacao,
 *    aprovada→pre_aprovada, em_assinatura→enviada_para_assinatura,
 *    ativa→enviada_para_pagamento, liquidada→realizada
 *  - Adiciona enum values: documentos_incompletos, analise_final
 *  - Adiciona coluna operacoes.motivo_pendencia
 *  - Cria tabela notificacoes
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
const sql = neon(process.env.DATABASE_URL);

const renames: { from: string; to: string }[] = [
  { from: "em_analise", to: "aguardando_aprovacao" },
  { from: "aprovada", to: "pre_aprovada" },
  { from: "em_assinatura", to: "enviada_para_assinatura" },
  { from: "ativa", to: "enviada_para_pagamento" },
  { from: "liquidada", to: "realizada" },
];

const additions = ["documentos_incompletos", "analise_final"];

async function valueExists(name: string) {
  const r = await sql.query(
    `SELECT 1 FROM pg_enum e
     JOIN pg_type t ON t.oid = e.enumtypid
     WHERE t.typname = 'operacao_status' AND e.enumlabel = $1
     LIMIT 1`,
    [name],
  );
  return Array.isArray(r) && r.length > 0;
}

async function main() {
  console.log("⚙️  Iniciando migração de status...");

  // 1. Renomear values existentes (só se ainda existem)
  for (const r of renames) {
    if (await valueExists(r.from)) {
      console.log(`  ↻ renomeando '${r.from}' → '${r.to}'`);
      await sql.query(
        `ALTER TYPE operacao_status RENAME VALUE '${r.from}' TO '${r.to}'`,
      );
    } else {
      console.log(`  · '${r.from}' já não existe, ok`);
    }
  }

  // 2. Adicionar novos values (idempotente)
  for (const v of additions) {
    if (await valueExists(v)) {
      console.log(`  · '${v}' já existe, ok`);
    } else {
      console.log(`  + adicionando '${v}'`);
      await sql.query(
        `ALTER TYPE operacao_status ADD VALUE IF NOT EXISTS '${v}'`,
      );
    }
  }

  // 3. Adicionar coluna motivo_pendencia (idempotente)
  console.log("  + adicionando coluna motivo_pendencia (se não existe)");
  await sql.query(
    `ALTER TABLE operacoes ADD COLUMN IF NOT EXISTS motivo_pendencia text`,
  );

  // 4. Criar tabela notificacoes (idempotente)
  console.log("  + criando tabela notificacoes (se não existe)");
  await sql.query(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type text NOT NULL,
      title text NOT NULL,
      body text,
      link text,
      operacao_id uuid REFERENCES operacoes(id) ON DELETE CASCADE,
      read boolean NOT NULL DEFAULT false,
      email_sent boolean NOT NULL DEFAULT false,
      sms_sent boolean NOT NULL DEFAULT false,
      created_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);
  await sql.query(
    `CREATE INDEX IF NOT EXISTS notificacoes_user_idx ON notificacoes(user_id)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS notificacoes_unread_idx ON notificacoes(user_id, read)`,
  );
  await sql.query(
    `CREATE INDEX IF NOT EXISTS notificacoes_created_idx ON notificacoes(created_at)`,
  );

  console.log("✅ Migration concluída.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
