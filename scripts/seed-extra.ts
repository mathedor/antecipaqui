/**
 * Seed extra incremental:
 *   +20 imobiliárias COMPLETAS (com bancos)
 *   +5 construtoras COMPLETAS
 *   +50 operações novas (R$10k–250k de comissão, 1–4 parcelas)
 *
 * Usa prefixo `seed2_user_` e CNPJ "0001..." pra distinguir do seed-test-data.
 *
 * Pra rodar:
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) npx tsx scripts/seed-extra.ts
 */

import "dotenv/config";
import { db } from "../src/db";
import {
  construtoras,
  imobiliarias,
  operacoes,
  parcelasComissao,
  users,
} from "../src/db/schema";
import { valorPresente } from "../src/lib/format";

const SEED_USER_PREFIX = "seed2_user_";
const SEED_CNPJ_FLAG = "0001"; // CNPJs de teste começam com "0001" + sequencial
const TAXA_MENSAL = 0.06;

const NOMES_RESPONSAVEIS = [
  "Adriana Vasconcellos Mendes",
  "Bento Cardoso Almeida",
  "Camila Rocha Borges",
  "Daniel Estevam Cunha",
  "Elisa Tavares Ferreira",
  "Fábio Granja Pinto",
  "Giovanna Matos Lima",
  "Heitor Reis Sá",
  "Iara Freitas Castro",
  "José Pedro Magalhães",
  "Karen Soares Bittencourt",
  "Leonardo Faria Brito",
  "Marília Galvão Nogueira",
  "Natália Ferraz Coelho",
  "Olavo Quintela Neves",
  "Pâmela Domingues Pires",
  "Renan Iervolino Tórtola",
  "Sônia Wanderley Mota",
  "Tales Ribeiro Acosta",
  "Vicenza Marra Calabrese",
];

const RAZOES_IMOBILIARIA = [
  "Premier Imóveis Premium",
  "Costa do Sol Real Estate",
  "Top Vista Imobiliária",
  "Conexão Real Estate",
  "Aliança Imóveis e Locação",
  "Plenitude Negócios Imobiliários",
  "Renovar Imobiliária",
  "Centro Sul Imóveis",
  "Aclamado Real Estate",
  "Brisa do Mar Imóveis",
  "Reluz Negócios Imobiliários",
  "Vértice Imóveis",
  "Cubo Real Estate",
  "Lume Imóveis",
  "Mosaico Imobiliária",
  "Origem Real Estate",
  "Pulse Imóveis",
  "Quórum Real Estate",
  "Sextante Imóveis",
  "Verismo Imobiliária",
];

const NOMES_FANTASIA_IMOB = [
  "Premier", "Costa do Sol", "Top Vista", "Conexão", "Aliança",
  "Plenitude", "Renovar", "Centro Sul", "Aclamado", "Brisa do Mar",
  "Reluz", "Vértice", "Cubo", "Lume", "Mosaico",
  "Origem", "Pulse", "Quórum", "Sextante", "Verismo",
];

const RAZOES_CONSTRUTORA = [
  "MetaCons Engenharia e Construções S/A",
  "Lumière Empreendimentos Ltda",
  "ProBuild Construtora S/A",
  "Gênesis Edificações Ltda",
  "Modular Construções Brasil S/A",
];

const NOMES_FANTASIA_CONSTR = [
  "MetaCons", "Lumière", "ProBuild", "Gênesis", "Modular",
];

const CIDADES_UF: [string, string][] = [
  ["São Paulo", "SP"],
  ["Rio de Janeiro", "RJ"],
  ["Belo Horizonte", "MG"],
  ["Curitiba", "PR"],
  ["Porto Alegre", "RS"],
  ["Salvador", "BA"],
  ["Recife", "PE"],
  ["Fortaleza", "CE"],
  ["Goiânia", "GO"],
  ["Brasília", "DF"],
  ["Florianópolis", "SC"],
  ["Vitória", "ES"],
  ["Manaus", "AM"],
  ["Belém", "PA"],
  ["Natal", "RN"],
];

