/**
 * Migration: tabela email_falhas.
 *
 * Motivo: `sendEmail()` devolvia {ok:false} e seguia. O domínio
 * antecipaqui.digital ficou sem verificação no Resend e NENHUM e-mail saía —
 * ninguém percebeu porque o erro só ia pro console de um server action.
 * Agora toda falha vira linha aqui e aparece em /admin/entregabilidade.
 *
 * Idempotente. Pra rodar:
 *   DATABASE_URL=... npx tsx scripts/migrate-email-falhas.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  console.log("🔧 Migration: email_falhas");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS email_falhas (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      destinatario text NOT NULL,
      assunto text NOT NULL,
      erro text NOT NULL,
      contexto text,
      resolvido_em timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS email_falhas_created_idx
      ON email_falhas (created_at DESC)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS email_falhas_abertas_idx
      ON email_falhas (resolvido_em, created_at DESC)
  `);

  console.log("✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
