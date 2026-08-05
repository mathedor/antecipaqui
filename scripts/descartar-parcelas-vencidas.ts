/**
 * Descarta das operações NÃO OPERADAS as parcelas que já venceram, e
 * recalcula a operação pra refletir só o que é antecipável.
 *
 * Regra do dono: o contrato pode ter parcela antiga, sem problema — mas a
 * gente só registra pra operar o que está a vencer. Parcela vencida não é
 * antecipável: não há o que comprar.
 *
 * O que faz por operação afetada:
 *  - apaga as parcelas com vencimento < hoje
 *  - recalcula numero_parcelas, valor_comissao (= soma do que sobrou),
 *    valor_presente e deságio com a taxa da própria operação
 *  - guarda no motivo_pendencia o que foi descartado, pra não perder o
 *    histórico do que o contrato dizia
 *
 * NUNCA toca em operação já operada (enviada_para_pagamento/realizada):
 * ali a parcela vencida é atraso real e tem que continuar existindo.
 *
 * Idempotente. Simulação por padrão; grava só com --aplicar.
 *   DATABASE_URL=... npx tsx scripts/descartar-parcelas-vencidas.ts [--aplicar]
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

const APLICAR = process.argv.includes("--aplicar");

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Linha = {
  operacao_id: string;
  numero: string;
  status: string;
  taxa_mensal: number;
  parcela_id: string;
  parcela_numero: number;
  valor: number;
  vencimento: string;
  vencida: boolean;
};

function linhas<T>(r: unknown): T[] {
  return (
    Array.isArray(r) ? r : ((r as { rows: T[] }).rows ?? [])
  ) as T[];
}

/** Mesma fórmula do cadastro: desconto composto até o vencimento. */
function valorPresente(
  parcelas: { valor: number; vencimento: string }[],
  taxaMensal: number,
) {
  const hoje = new Date();
  return parcelas.reduce((acc, p) => {
    const alvo = new Date(p.vencimento + "T00:00:00");
    const meses = Math.max(
      (alvo.getFullYear() - hoje.getFullYear()) * 12 +
        (alvo.getMonth() - hoje.getMonth()) +
        (alvo.getDate() - hoje.getDate()) / 30,
      0,
    );
    return acc + p.valor / Math.pow(1 + taxaMensal, meses);
  }, 0);
}

async function main() {
  const res = await db.execute(sql`
    SELECT o.id::text AS operacao_id, o.numero, o.status,
           o.taxa_mensal::float AS taxa_mensal,
           p.id::text AS parcela_id, p.numero AS parcela_numero,
           p.valor::float AS valor, p.vencimento::text AS vencimento,
           (p.vencimento < CURRENT_DATE) AS vencida
    FROM operacoes o
    INNER JOIN parcelas_comissao p ON p.operacao_id = o.id
    WHERE o.status NOT IN ('enviada_para_pagamento', 'realizada')
      AND EXISTS (
        SELECT 1 FROM parcelas_comissao pp
        WHERE pp.operacao_id = o.id AND pp.vencimento < CURRENT_DATE
      )
    ORDER BY o.numero, p.numero
  `);
  const todas = linhas<Linha>(res);

  if (todas.length === 0) {
    console.log("✅ Nenhuma operação não operada tem parcela vencida.");
    return;
  }

  const porOp = new Map<string, Linha[]>();
  for (const l of todas) {
    porOp.set(l.operacao_id, [...(porOp.get(l.operacao_id) ?? []), l]);
  }

  console.log(`${porOp.size} operação(ões) com parcela vencida:\n`);

  for (const [opId, ls] of porOp) {
    const op = ls[0];
    const vencidas = ls.filter((l) => l.vencida);
    const ficam = ls.filter((l) => !l.vencida);
    const somaDescartada = vencidas.reduce((s, l) => s + l.valor, 0);
    const somaNova = ficam.reduce((s, l) => s + l.valor, 0);

    console.log(`${op.numero} (${op.status})`);
    for (const v of vencidas)
      console.log(`   descarta #${v.parcela_numero} ${brl(v.valor)} venc ${v.vencimento}`);
    for (const f of ficam)
      console.log(`   mantém   #${f.parcela_numero} ${brl(f.valor)} venc ${f.vencimento}`);
    console.log(
      `   comissão a operar: ${brl(somaNova)} (descartado ${brl(somaDescartada)})`,
    );
    if (ficam.length === 0)
      console.log("   ⚠ ficaria SEM parcela — nada antecipável nesta operação");

    if (!APLICAR) {
      console.log("");
      continue;
    }

    // Apaga as vencidas
    await db.execute(sql`
      DELETE FROM parcelas_comissao
       WHERE operacao_id = ${opId}::uuid AND vencimento < CURRENT_DATE
    `);

    // Renumera o que sobrou (1..n) pra não deixar buraco na sequência
    for (let i = 0; i < ficam.length; i++) {
      await db.execute(sql`
        UPDATE parcelas_comissao SET numero = ${i + 1}
         WHERE id = ${ficam[i].parcela_id}::uuid
      `);
    }

    const vp = valorPresente(
      ficam.map((f) => ({ valor: f.valor, vencimento: f.vencimento })),
      op.taxa_mensal,
    );
    const nota =
      `\n\n[ajuste ${new Date().toLocaleDateString("pt-BR")}] Parcelas já vencidas foram ` +
      `descartadas do cronograma porque não são antecipáveis: ` +
      vencidas
        .map((v) => `${brl(v.valor)} venc ${v.vencimento.split("-").reverse().join("/")}`)
        .join("; ") +
      `. O contrato segue valendo integralmente; aqui fica só o que está a vencer.`;

    await db.execute(sql`
      UPDATE operacoes
         SET numero_parcelas = ${ficam.length},
             valor_comissao = ${somaNova.toFixed(2)},
             valor_presente = ${vp.toFixed(2)},
             desagio = ${(somaNova - vp).toFixed(2)},
             motivo_pendencia = COALESCE(motivo_pendencia, '') || ${nota},
             updated_at = now()
       WHERE id = ${opId}::uuid
    `);
    console.log(`   ✓ atualizada · VP ${brl(vp)}\n`);
  }

  if (!APLICAR) console.log("(simulação — rode com --aplicar pra gravar)");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