const RUAS = [
  "Av. Paulista",
  "Rua Oscar Freire",
  "Av. Brigadeiro Faria Lima",
  "Av. Atlântica",
  "Av. Beira Mar",
  "Av. Sete de Setembro",
  "Rua XV de Novembro",
  "Av. Boa Viagem",
  "Av. Brasil",
  "Rua Augusta",
  "Av. Rio Branco",
  "Av. Presidente Vargas",
  "Av. Goiás",
  "Av. Independência",
  "Rua das Palmeiras",
];

const BANCOS = [
  ["001", "Banco do Brasil"],
  ["033", "Santander"],
  ["104", "Caixa Econômica Federal"],
  ["237", "Bradesco"],
  ["341", "Itaú Unibanco"],
  ["260", "Nu Pagamentos (Nubank)"],
  ["077", "Banco Inter"],
  ["336", "C6 Bank"],
  ["323", "Mercado Pago"],
  ["208", "BTG Pactual"],
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

const STATUS_WEIGHTS: Record<(typeof STATUSES)[number], number> = {
  aguardando_aprovacao: 7,
  documentos_incompletos: 3,
  pre_aprovada: 6,
  analise_final: 5,
  enviada_para_assinatura: 5,
  enviada_para_pagamento: 4,
  realizada: 14,
  recusada: 4,
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

/** Gera CNPJ válido com dígitos verificadores. Mantém prefixo de seed. */
function generateValidCNPJ(seq: number): string {
  // 12 primeiros dígitos: prefixo + sequencial
  const prefix = SEED_CNPJ_FLAG; // 4 dígitos
  const middle = String(seq).padStart(8, "0"); // 8 dígitos
  const base = (prefix + middle).slice(0, 12);

  // Cálculo do primeiro dígito verificador
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(base[i]) * w1[i];
  const d1 = ((sum % 11) < 2 ? 0 : 11 - (sum % 11));

  // Cálculo do segundo dígito verificador
  const w2 = [6, ...w1];
  sum = 0;
  const base13 = base + d1;
  for (let i = 0; i < 13; i++) sum += parseInt(base13[i]) * w2[i];
  const d2 = ((sum % 11) < 2 ? 0 : 11 - (sum % 11));

  return base + d1 + d2;
}

function fakePhone() {
  // DDDs reais brasileiros
  const ddds = [11, 21, 31, 41, 51, 61, 71, 81, 85, 11, 11, 47, 19];
  const ddd = pick(ddds);
  return `${ddd}9${randInt(10000000, 99999999)}`;
}
function fakeCep() {
  return String(randInt(10000000, 99999999));
}
function fakeAddress(cidade: string) {
  return `${pick(RUAS)}, ${randInt(100, 9999)} — ${cidade}`;
}

async function nextOpNumber(): Promise<number> {
  // Pega o maior número OP-2026-XXXX existente e incrementa
  const result = await db.execute(
    `SELECT MAX(CAST(SUBSTRING(numero FROM 'OP-\\d+-(\\d+)') AS INTEGER)) AS max FROM operacoes WHERE numero LIKE 'OP-%'`,
  );
  const rows = (result as unknown as { rows: { max: number | null }[] }).rows;
  const max = rows[0]?.max ?? 0;
  return (max ?? 0) + 1;
}

async function main() {
  console.log("🌱 Seed extra (sem mexer nos dados existentes)...");

  // 1. Criar 20 imobiliárias (user + imobiliaria + dados bancários)
  console.log("👥 Criando 20 imobiliárias...");
  const imobUsers: { id: string }[] = [];
  for (let i = 1; i <= 20; i++) {
    const userId = `${SEED_USER_PREFIX}${i}`;
    const nome = NOMES_RESPONSAVEIS[i - 1];
    const email = `seed2.imob${i}@antecipaqui.test`;
    const role = i % 3 === 0 ? "imobiliaria" : "corretor";

    await db
      .insert(users)
      .values({
        id: userId,
        email,
        nome,
        telefone: fakePhone(),
        role: role as never,
        onboardingStatus: "aprovado",
        isActive: true,
      })
      .onConflictDoNothing();

    const [cidade, uf] = pick(CIDADES_UF);
    const banco = pick(BANCOS);
    await db
      .insert(imobiliarias)
      .values({
        ownerUserId: userId,
        razaoSocial: `[SEED2] ${RAZOES_IMOBILIARIA[i - 1]}`,
        nomeFantasia: NOMES_FANTASIA_IMOB[i - 1],
        cnpj: generateValidCNPJ(i),
        creciResponsavel: `J-${randInt(10000, 99999)}`,
        telefone: fakePhone(),
        cep: fakeCep(),
        endereco: fakeAddress(cidade),
        cidade,
        uf,
        bancoCodigo: banco[0],
        bancoNome: banco[1],
        bancoAgencia: `${randInt(1000, 9999)}-${randInt(0, 9)}`,
        bancoConta: `${randInt(10000, 99999)}-${randInt(0, 9)}`,
      })
      .onConflictDoNothing();

    imobUsers.push({ id: userId });
  }

  // 2. Criar 5 construtoras
  console.log("🏗 Criando 5 construtoras...");
  const construtoraIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const userId = `${SEED_USER_PREFIX}constr_${i}`;
    const nome = `Resp. ${RAZOES_CONSTRUTORA[i - 1].split(" ").slice(0, 2).join(" ")}`;
    const email = `seed2.constr${i}@antecipaqui.test`;

    await db
      .insert(users)
      .values({
        id: userId,
        email,
        nome,
        telefone: fakePhone(),
        role: "construtora" as never,
        onboardingStatus: "aprovado",
        isActive: true,
      })
      .onConflictDoNothing();

    const [cidade, uf] = pick(CIDADES_UF);
    const [created] = await db
      .insert(construtoras)
      .values({
        ownerUserId: userId,
        razaoSocial: `[SEED2] ${RAZOES_CONSTRUTORA[i - 1]}`,
        nomeFantasia: NOMES_FANTASIA_CONSTR[i - 1],
        cnpj: generateValidCNPJ(1000 + i),
        telefone: fakePhone(),
        email: `comercial+${i}@${NOMES_FANTASIA_CONSTR[i - 1].toLowerCase().replace(/\s/g, "")}.com.br`,
        cep: fakeCep(),
        endereco: fakeAddress(cidade),
        cidade,
        uf,
        onboardingStatus: "aprovado",
        isActive: true,
      })
      .onConflictDoNothing()
      .returning({ id: construtoras.id });

    if (created) construtoraIds.push(created.id);
  }

  // Recupera IDs caso onConflictDoNothing tenha pulado (já existiam)
  if (construtoraIds.length < 5) {
    const all = await db.execute(
      `SELECT id FROM construtoras WHERE razao_social LIKE '[SEED2]%' LIMIT 5`,
    );
    const rows = (all as unknown as { rows: { id: string }[] }).rows;
    construtoraIds.length = 0;
    for (const r of rows) construtoraIds.push(r.id);
  }

  // 3. Criar 50 operações
  console.log("📝 Criando 50 operações...");
  const startNum = await nextOpNumber();
  const ANO = new Date().getFullYear();

  for (let i = 0; i < 50; i++) {
    const corretorId = pick(imobUsers).id;
    const construtoraId = pick(construtoraIds);

    // Comissão entre R$10k e R$250k
    const valorComissao = randInt(10000, 250000);
    // Comissão é 5-8% da venda
    const comissaoPct = rand(0.05, 0.08);
    const valorVenda = Math.round(valorComissao / comissaoPct);

    const numParcelas = randInt(1, 4);
    const dataVendaDate = new Date();
    dataVendaDate.setDate(dataVendaDate.getDate() - randInt(0, 90));
    const dataVenda = dataVendaDate.toISOString().slice(0, 10);

    // Parcelas iguais com vencimento mensal a partir de 30 dias da venda
    const valorParcela = valorComissao / numParcelas;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parcelasArr = Array.from({ length: numParcelas }, (_, idx) => {
      const v = new Date(dataVendaDate);
      v.setDate(v.getDate() + 30 * (idx + 1));
      const meses = Math.max(
        (v.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30),
        0,
      );
      return {
        numero: idx + 1,
        valor: valorParcela,
        vencimento: v.toISOString().slice(0, 10),
        mesesAteVencimento: meses,
      };
    });

    const vp = valorPresente(
      parcelasArr.map((p) => ({
        valor: p.valor,
        mesesAteVencimento: p.mesesAteVencimento,
      })),
      TAXA_MENSAL,
    );
    const desagio = valorComissao - vp;

    const status = pickWeighted(STATUS_WEIGHTS);
    const numero = `OP-${ANO}-${String(startNum + i).padStart(4, "0")}`;

    const [op] = await db
      .insert(operacoes)
      .values({
        numero,
        corretorUserId: corretorId,
        construtoraId,
        valorVenda: valorVenda.toFixed(2),
        valorComissao: valorComissao.toFixed(2),
        dataVenda,
        numeroParcelas: numParcelas,
        taxaMensal: TAXA_MENSAL.toFixed(4),
        valorPresente: vp.toFixed(2),
        desagio: desagio.toFixed(2),
        status: status as never,
        ...(status === "recusada"
          ? {
              motivoRecusa: pick([
                "Documentação inconsistente com CNPJ",
                "Comissão acima do permitido pra este perfil",
                "Construtora não respondeu confirmação",
                "Limite de operação excedido",
                "Análise de crédito reprovada",
              ]),
            }
          : {}),
        ...(status === "documentos_incompletos"
          ? {
              motivoPendencia: pick([
                "Falta nota fiscal de comissão assinada",
                "Comprovante de venda ilegível",
                "Falta CRECI atualizado do corretor",
              ]),
            }
          : {}),
      })
      .returning({ id: operacoes.id });

    // Insere parcelas
    await db.insert(parcelasComissao).values(
      parcelasArr.map((p) => ({
        operacaoId: op.id,
        numero: p.numero,
        valor: p.valor.toFixed(2),
        vencimento: p.vencimento,
        status: (status === "realizada" ? "paga" : "a_vencer") as never,
        ...(status === "realizada"
          ? {
              pagoEm: new Date().toISOString().slice(0, 10),
              pagoValor: p.valor.toFixed(2),
            }
          : {}),
      })),
    );
  }

  console.log("\n✅ Seed extra completo:");
  console.log(`   • 20 usuários imobiliária/corretor (id ${SEED_USER_PREFIX}1 a ${SEED_USER_PREFIX}20)`);
  console.log(`   • 5 usuários construtora (id ${SEED_USER_PREFIX}constr_1 a ${SEED_USER_PREFIX}constr_5)`);
  console.log(`   • 5 construtoras vinculadas`);
  console.log(`   • 50 operações novas (OP-${ANO}-${String(startNum).padStart(4, "0")} a OP-${ANO}-${String(startNum + 49).padStart(4, "0")})`);
  console.log(`   • Parcelas correspondentes`);
  console.log(`   • Tag pra identificar: razão social começa com "[SEED2]"`);
  console.log(`   • CNPJs com prefixo "${SEED_CNPJ_FLAG}" (válidos com DV correto)`);
}

main()
  .then(() => {
    console.log("\nDone.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("\n❌ Erro no seed:", e);
    process.exit(1);
  });
