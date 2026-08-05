/**
 * Cadastro do grupo econômico IMÓVEIS DE PRIMEIRA (Curitiba/PR).
 *
 * Matriz: I.P GESTAO E CONSULTORIA IMOBILIARIA LTDA (27.538.971/0001-46)
 * Filiais: uma row por CNPJ, penduradas na matriz via `matriz_id`.
 *
 * Idempotente — roda de novo a cada filial nova sem duplicar nada
 * (upsert por CNPJ nas unidades e por URL nos documentos).
 *
 * O owner é um PLACEHOLDER até o dono informar o e-mail do responsável.
 * Nenhum convite Clerk é disparado aqui — ninguém recebe e-mail.
 * Pra vincular depois: scripts/vincular-responsavel-grupo.ts
 *
 * Pra rodar (PRODUÇÃO):
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- \
 *     | sed 's#/neondb?#/antecipaqui_prod?#') \
 *     npx tsx --env-file=.env.local scripts/cadastrar-grupo-imoveis-primeira.ts
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "../src/db";
import { documentos, imobiliarias, users } from "../src/db/schema";

/* ============================================================
   DADOS DO GRUPO
   ============================================================ */

const OWNER_PLACEHOLDER = {
  id: "pendente_grupo_ip_gestao",
  email: "cadastro-pendente+ipgestao@antecipaqui.digital",
  nome: "Responsável — Imóveis de Primeira (a definir)",
};

type DocEntrada = {
  arquivo: string;
  tipo: "contrato_social" | "comprovante_endereco" | "cartao_cnpj" | "creci";
};

type Unidade = {
  apelido: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  telefone: string | null;
  cep: string;
  endereco: string;
  cidade: string;
  uf: string;
  /** Só nas filiais: contrato sai no CNPJ da matriz em vez do próprio. */
  operaEmNomeDaMatriz?: boolean;
  documentos: DocEntrada[];
};

const DOWNLOADS = path.join(process.env.HOME ?? "", "Downloads");

const MATRIZ: Unidade = {
  apelido: "Matriz",
  razaoSocial: "I.P GESTAO E CONSULTORIA IMOBILIARIA LTDA",
  nomeFantasia: "IMOVEIS DE PRIMEIRA",
  cnpj: "27538971000146",
  telefone: "4133292265",
  cep: "80730000",
  endereco:
    "R. Padre Anchieta, 2348, Sala 1306, Andar 12 — Bigorrilho",
  cidade: "Curitiba",
  uf: "PR",
  documentos: [{ arquivo: "CNPJ  IP Gestão.pdf", tipo: "cartao_cnpj" }],
};

