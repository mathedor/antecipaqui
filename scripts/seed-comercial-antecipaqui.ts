/**
 * Seed do comercial "Antecipaqui" — usado como default quando uma operação,
 * construtora ou imobiliária não tem comercial específico atribuído.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) npx tsx scripts/seed-comercial-antecipaqui.ts
 */

import "dotenv/config";
import { eq, sql, isNull } from "drizzle-orm";
import { db } from "../src/db";
import {
  comerciais,
  construtoras,
  imobiliarias,
  operacoes,
} from "../src/db/schema";

const ANTECIPAQUI = {
  tipoPessoa: "juridica" as const,
  nomeCompleto: "Antecipaqui (Comercial Interno)",
  apelido: "Antecipaqui",
  // CNPJ do CESSIONÁRIA do contract-pdf.tsx
  documento: "32708702000110",
  email: "comercial@antecipaqui.digital",
  telefone: "11972049004",
  cep: "05676120",
  endereco: "Avenida Magalhães de Castro, 4.800, Conjunto 105 — Jardim Panorama",
  cidade: "São Paulo",
  uf: "SP",
};

async function main() {
  console.log("🌱 Cadastrando comercial Antecipaqui (default)...");

  const existing = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.documento, ANTECIPAQUI.documento))
    .limit(1);

  let comercialId: string;
  if (existing[0]) {
    comercialId = existing[0].id;
    console.log(`✓ Já existe (id: ${comercialId}). Atualizando dados...`);
    await db
      .update(comerciais)
      .set({ ...ANTECIPAQUI, updatedAt: new Date() })
      .where(eq(comerciais.id, comercialId));
  } else {
    const [created] = await db
      .insert(comerciais)
      .values(ANTECIPAQUI)
      .returning();
    comercialId = created.id;
    console.log(`✓ Criado. ID: ${comercialId}`);
  }

  // Atribui esse comercial pra TODAS as ops/construtoras/imobs sem comercial
  const opsRes = await db
    .update(operacoes)
    .set({ comercialId })
    .where(isNull(operacoes.comercialId))
    .returning({ id: operacoes.id });
  const cRes = await db.execute(sql`
    UPDATE construtoras SET comercial_id = ${comercialId}::uuid
    WHERE comercial_id IS NULL
    RETURNING id
  `);
  const iRes = await db.execute(sql`
    UPDATE imobiliarias SET comercial_id = ${comercialId}::uuid
    WHERE comercial_id IS NULL
    RETURNING id
  `);

  const cCount =
    (cRes as unknown as { rows?: unknown[] }).rows?.length ?? 0;
  const iCount =
    (iRes as unknown as { rows?: unknown[] }).rows?.length ?? 0;

  console.log("\n✅ Antecipaqui setado como comercial em:");
  console.log(`   • ${opsRes.length} operações`);
  console.log(`   • ${cCount} construtoras`);
  console.log(`   • ${iCount} imobiliárias`);
  console.log(`\n  ID do comercial: ${comercialId}`);
  console.log(
    `  Salve esse ID no env como NEXT_PUBLIC_COMERCIAL_DEFAULT_ID se quiser referenciar no app.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  });
