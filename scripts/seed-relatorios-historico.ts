/**
 * Seed pra povoar relatórios — reutiliza corretores/construtoras/fundos
 * existentes e só insere operações + parcelas.
 *
 * Bloco A — 100 operações REALIZADAS (corretor pago):
 *   - 30 do período "hoje → 60 dias atrás":
 *       - 10 com pelo menos 1 parcela inadimplente (vencida)
 *       - 20 com parcelas a vencer (algumas pagas, outras futuras)
 *   - 70 do período "60 → 730 dias atrás" (histórico, todas pagas)
 *
 * Bloco B — 50 operações REALIZADAS com TODAS parcelas a vencer:
 *   - Data de venda nos últimos 45 dias
 *   - Documentação OK (implícito no status realizada)
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
 *     npx tsx scripts/seed-relatorios-historico.ts
 */

import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  operacoes,
  parcelasComissao,
  users,
  construtoras,
  fundos,
  comerciais,
} from "../src/db/schema";
import { valorPresente } from "../src/lib/format";

const TAG_NUMERO = "OP-HIST"; // prefixo distintivo pras ops desse seed

type CtxRecurso = {
  corretorIds: string[];
  construtoraIds: string[];
  fundoIds: string[];
  fundoTaxas: Map<string, number>;
  comercialIds: string[];
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

/** Distribuição diversificada de comissão (R$ 5k–500k, com cauda longa). */
function gerarValorComissao(): number {
  const bucket = Math.random();
  if (bucket < 0.45) return Math.round(rand(5_000, 30_000));     // micro
  if (bucket < 0.8) return Math.round(rand(30_000, 100_000));    // médio
  if (bucket < 0.95) return Math.round(rand(100_000, 250_000));  // alto
  return Math.round(rand(250_000, 500_000));                     // jumbo
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

async function nextOpNumber(): Promise<number> {
  const result = await db.execute(
    sql`SELECT MAX(CAST(SUBSTRING(numero FROM 'OP-HIST-(\d+)') AS INTEGER)) AS max
        FROM operacoes WHERE numero LIKE 'OP-HIST-%'`,
  );
  const rows = (result as unknown as { rows: { max: number | null }[] }).rows;
  return (rows[0]?.max ?? 0) + 1;
}

async function carregarRecursos(): Promise<CtxRecurso> {
  const us = await db
    .select({
      id: users.id,
      role: users.role,
      onb: users.onboardingStatus,
    })
    .from(users);
  const corretorIds = us
    .filter(
      (u) =>
        (u.role === "corretor" || u.role === "imobiliaria") &&
        u.onb === "aprovado",
    )
    .map((u) => u.id);

  const cs = await db.select({ id: construtoras.id }).from(construtoras);
  const construtoraIds = cs.map((c) => c.id);

  const fs = await db
    .select({ id: fundos.id, taxa: fundos.taxaMensalBase })
    .from(fundos);
  const fundoIds = fs.map((f) => f.id);
  const fundoTaxas = new Map(fs.map((f) => [f.id, parseFloat(f.taxa)]));

  const cms = await db
    .select({ id: comerciais.id, active: comerciais.isActive })
    .from(comerciais);
  const comercialIds = cms.filter((c) => c.active).map((c) => c.id);

  if (corretorIds.length === 0)
    throw new Error("Nenhum corretor aprovado encontrado — rode seeds básicos antes.");
  if (construtoraIds.length === 0)
    throw new Error("Nenhuma construtora encontrada.");
  if (fundoIds.length === 0)
    throw new Error("Nenhum fundo cadastrado.");

  return { corretorIds, construtoraIds, fundoIds, fundoTaxas, comercialIds };
}

type Cenario =
  | "recente_inadimplente"  // ≥1 parcela vencida (status='vencida')
  | "recente_misto"         // algumas pagas, algumas a vencer
  | "historico_todas_pagas" // antigo, tudo pago
  | "futuro_todas_a_vencer"; // bloco B — todas a vencer

function inserirOperacao(
  ctx: CtxRecurso,
  numero: string,
  cenario: Cenario,
) {
  const corretorId = pick(ctx.corretorIds);
  const construtoraId = pick(ctx.construtoraIds);
  const fundoId = pick(ctx.fundoIds);
  const taxaFundo = ctx.fundoTaxas.get(fundoId) ?? 0.06;
  const comercialId = ctx.comercialIds.length
    ? pick(ctx.comercialIds)
    : null;

  const valorComissao = gerarValorComissao();
  const comissaoPct = rand(0.05, 0.08);
  const valorVenda = Math.round(valorComissao / comissaoPct);
  const numParcelas = randInt(1, 12);

  // Data de venda por cenário
  let diasAtras: number;
  switch (cenario) {
    case "recente_inadimplente":
      // 30–60 dias atrás → pelo menos 1 parcela já venceu
      diasAtras = randInt(30, 60);
      break;
    case "recente_misto":
      diasAtras = randInt(0, 60);
      break;
    case "historico_todas_pagas":
      // 60–730 dias atrás
      diasAtras = randInt(60, 730);
      break;
    case "futuro_todas_a_vencer":
      // 0–45 dias atrás
      diasAtras = randInt(0, 45);
      break;
  }
  const dataVendaDate = addDays(new Date(), -diasAtras);
  dataVendaDate.setHours(0, 0, 0, 0);
  const dataVenda = ymd(dataVendaDate);

  // Aprovado 1–3 dias após a venda
  const aprovadoEmDate = addDays(dataVendaDate, randInt(1, 3));

  // Parcelas: mensais a partir de 30 dias da venda
  const valorParcela = valorComissao / numParcelas;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parcelasArr = Array.from({ length: numParcelas }, (_, idx) => {
    const v = addDays(dataVendaDate, 30 * (idx + 1));
    const mesesAteVencimento = Math.max(
      (v.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30),
      0,
    );
    return {
      numero: idx + 1,
      valor: valorParcela,
      vencimentoDate: v,
      vencimento: ymd(v),
      mesesAteVencimento,
    };
  });

  const vp = valorPresente(
    parcelasArr.map((p) => ({
      valor: p.valor,
      mesesAteVencimento: p.mesesAteVencimento,
    })),
    taxaFundo,
  );
  const desagio = valorComissao - vp;

  // Liquidado quando a op tá histórica e todas as parcelas já pagaram
  const liquidadoEm =
    cenario === "historico_todas_pagas" ? new Date() : null;

  // Define status de cada parcela conforme o cenário
  const parcelasComStatus = parcelasArr.map((p, idx) => {
    const venceuJa = p.vencimentoDate < today;

    if (cenario === "historico_todas_pagas") {
      // Todas pagas — pagas até 5 dias após o vencimento
      const pagoEmDate = addDays(p.vencimentoDate, randInt(-2, 5));
      const pagoFinal = pagoEmDate > today ? today : pagoEmDate;
      return {
        ...p,
        status: "paga" as const,
        pagoEm: ymd(pagoFinal),
        pagoValor: p.valor,
      };
    }

    if (cenario === "futuro_todas_a_vencer") {
      // Bloco B — todas a vencer mesmo que tenham vencido (fingimos que ainda
      // estão em aberto)
      return {
        ...p,
        status: "a_vencer" as const,
        pagoEm: null as string | null,
        pagoValor: null as number | null,
      };
    }

    if (cenario === "recente_inadimplente") {
      // Garante pelo menos 1 vencida: as que já passaram são "vencida",
      // exceto a primeira que pode estar paga pra parecer real
      if (venceuJa) {
        if (idx === 0 && Math.random() < 0.4) {
          // 40% das primeiras parcelas foram pagas, o resto fica em atraso
          return {
            ...p,
            status: "paga" as const,
            pagoEm: ymd(addDays(p.vencimentoDate, randInt(0, 3))),
            pagoValor: p.valor,
          };
        }
        return {
          ...p,
          status: "vencida" as const,
          pagoEm: null as string | null,
          pagoValor: null as number | null,
        };
      }
      return {
        ...p,
        status: "a_vencer" as const,
        pagoEm: null as string | null,
        pagoValor: null as number | null,
      };
    }

    // recente_misto: parcelas vencidas são pagas (em dia), futuras a vencer
    if (venceuJa) {
      return {
        ...p,
        status: "paga" as const,
        pagoEm: ymd(addDays(p.vencimentoDate, randInt(0, 3))),
        pagoValor: p.valor,
      };
    }
    return {
      ...p,
      status: "a_vencer" as const,
      pagoEm: null as string | null,
      pagoValor: null as number | null,
    };
  });

  return {
    operacao: {
      numero,
      corretorUserId: corretorId,
      construtoraId,
      fundoId,
      comercialId,
      valorVenda: valorVenda.toFixed(2),
      valorComissao: valorComissao.toFixed(2),
      dataVenda,
      numeroParcelas: numParcelas,
      taxaMensal: taxaFundo.toFixed(4),
      valorPresente: vp.toFixed(2),
      desagio: desagio.toFixed(2),
      status: "realizada" as const,
      aprovadoEm: aprovadoEmDate,
      liquidadoEm,
    },
    parcelas: parcelasComStatus,
  };
}

async function main() {
  console.log("🌱 Seed de histórico pra relatórios — começando...\n");
  const ctx = await carregarRecursos();
  console.log(
    `  Recursos: ${ctx.corretorIds.length} corretores · ${ctx.construtoraIds.length} construtoras · ${ctx.fundoIds.length} fundos · ${ctx.comercialIds.length} comerciais\n`,
  );

  const startNum = await nextOpNumber();
  let nextNum = startNum;

  // Bloco A — 100 ops
  const cenariosBlocoA: Cenario[] = [
    ...Array(10).fill("recente_inadimplente"),
    ...Array(20).fill("recente_misto"),
    ...Array(70).fill("historico_todas_pagas"),
  ] as Cenario[];
  // Embaralha a ordem pra ficar realista no banco
  cenariosBlocoA.sort(() => Math.random() - 0.5);

  console.log("📊 Bloco A — 100 operações realizadas...");
  let countBlocoA = { inadimp: 0, misto: 0, hist: 0 };
  for (const cenario of cenariosBlocoA) {
    const numero = `${TAG_NUMERO}-${String(nextNum).padStart(5, "0")}`;
    const { operacao, parcelas } = inserirOperacao(ctx, numero, cenario);
    const [op] = await db
      .insert(operacoes)
      .values(operacao)
      .returning({ id: operacoes.id });
    await db.insert(parcelasComissao).values(
      parcelas.map((p) => ({
        operacaoId: op.id,
        numero: p.numero,
        valor: p.valor.toFixed(2),
        vencimento: p.vencimento,
        status: p.status as never,
        pagoEm: p.pagoEm,
        pagoValor: p.pagoValor != null ? p.pagoValor.toFixed(2) : null,
      })),
    );
    nextNum++;
    if (cenario === "recente_inadimplente") countBlocoA.inadimp++;
    else if (cenario === "recente_misto") countBlocoA.misto++;
    else countBlocoA.hist++;
  }
  console.log(
    `  ✓ ${countBlocoA.inadimp} inadimplentes, ${countBlocoA.misto} mistas, ${countBlocoA.hist} históricas (todas pagas)`,
  );

  // Bloco B — 50 ops com todas parcelas a vencer
  console.log("\n📊 Bloco B — 50 operações confirmadas com parcelas a vencer...");
  for (let i = 0; i < 50; i++) {
    const numero = `${TAG_NUMERO}-${String(nextNum).padStart(5, "0")}`;
    const { operacao, parcelas } = inserirOperacao(
      ctx,
      numero,
      "futuro_todas_a_vencer",
    );
    const [op] = await db
      .insert(operacoes)
      .values(operacao)
      .returning({ id: operacoes.id });
    await db.insert(parcelasComissao).values(
      parcelas.map((p) => ({
        operacaoId: op.id,
        numero: p.numero,
        valor: p.valor.toFixed(2),
        vencimento: p.vencimento,
        status: p.status as never,
        pagoEm: p.pagoEm,
        pagoValor: p.pagoValor != null ? p.pagoValor.toFixed(2) : null,
      })),
    );
    nextNum++;
  }
  console.log(`  ✓ 50 ops futuras inseridas`);

  console.log("\n✅ Seed completo:");
  console.log(`   • Total inserido: 150 operações`);
  console.log(`   • Numeração: ${TAG_NUMERO}-${String(startNum).padStart(5, "0")} a ${TAG_NUMERO}-${String(nextNum - 1).padStart(5, "0")}`);
  console.log(`   • Pra remover depois: DELETE FROM operacoes WHERE numero LIKE 'OP-HIST-%'`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