const FILIAIS: Unidade[] = [
  {
    apelido: "Filial Cristo Rei",
    razaoSocial: "IMOVEIS DE PRIMEIRA CRISTO REI LTDA",
    nomeFantasia: "IMOVEIS CRISTO REI",
    cnpj: "42625904000152",
    telefone: "4130685353",
    cep: "80050350",
    endereco:
      "Av. São José, 618, Loja 01, Andar TR, Cond. Botânico Business Center — Cristo Rei",
    cidade: "Curitiba",
    uf: "PR",
    operaEmNomeDaMatriz: false,
    documentos: [
      { arquivo: "Contrato social Cristo Rei.pdf", tipo: "contrato_social" },
      { arquivo: "Cartão CNPJ C. Rei (2).pdf", tipo: "cartao_cnpj" },
      { arquivo: "Cartão de credito c. rei.pdf", tipo: "comprovante_endereco" },
    ],
  },
  {
    apelido: "Filial Água Verde",
    razaoSocial: "IMOVEIS DE PRIMEIRA AGUA VERDE LTDA",
    // Cartão CNPJ sem nome fantasia; a fatura do cartão sai como "Imoveis Pri Av".
    nomeFantasia: null,
    cnpj: "47894301000170",
    telefone: "4130685353",
    cep: "80620010",
    endereco:
      "Av. República Argentina, 1237, Sala 802, Andar 08, Cond. Today's Office — Água Verde",
    cidade: "Curitiba",
    uf: "PR",
    operaEmNomeDaMatriz: false,
    documentos: [
      { arquivo: "CONTRATO SOCIAL IP Agua Verde.pdf", tipo: "contrato_social" },
      { arquivo: "Cartão CNPJ A. Verde.pdf", tipo: "cartao_cnpj" },
      { arquivo: "cartão A. Verde.pdf", tipo: "comprovante_endereco" },
    ],
  },
  {
    apelido: "Filial Batel",
    razaoSocial: "IMOVEIS DE PRIMEIRA BATEL LTDA",
    nomeFantasia: null,
    cnpj: "47893431000198",
    telefone: "4130685353",
    cep: "80240031",
    // A Receita registra o bairro como Água Verde, embora a unidade seja
    // conhecida internamente como Batel. Mantido conforme o cartão CNPJ.
    endereco:
      "Av. Iguaçu, 2820, Conj. 61, Andar 06, Cond. Iguaçu 2820 — Bloco Corporativo — Água Verde",
    cidade: "Curitiba",
    uf: "PR",
    operaEmNomeDaMatriz: false,
    documentos: [
      { arquivo: "CONTRATO SOCIAL IP Batel.pdf", tipo: "contrato_social" },
      { arquivo: "Cartão cnpj Batel...pdf", tipo: "cartao_cnpj" },
      { arquivo: "cartão batel.pdf", tipo: "comprovante_endereco" },
    ],
  },
];

/* ============================================================
   EXECUÇÃO
   ============================================================ */

async function garantirOwner(): Promise<string> {
  // Se a matriz já existe, o dono dela manda — o responsável real pode já
  // ter sido vinculado por `vincular-responsavel-grupo.ts`, e rodar este
  // script de novo (pra uma filial nova) não pode reverter isso.
  const [matrizExistente] = await db
    .select({ ownerUserId: imobiliarias.ownerUserId })
    .from(imobiliarias)
    .where(eq(imobiliarias.cnpj, MATRIZ.cnpj))
    .limit(1);
  if (matrizExistente) {
    console.log(`  · owner do grupo mantido (${matrizExistente.ownerUserId})`);
    return matrizExistente.ownerUserId;
  }

  const [existente] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, OWNER_PLACEHOLDER.id))
    .limit(1);
  if (existente) return existente.id;

  await db.insert(users).values({
    id: OWNER_PLACEHOLDER.id,
    email: OWNER_PLACEHOLDER.email,
    nome: OWNER_PLACEHOLDER.nome,
    role: "imobiliaria",
    onboardingStatus: "documentos_enviados",
    isActive: true,
  });
  console.log(`  · owner placeholder criado (${OWNER_PLACEHOLDER.id})`);
  return OWNER_PLACEHOLDER.id;
}

async function upsertUnidade(
  u: Unidade,
  ownerUserId: string,
  matrizId: string | null,
): Promise<string> {
  const base = {
    ownerUserId,
    matrizId,
    apelido: u.apelido,
    razaoSocial: u.razaoSocial,
    nomeFantasia: u.nomeFantasia,
    telefone: u.telefone,
    cep: u.cep,
    endereco: u.endereco,
    cidade: u.cidade,
    uf: u.uf,
    operaEmNomeDaMatriz: u.operaEmNomeDaMatriz ?? false,
    // A matriz declara que tem filiais; filial nunca tem sub-filial.
    possuiFiliais: matrizId === null,
    isActive: true,
    updatedAt: new Date(),
  };

  const [existente] = await db
    .select({ id: imobiliarias.id })
    .from(imobiliarias)
    .where(eq(imobiliarias.cnpj, u.cnpj))
    .limit(1);

  if (existente) {
    await db
      .update(imobiliarias)
      .set(base)
      .where(eq(imobiliarias.id, existente.id));
    console.log(`  ↻ ${u.apelido} atualizada (${u.razaoSocial})`);
    return existente.id;
  }

  const [criada] = await db
    .insert(imobiliarias)
    .values({ ...base, cnpj: u.cnpj })
    .returning({ id: imobiliarias.id });
  console.log(`  ✓ ${u.apelido} criada (${u.razaoSocial})`);
  return criada.id;
}

