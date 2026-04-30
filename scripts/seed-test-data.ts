/**
 * Seed de dados de teste pra popular o admin com:
 *  - 20 usuários corretor/imobiliária + 20 imobiliárias vinculadas
 *  - 10 construtoras
 *  - 50 operações com valores variados (50k–1M), parcelas (1–4),
 *    datas espalhadas pelos últimos 12 meses e status mistos
 *  - Parcelas correspondentes (status a_vencer ou paga)
 *
 * Idempotente parcialmente: usa prefixo `seed_*` em IDs e flag em CNPJs
 * sintéticos pra reconhecer registros de teste e poder limpar depois.
 *
 * Pra limpar tudo:
 *   npx tsx scripts/seed-test-data.ts --clean
 *
 * Pra rodar:
 *   set -a && source .env.local && set +a && npx tsx scripts/seed-test-data.ts
 */

import "dotenv/config";
import { eq, like, inArray } from "drizzle-orm";
import { db } from "../src/db";
import {
  construtoras,
  documentos,
  imobiliarias,
  operacaoEvents,
  operacoes,
  parcelasComissao,
  users,
} from "../src/db/schema";
import { valorPresente } from "../src/lib/format";

const SEED_USER_PREFIX = "seed_user_";
const SEED_CNPJ_FLAG = "00"; // CNPJs de teste começam com "0000" + sequencial
const TAXA_MENSAL = 0.06;

const NOMES_CORRETORES = [
  "Ana Beatriz Souza", "Bruno Almeida Costa", "Carla Maria Ribeiro",
  "Diego Pereira Santos", "Eduarda Lima Silva", "Felipe Augusto Cardoso",
  "Gabriela Mendes", "Henrique Vasconcelos", "Isabela Tavares Rocha",
  "João Vinicius Barros", "Karina Lopes Ferreira", "Lucas Andrade Pinto",
  "Mariana Esteves Cunha", "Nicolas Oliveira Souza", "Otávio Henrique Pires",
  "Patrícia Caldeira Reis", "Rafael Damaceno Vieira", "Sabrina Ramos Borges",
  "Thiago Aragão Castro", "Vanessa Coutinho Maia",
];

const RAZOES_IMOBILIARIA = [
  "Casa Boa Imóveis", "Lar Doce Lar Negócios", "Norte Sul Realty",
  "Capital Imobiliária", "Vista Mar Corretora", "Cidade Alta Imóveis",
  "Bairro Novo Negócios", "Plaza Imóveis", "Avenida Realty",
  "Esquina Imóveis", "Solar Imobiliária", "Mirante Realty",
  "Águia Imóveis", "Costa Verde Negócios", "Jardim das Acácias Imóveis",
  "Vila Nova Realty", "Ponto Certo Imóveis", "Horizonte Imobiliária",
  "Atlas Realty", "Marco Zero Imóveis",
];

const CIDADES_UF = [
  ["São Paulo", "SP"], ["Rio de Janeiro", "RJ"], ["Belo Horizonte", "MG"],
  ["Curitiba", "PR"], ["Porto Alegre", "RS"], ["Salvador", "BA"],
  ["Recife", "PE"], ["Fortaleza", "CE"], ["Goiânia", "GO"], ["Campinas", "SP"],
];

const RAZOES_CONSTRUTORA = [
  "Construtora Horizonte Azul Ltda", "Edifica Brasil S/A",
  "Concreta Engenharia Ltda", "Norte Sul Construções S/A",
  "Vega Empreendimentos Ltda", "Pilar Construtora S/A",
  "Tropical Edificações Ltda", "Capital Construções S/A",
  "Solaris Empreendimentos Ltda", "Atlas Construtora S/A",
];

const STATUSES = [
  "aguardando_aprovacao",
  "documentos_incompletos",
  "pre_aprovada",
  "analise_final",
  "enviada_para_assinatura",
  "enviada_para_pagamento",
  "realizada",
  "recusada",
  "cancelada",
] as const;

// Distribuição realista — mais operações em produção que recusadas
const STATUS_WEIGHTS: Record<(typeof STATUSES)[number], number> = {
  aguardando_aprovacao: 8,
  documentos_incompletos: 3,
  pre_aprovada: 6,
  analise_final: 4,
  enviada_para_assinatura: 4,
  enviada_para_pagamento: 3,
  realizada: 12,
  recusada: 3,
  cancelada: 2,
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

function pickWeighted<K extends string>(weights: Record<K, number>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r <= 0) return k;
  }
  return entries[0][0];
}

function fakeCnpj(seq: number) {
  // Formato 14 dígitos. Não passa em isValidCNPJ (queremos pra evitar
  // colisão com CNPJs reais), mas o seed bypass valida.
  return `${SEED_CNPJ_FLAG}${String(seq).padStart(12, "0")}`;
}
function fakePhone() {
  return `${randInt(11, 99)}9${randInt(10000000, 99999999)}`;
}
function fakeCep() {
  return String(randInt(10000000, 99999999));
}
function fakeAddress(cidade: string) {
  const ruas = ["Av. Paulista", "Rua das Flores", "Av. Atlântica", "Rua XV de Novembro", "Av. Brasil"];
  return `${pick(ruas)}, ${randInt(100, 9999)} — ${cidade}`;
}

