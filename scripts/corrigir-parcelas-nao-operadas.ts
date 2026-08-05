/**
 * Corrige parcelas marcadas como "vencida" em operações que NUNCA foram
 * operadas.
 *
 * Regra do negócio: só existe atraso pra Antecipaqui quando o dinheiro já
 * saiu — ou seja, operação em 'enviada_para_pagamento' ou 'realizada'. O
 * cron de cobrança já respeita isso; o que quebrou foi o cadastro em lote
 * das operações do grupo Imóveis de Primeira, que marcou vencida por data.
 *
 * Uma parcela de contrato que venceu antes de a gente operar não é atraso
 * nosso: nunca houve crédito. Volta pra 'a_vencer'.
 *
 * Idempotente e conservador: só toca em parcela 'vencida' de operação não
 * operada, e nunca mexe em parcela paga.
 *
 * Pra rodar:
 *   DATABASE_URL=... npx tsx scripts/corrigir-parcelas-nao-operadas.ts
 *   (use --aplicar pra gravar; sem a flag só mostra o que faria)
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const alvoRes = await db.execute(sql`
    SELECT p.id::text AS id, p.numero, p.valor::float AS valor,
           p.vencimento::text AS vencimento,
           o.numero AS op_numero, o.status AS op_status
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE p.status = 'vencida'
      AND o.status NOT IN ('enviada_para_pagamento', 'realizada')
    ORDER BY o.numero, p.numero
  `);
  type Row = {
    id: string; numero: number; valor: number;
    vencimento: string; op_numero: string; op_status: string;
  };
  const rows = (
    Array.isArray(alvoRes) ? alvoRes : ((alvoRes as unknown as { rows: Row[] }).rows ?? [])
  ) as Row[];

  if (rows.length === 0) {
    console.log("✅ Nada a corrigir — nenhuma parcela vencida em operação não operada.");
    return;
  }

  console.log(
    `${rows.length} parcela(s) marcadas como vencida sem a operação ter sido operada:\n`,
  );
  let total = 0;
  for (const r of rows) {
    total += r.valor;
    const v = r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    console.log(`  ${r.op_numero} · parcela #${r.numero} · venc ${r.vencimento} · ${v} · op=${r.op_status}`);
  }
  console.log(
    `\n  total indevidamente contado como atraso: ${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
  );

  if (!APLICAR) {
    console.log("\n(simulação — rode com --aplicar pra gravar)");
    return;
  }

  const upd = await db.execute(sql`
    UPDATE parcelas_comissao p
       SET status = 'a_vencer'
      FROM operacoes o
     WHERE o.id = p.operacao_id
       AND p.status = 'vencida'
       AND o.status NOT IN ('enviada_para_pagamento', 'realizada')
    RETURNING p.id
  `);
  const n = (
    Array.isArray(upd) ? upd : ((upd as unknown as { rows: unknown[] }).rows ?? [])
  ).length;
  console.log(`\n✅ ${n} parcela(s) voltaram pra 'a_vencer'.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error("\n❌ Erro:", e); process.exit(1); });