async function subirDocumentos(
  u: Unidade,
  imobiliariaId: string,
  ownerUserId: string,
) {
  for (const doc of u.documentos) {
    const caminho = path.join(DOWNLOADS, doc.arquivo);
    if (!fs.existsSync(caminho)) {
      console.log(`  ⚠ arquivo não encontrado, pulei: ${doc.arquivo}`);
      continue;
    }

    // Idempotência: mesmo tipo + mesma unidade = já subiu antes.
    const [jaTem] = await db
      .select({ id: documentos.id })
      .from(documentos)
      .where(
        and(
          eq(documentos.imobiliariaId, imobiliariaId),
          eq(documentos.tipo, doc.tipo),
          eq(documentos.nomeOriginal, doc.arquivo),
        ),
      )
      .limit(1);
    if (jaTem) {
      console.log(`  · ${doc.tipo} já estava no cadastro`);
      continue;
    }

    const buffer = fs.readFileSync(caminho);
    const destino = `documentos/${u.cnpj}/${doc.tipo}-${Date.now()}.pdf`;
    // Store do Blob é PRIVATE — o painel lê via proxy autenticado
    // /api/blob/[...pathname] (ver src/lib/blob-url.ts).
    const blob = await put(destino, buffer, {
      access: "private",
      contentType: "application/pdf",
      addRandomSuffix: false,
    });

    await db.insert(documentos).values({
      tipo: doc.tipo,
      url: blob.url,
      nomeOriginal: doc.arquivo,
      sizeBytes: buffer.byteLength,
      mimeType: "application/pdf",
      userId: ownerUserId,
      imobiliariaId,
      validacaoStatus: "ok",
      validacaoMotivo: "Documento oficial enviado pelo dono no cadastro do grupo",
    });
    const kb = Math.round(buffer.byteLength / 1024);
    console.log(`  ✓ ${doc.tipo} enviado (${doc.arquivo}, ${kb} KB)`);
  }
}

async function main() {
  const alvo = await db.execute("SELECT current_database() AS db");
  const rows = Array.isArray(alvo)
    ? alvo
    : ((alvo as unknown as { rows: { db: string }[] }).rows ?? []);
  console.log(`🏢 Grupo IMÓVEIS DE PRIMEIRA — banco: ${rows[0]?.db}`);

  const ownerUserId = await garantirOwner();

  console.log("\n▸ Matriz");
  const matrizId = await upsertUnidade(MATRIZ, ownerUserId, null);
  await subirDocumentos(MATRIZ, matrizId, ownerUserId);

  for (const filial of FILIAIS) {
    console.log(`\n▸ ${filial.apelido}`);
    const id = await upsertUnidade(filial, ownerUserId, matrizId);
    await subirDocumentos(filial, id, ownerUserId);
  }

  // Conferência final do grupo
  const grupo = await db
    .select({
      apelido: imobiliarias.apelido,
      razaoSocial: imobiliarias.razaoSocial,
      cnpj: imobiliarias.cnpj,
      matrizId: imobiliarias.matrizId,
    })
    .from(imobiliarias)
    .where(eq(imobiliarias.ownerUserId, ownerUserId))
    .orderBy(imobiliarias.matrizId, imobiliarias.razaoSocial);

  console.log("\n📋 Grupo cadastrado:");
  for (const g of grupo) {
    const tag = g.matrizId === null ? "MATRIZ" : "filial";
    console.log(`   [${tag}] ${g.apelido} — ${g.razaoSocial} (${g.cnpj})`);
  }

  const docs = await db
    .select({ tipo: documentos.tipo, nome: documentos.nomeOriginal })
    .from(documentos)
    .where(and(eq(documentos.userId, ownerUserId), isNull(documentos.operacaoId)));
  console.log(`\n📎 Documentos no cadastro: ${docs.length}`);
  for (const d of docs) console.log(`   ${d.tipo} — ${d.nome}`);

  console.log("\n✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