async function clean() {
  console.log("🧹 Limpando dados de seed antigos...");
  // Pega todos os user IDs de seed
  const seedUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.id, `${SEED_USER_PREFIX}%`));
  const seedIds = seedUsers.map((u) => u.id);

  if (seedIds.length > 0) {
    // operacoes vinculadas → cascateia parcelas/eventos via FK ON DELETE CASCADE
    await db
      .delete(operacoes)
      .where(inArray(operacoes.corretorUserId, seedIds));
    // documentos
    await db.delete(documentos).where(inArray(documentos.userId, seedIds));
    // imobiliarias
    await db
      .delete(imobiliarias)
      .where(inArray(imobiliarias.ownerUserId, seedIds));
    // users
    await db.delete(users).where(inArray(users.id, seedIds));
  }

  // construtoras de seed (CNPJ começa com "0000")
  await db.delete(construtoras).where(like(construtoras.cnpj, "00%"));
  console.log("✓ limpo");
}

async function seed() {
  console.log("🌱 Gerando dados de teste...");

  // ── 1. 20 imobiliárias/corretores ─────────────────────────────────────
  const userRows = NOMES_CORRETORES.map((nome, i) => {
    const slug = nome.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
    return {
      id: `${SEED_USER_PREFIX}${String(i + 1).padStart(2, "0")}`,
      email: `${slug}@seed.antecipaqui.test`,
      nome,
      telefone: fakePhone(),
      role: (Math.random() < 0.3 ? "imobiliaria" : "corretor") as
        | "imobiliaria"
        | "corretor",
      onboardingStatus: "aprovado" as const,
      isActive: true,
    };
  });
  await db.insert(users).values(userRows).onConflictDoNothing();
  console.log(`✓ ${userRows.length} usuários (corretor/imobiliária)`);

  // imobiliárias linkadas
  const imobRows = userRows.map((u, i) => {
    const [cidade, uf] = pick(CIDADES_UF);
    return {
      ownerUserId: u.id,
      razaoSocial: RAZOES_IMOBILIARIA[i] + " Ltda",
      nomeFantasia: RAZOES_IMOBILIARIA[i],
      cnpj: fakeCnpj(i + 1),
      creciResponsavel: `J-${randInt(10000, 99999)}`,
      telefone: u.telefone,
      cep: fakeCep(),
      endereco: fakeAddress(cidade),
      cidade,
      uf,
      bancoNome: pick(["Itaú", "Bradesco", "Santander", "Banco do Brasil", "Caixa"]),
      bancoCodigo: pick(["341", "237", "033", "001", "104"]),
      bancoAgencia: String(randInt(1000, 9999)),
      bancoConta: `${randInt(10000, 99999)}-${randInt(0, 9)}`,
    };
  });
  const insertedImobs = await db
    .insert(imobiliarias)
    .values(imobRows)
    .returning({ id: imobiliarias.id, ownerUserId: imobiliarias.ownerUserId });
  console.log(`✓ ${insertedImobs.length} imobiliárias`);

  // documentos KYC pra cada user (contrato_social + comprovante_endereco)
  // pra que possam criar operações
  const docRows = userRows.flatMap((u) => [
    {
      tipo: "contrato_social" as const,
      url: `https://seed.antecipaqui.test/${u.id}/contrato_social.pdf`,
      nomeOriginal: "contrato_social.pdf",
      userId: u.id,
    },
    {
      tipo: "comprovante_endereco" as const,
      url: `https://seed.antecipaqui.test/${u.id}/comprovante.pdf`,
      nomeOriginal: "comprovante_endereco.pdf",
      userId: u.id,
    },
  ]);
  await db.insert(documentos).values(docRows);
  console.log(`✓ ${docRows.length} documentos KYC`);

  // ── 2. 10 construtoras ─────────────────────────────────────────────────
  const construtoraRows = RAZOES_CONSTRUTORA.map((razao, i) => {
    const [cidade, uf] = pick(CIDADES_UF);
    return {
      razaoSocial: razao,
      nomeFantasia: razao.split(" ")[0],
      cnpj: fakeCnpj(100 + i),
      telefone: fakePhone(),
      email: `contato@${razao.split(" ")[0].toLowerCase()}.seed.test`,
      cep: fakeCep(),
      endereco: fakeAddress(cidade),
      cidade,
      uf,
      onboardingStatus: pick(["pendente", "documentos_enviados", "aprovado"]) as
        | "pendente"
        | "documentos_enviados"
        | "aprovado",
      isActive: true,
    };
  });
  const insertedConstrutoras = await db
    .insert(construtoras)
    .values(construtoraRows)
    .returning({ id: construtoras.id });
  console.log(`✓ ${insertedConstrutoras.length} construtoras`);

  // ── 3. 50 operações ────────────────────────────────────────────────────
  // Distribui datas pelos últimos 12 meses
  const now = new Date();
  const opRows: Array<{
    id: string;
    valorComissao: number;
    parcelas: { numero: number; valor: number; vencimento: string; status: "a_vencer" | "paga" }[];
    status: (typeof STATUSES)[number];
  }> = [];

  for (let i = 0; i < 50; i++) {
    const dono = pick(insertedImobs);
    const construtora = pick(insertedConstrutoras);

    // valor venda 200k a 5M (comissão será % disso, 1.5% a 6%)
    const valorVenda = Math.round(rand(200_000, 5_000_000) / 1000) * 1000;
    const taxaComissao = rand(0.015, 0.06);
    let valorComissao = Math.round((valorVenda * taxaComissao) / 100) * 100;
    // Garantir entre 50k e 1M
    valorComissao = Math.max(50_000, Math.min(1_000_000, valorComissao));

    const numeroParcelas = randInt(1, 4);
    const valorParcela = valorComissao / numeroParcelas;

    // Data venda nos últimos 12 meses
    const monthsAgo = randInt(0, 11);
    const dataVenda = new Date(now);
    dataVenda.setMonth(dataVenda.getMonth() - monthsAgo);
    dataVenda.setDate(randInt(1, 28));
    const dataVendaIso = dataVenda.toISOString().slice(0, 10);

    // Parcelas (1 a 4 mensais a partir da venda)
    const parcelasArr = Array.from({ length: numeroParcelas }, (_, j) => {
      const v = new Date(dataVenda);
      v.setMonth(v.getMonth() + j + 1);
      return {
        numero: j + 1,
        valor: Number(valorParcela.toFixed(2)),
        vencimento: v.toISOString().slice(0, 10),
        status: (v < now && Math.random() < 0.7 ? "paga" : "a_vencer") as
          | "paga"
          | "a_vencer",
      };
    });

    // VP (calculado em relação a HOJE, não data venda — simula seleção de
    // antecipação no momento da operação)
    const meses = parcelasArr.map((p) => {
      const v = new Date(p.vencimento + "T00:00:00");
      const m =
        (v.getFullYear() - now.getFullYear()) * 12 +
        (v.getMonth() - now.getMonth()) +
        (v.getDate() - now.getDate()) / 30;
      return Math.max(m, 0);
    });
    const vp = valorPresente(
      parcelasArr.map((p, k) => ({
        valor: p.valor,
        mesesAteVencimento: meses[k],
      })),
      TAXA_MENSAL,
    );
    const desagio = valorComissao - vp;

    const status = pickWeighted(STATUS_WEIGHTS);
    const numero = `OP-SEED-${String(i + 1).padStart(4, "0")}`;

    opRows.push({
      id: numero,
      valorComissao,
      parcelas: parcelasArr,
      status,
    });

    const [insertedOp] = await db
      .insert(operacoes)
      .values({
        numero,
        corretorUserId: dono.ownerUserId,
        imobiliariaId: dono.id,
        construtoraId: construtora.id,
        valorVenda: String(valorVenda.toFixed(2)),
        valorComissao: String(valorComissao.toFixed(2)),
        dataVenda: dataVendaIso,
        numeroParcelas,
        taxaMensal: String(TAXA_MENSAL),
        valorPresente: String(vp.toFixed(2)),
        desagio: String(desagio.toFixed(2)),
        status,
        ...(status === "realizada"
          ? { liquidadoEm: new Date(dataVenda.getTime() + 86400000 * 60) }
          : {}),
        ...(status === "recusada" || status === "cancelada"
          ? { motivoRecusa: "Cadastro de teste — descartado" }
          : {}),
        ...(status === "documentos_incompletos"
          ? { motivoPendencia: "Faltam comprovantes da venda (cadastro de teste)" }
          : {}),
        createdAt: dataVenda,
      })
      .returning({ id: operacoes.id });

    await db.insert(parcelasComissao).values(
      parcelasArr.map((p) => ({
        operacaoId: insertedOp.id,
        numero: p.numero,
        valor: String(p.valor.toFixed(2)),
        vencimento: p.vencimento,
        status: p.status,
        ...(p.status === "paga"
          ? {
              pagoEm: new Date(p.vencimento + "T12:00:00"),
              pagoValor: String(p.valor.toFixed(2)),
            }
          : {}),
      })),
    );

    await db.insert(operacaoEvents).values({
      operacaoId: insertedOp.id,
      userId: dono.ownerUserId,
      type: "operacao_created",
      payload: { seed: true, numero },
    });
  }
  console.log(`✓ 50 operações + parcelas + eventos`);

  console.log("\n✅ seed concluído");
  console.log(`   ${userRows.length} usuários (corretor/imobiliária)`);
  console.log(`   ${insertedImobs.length} imobiliárias`);
  console.log(`   ${insertedConstrutoras.length} construtoras`);
  console.log(`   50 operações com valores 50k–1M, 1–4 parcelas, status mistos`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--clean")) {
    await clean();
    return;
  }
  if (args.includes("--reset")) {
    await clean();
    await seed();
    return;
  }
  await seed();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
