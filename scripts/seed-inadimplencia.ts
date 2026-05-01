/**
 * Marca ~5% das parcelas existentes como inadimplentes
 * (status="vencida" + vencimento no passado).
 *
 * Espalha por meses pra ter dados em vários meses no chart de inadimplência.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) npx tsx scripts/seed-inadimplencia.ts
 */

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import { parcelasComissao, operacoes } from "../src/db/schema";

async function main() {
  console.log("🌱 Seedando inadimplência...");

  // 1. Pega todas as parcelas a_vencer de operações ativas/aprovadas
  const todas = await db
    .select({
      id: parcelasComissao.id,
      operacaoId: parcelasComissao.operacaoId,
      vencimento: parcelasComissao.vencimento,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(
      sql`parcelas_comissao.status = 'a_vencer' AND operacoes.status NOT IN ('rascunho', 'recusada', 'cancelada')`,
    );

  console.log(`   Parcelas elegíveis: ${todas.length}`);

  // 2. Sortear 5% pra serem marcadas como vencidas
  const target = Math.floor(todas.length * 0.05);
  if (target === 0) {
    console.log("⚠ Nenhuma parcela disponível pra marcar como inadimplente.");
    return;
  }

  const shuffled = [...todas].sort(() => Math.random() - 0.5);
  const escolhidas = shuffled.slice(0, target);

  // 3. Marcar como vencidas + jogar vencimento pro passado (espalhar por
  //    últimos 6 meses pra dar dados nos charts)
  let updates = 0;
  for (const p of escolhidas) {
    const diasAtraso = 7 + Math.floor(Math.random() * 180); // 7 a 187 dias
    const novaData = new Date();
    novaData.setDate(novaData.getDate() - diasAtraso);
    const vencimento = novaData.toISOString().slice(0, 10);

    await db
      .update(parcelasComissao)
      .set({
        status: "vencida",
        vencimento,
      })
      .where(eq(parcelasComissao.id, p.id));
    updates++;
  }

  console.log(
    `\n✅ ${updates} parcela(s) marcadas como vencidas (5% das ${todas.length} elegíveis).`,
  );
  console.log("   Distribuição: 7 a 187 dias de atraso, espalhadas pra alimentar os charts.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  });
