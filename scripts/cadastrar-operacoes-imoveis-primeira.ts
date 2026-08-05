/**
 * Cadastro das operações do grupo IMÓVEIS DE PRIMEIRA a partir dos
 * contratos enviados pelo dono.
 *
 * Todas entram com status `documentos_incompletos` + `motivoPendencia`
 * descrevendo exatamente o que falta — assim o responsável entra no painel,
 * vê a operação cadastrada e sobe o que estiver faltando. Nada é inventado:
 * o que o contrato não diz vira pendência escrita.
 *
 * Cada operação sai da unidade do grupo que consta como beneficiária da
 * comissão no contrato (matriz ou filial) — é o grupo econômico em uso.
 *
 * Idempotente: identifica a operação pela referência do contrato guardada
 * no início do `motivoPendencia`.
 *
 * Pra rodar (PRODUÇÃO):
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- \
 *     | sed 's#/neondb?#/antecipaqui_prod?#') \
 *     BLOB_READ_WRITE_TOKEN=... npx tsx scripts/cadastrar-operacoes-imoveis-primeira.ts
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { put } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/db";
import {
  construtoras,
  documentos,
  imobiliarias,
  operacaoCompradores,
  operacoes,
  parcelasComissao,
} from "../src/db/schema";

const DOWNLOADS = path.join(process.env.HOME ?? "", "Downloads");

/** Taxa mensal usada pro valor presente. Prod ainda não tem fundo nem
 *  system_settings, então vale o default da plataforma (6% a.m.). */
const TAXA_MENSAL = 0.06;

/* ============================================================
   CONTRAPARTES (quem deve a comissão)
   ============================================================ */

const CONTRAPARTES = {
  plaenge: {
    razaoSocial: "PLAENGE EMPREENDIMENTOS LTDA",
    nomeFantasia: "PLAENGE",
    // CNPJ da matriz (Londrina). A filial de Curitiba, que assina os
    // contratos, é a 78.638.061/0005-08.
    cnpj: "78638061000176",
    cidade: "Londrina",
    uf: "PR",
    endereco: "Av. Tiradentes, 1000",
  },
  grossi: {
    razaoSocial: "GROSSI LTDA",
    nomeFantasia: null,
    cnpj: "59747514000158",
    cidade: null,
    uf: null,
    endereco: null,
  },
} as const;

/* ============================================================
   OPERAÇÕES
   ============================================================ */

type Parcela = { valor: number; vencimento: string };
type Comprador = {
  tipoPessoa: "fisica" | "juridica";
  nome: string;
  documento: string;
  email: string;
  telefone: string;
};
type DocOp = {
  arquivo: string;
  tipo: "contrato_venda" | "contrato_comissao";
};

type OperacaoEntrada = {
  /** Chave de idempotência — vai no começo do motivoPendencia. */
  ref: string;
  /** CNPJ da unidade do grupo que recebe a comissão. */
  unidadeCnpj: string;
  contraparte: keyof typeof CONTRAPARTES;
  empreendimento: string;
  valorVenda: number;
  valorComissao: number;
  dataVenda: string; // YYYY-MM-DD
  /** Vazio quando o contrato não traz cronograma da comissão. */
  parcelas: Parcela[];
  /** Quando preenchido, o pagador da comissão são os compradores. */
  compradores?: Comprador[];
  documentos: DocOp[];
  /** Itens que faltam pra operação seguir. Viram o motivoPendencia. */
  pendencias: string[];
};

const MATRIZ_CNPJ = "27538971000146";
const CONSULTORIA_CNPJ = "19594298000133";

const OPERACOES: OperacaoEntrada[] = [
  {
    ref: "SIGNATURE-T1-0202",
    unidadeCnpj: MATRIZ_CNPJ,
    contraparte: "plaenge",
    empreendimento: "SIGNATURE PLAENGE — Torre 1, unidade 0202",
    valorVenda: 3_300_000,
    valorComissao: 84_150,
    dataVenda: "2025-12-05",
    parcelas: [],
    documentos: [
      { arquivo: "202.SIGNATURA.JULIO (1).pdf", tipo: "contrato_venda" },
    ],
    pendencias: [
      "Cronograma de pagamento da comissão — o quadro resumo informa o valor (R$ 84.150,00) mas não as datas e parcelas em que a Plaenge vai pagar",
      "Contrato de comissionamento / termo de corretagem assinado",
    ],
  },
  {
    ref: "ARTIS-T1-0804",
    unidadeCnpj: MATRIZ_CNPJ,
    contraparte: "plaenge",
    empreendimento: "PLAENGE ARTIS — Torre 1, unidade 804",
    valorVenda: 4_260_000,
    valorComissao: 108_630,
    dataVenda: "2025-12-01",
    parcelas: [],
    documentos: [
      { arquivo: "ARTIS.804.NELSON (1).pdf", tipo: "contrato_venda" },
    ],
    pendencias: [
      "Cronograma de pagamento da comissão — o quadro resumo informa o valor (R$ 108.630,00) mas não as datas e parcelas em que a Plaenge vai pagar",
      "Contrato de comissionamento / termo de corretagem assinado",
    ],
  },
  {
    ref: "SOLAIA-801-T2",
    unidadeCnpj: CONSULTORIA_CNPJ,
    contraparte: "grossi",
    empreendimento: "SOLAIA GARDEN HOME RESORT — unidade 801 T2",
    valorVenda: 2_218_400,
    valorComissao: 88_736,
    dataVenda: "2026-02-09",
    parcelas: [
      { valor: 79_920, vencimento: "2026-02-25" },
      { valor: 8_816, vencimento: "2027-03-20" },
    ],
    documentos: [
      {
        arquivo: "CONTRATO DE CORRETAGEM - SOLAIA 801 T2 [assinado].pdf",
        tipo: "contrato_comissao",
      },
    ],
    pendencias: [
      "Compromisso de compra e venda da unidade assinado (o contrato de corretagem sozinho não comprova a venda)",
    ],
  },
  {
    ref: "SOLAIA-902-T2",
    unidadeCnpj: CONSULTORIA_CNPJ,
    contraparte: "grossi",
    empreendimento: "SOLAIA GARDEN HOME RESORT — unidade 902 T2",
    valorVenda: 2_192_400,
    valorComissao: 87_696,
    dataVenda: "2026-02-09",
    parcelas: [
      { valor: 79_920, vencimento: "2026-02-25" },
      { valor: 7_776, vencimento: "2027-03-20" },
    ],
    documentos: [
      {
        arquivo: "CONTRATO DE CORRETAGEM - SOLAIA 902 T2 [assinado].pdf",
        tipo: "contrato_comissao",
      },
    ],
    pendencias: [
      "Compromisso de compra e venda da unidade assinado (o contrato de corretagem sozinho não comprova a venda)",
    ],
  },
  {
    ref: "SOLAIA-1002-T2",
    unidadeCnpj: CONSULTORIA_CNPJ,
    contraparte: "grossi",
    empreendimento: "SOLAIA GARDEN HOME RESORT — unidade 1002 T2",
    valorVenda: 2_367_770,
    valorComissao: 94_710.8,
    dataVenda: "2026-02-07",
    parcelas: [
      { valor: 79_920, vencimento: "2026-02-25" },
      { valor: 14_790.8, vencimento: "2027-03-20" },
    ],
    // Aqui quem contrata a corretagem são as pessoas físicas, não a Grossi.
    compradores: [
      {
        tipoPessoa: "fisica",
        nome: "EDGAR EUZÉBIO GROSSI",
        documento: "02590354916",
        email: "edgargrossi@me.com",
        telefone: "",
      },
      {
        tipoPessoa: "fisica",
        nome: "DÉBORA REGINA DA COSTA GROSSI",
        documento: "21689769882",
        email: "",
        telefone: "",
      },
    ],
    documentos: [
      {
        arquivo: "CONTRATO DE CORRETAGEM - SOLAIA 1002 T2 [assinado].pdf",
        tipo: "contrato_comissao",
      },
    ],
    pendencias: [
      "Compromisso de compra e venda da unidade assinado (o contrato de corretagem sozinho não comprova a venda)",
      "Telefone e e-mail de Débora Regina da Costa Grossi, e telefone de Edgar Euzébio Grossi — necessários pra emitir a cobrança no nome dos compradores",
    ],
  },
  {
    ref: "SOLAIA-1201-T5",
    unidadeCnpj: CONSULTORIA_CNPJ,
    contraparte: "grossi",
    empreendimento: "SOLAIA GARDEN HOME RESORT — unidade 1201 T5",
    valorVenda: 4_941_900,
    valorComissao: 197_676,
    dataVenda: "2026-02-27",
    parcelas: [
      { valor: 175_920, vencimento: "2026-03-25" },
      { valor: 21_756, vencimento: "2027-05-24" },
    ],
    documentos: [
      {
        arquivo: "CONTRATO DE CORRETAGEM - SOLAIA 1201 T5 [assinado].pdf",
        tipo: "contrato_comissao",
      },
    ],
    pendencias: [
      "Compromisso de compra e venda da unidade assinado (o contrato de corretagem sozinho não comprova a venda)",
    ],
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

const HOJE = new Date();

function mesesAte(vencimento: string): number {
  const alvo = new Date(vencimento + "T00:00:00");
  const anos = alvo.getFullYear() - HOJE.getFullYear();
  const meses = alvo.getMonth() - HOJE.getMonth();
  const fracDia = (alvo.getDate() - HOJE.getDate()) / 30;
  // Parcela vencida não ganha deságio negativo — mesmo clamp do fluxo real.
  return Math.max(anos * 12 + meses + fracDia, 0);
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

async function proximoNumero(): Promise<string> {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(operacoes);
  return `OP-${HOJE.getFullYear()}-${String(total + 1).padStart(4, "0")}`;
}

async function garantirContraparte(
  chave: keyof typeof CONTRAPARTES,
  registradoPor: string,
): Promise<string> {
  const c = CONTRAPARTES[chave];
  const [existente] = await db
    .select({ id: construtoras.id })
    .from(construtoras)
    .where(eq(construtoras.cnpj, c.cnpj))
    .limit(1);
  if (existente) return existente.id;

  const [criada] = await db
    .insert(construtoras)
    .values({
      razaoSocial: c.razaoSocial,
      nomeFantasia: c.nomeFantasia,
      cnpj: c.cnpj,
      cidade: c.cidade,
      uf: c.uf,
      endereco: c.endereco,
      registeredByUserId: registradoPor,
      onboardingStatus: "pendente",
      isActive: true,
    })
    .returning({ id: construtoras.id });
  console.log(`  + contraparte criada: ${c.razaoSocial}`);
  return criada.id;
}

async function subirDoc(
  op: OperacaoEntrada,
  operacaoId: string,
  imobiliariaId: string,
  userId: string,
  doc: DocOp,
) {
  const caminho = path.join(DOWNLOADS, doc.arquivo);
  if (!fs.existsSync(caminho)) {
    console.log(`     ⚠ arquivo não encontrado: ${doc.arquivo}`);
    return;
  }
  const buffer = fs.readFileSync(caminho);
  const blob = await put(
    `documentos/operacoes/${op.ref}/${doc.tipo}.pdf`,
    buffer,
    { access: "private", contentType: "application/pdf", addRandomSuffix: false },
  );
  await db.insert(documentos).values({
    tipo: doc.tipo,
    url: blob.url,
    nomeOriginal: doc.arquivo,
    sizeBytes: buffer.byteLength,
    mimeType: "application/pdf",
    userId,
    imobiliariaId,
    operacaoId,
    validacaoStatus: "ok",
    validacaoMotivo: "Contrato enviado pelo dono no cadastro em lote",
  });
  console.log(`     ✓ ${doc.tipo} anexado (${doc.arquivo})`);
}

/* ============================================================
   EXECUÇÃO
   ============================================================ */

async function main() {
  console.log("📄 Cadastro de operações — Imóveis de Primeira\n");

  // Unidades do grupo, por CNPJ
  const unidades = await db
    .select({
      id: imobiliarias.id,
      cnpj: imobiliarias.cnpj,
      apelido: imobiliarias.apelido,
      ownerUserId: imobiliarias.ownerUserId,
    })
    .from(imobiliarias);
  const porCnpj = new Map(unidades.map((u) => [u.cnpj, u]));

  const matriz = porCnpj.get(MATRIZ_CNPJ);
  if (!matriz) throw new Error("Matriz do grupo não encontrada");
  const corretorUserId = matriz.ownerUserId;

  for (const op of OPERACOES) {
    const unidade = porCnpj.get(op.unidadeCnpj);
    if (!unidade) {
      console.log(`\n▸ ${op.ref}: unidade ${op.unidadeCnpj} não cadastrada — pulei`);
      continue;
    }

    // Idempotência pela referência do contrato
    const [jaExiste] = await db
      .select({ numero: operacoes.numero })
      .from(operacoes)
      .where(sql`${operacoes.motivoPendencia} LIKE ${"[" + op.ref + "]%"}`)
      .limit(1);
    if (jaExiste) {
      console.log(`\n▸ ${op.ref}: já cadastrada (${jaExiste.numero})`);
      continue;
    }

    console.log(`\n▸ ${op.ref} — ${unidade.apelido}`);

    const construtoraId = await garantirContraparte(
      op.contraparte,
      corretorUserId,
    );

    // Valor presente: parcela vencida não recebe deságio (clamp em 0 mês).
    // Sem cronograma no contrato, não há como descontar — VP = comissão e
    // deságio 0 até o cliente informar as datas (fica escrito na pendência).
    const vp =
      op.parcelas.length > 0
        ? op.parcelas.reduce(
            (acc, p) => acc + p.valor / Math.pow(1 + TAXA_MENSAL, mesesAte(p.vencimento)),
            0,
          )
        : op.valorComissao;
    const desagio = op.valorComissao - vp;

    const motivo =
      `[${op.ref}] ${op.empreendimento}\n\n` +
      `Operação cadastrada pela Antecipaqui a partir do contrato enviado. ` +
      `Para seguir para análise, falta:\n` +
      op.pendencias.map((p) => `• ${p}`).join("\n");

    const numero = await proximoNumero();
    const [criada] = await db
      .insert(operacoes)
      .values({
        numero,
        corretorUserId,
        imobiliariaId: unidade.id,
        construtoraId,
        valorVenda: op.valorVenda.toFixed(2),
        valorComissao: op.valorComissao.toFixed(2),
        dataVenda: op.dataVenda,
        numeroParcelas: op.parcelas.length,
        taxaMensal: TAXA_MENSAL.toFixed(4),
        valorPresente: vp.toFixed(2),
        desagio: desagio.toFixed(2),
        status: "documentos_incompletos",
        motivoPendencia: motivo,
        pagadorTipo: op.compradores ? "compradores" : "construtora",
      })
      .returning({ id: operacoes.id });

    console.log(
      `     ${numero} · venda ${brl(op.valorVenda)} · comissão ${brl(op.valorComissao)}`,
    );

    if (op.parcelas.length > 0) {
      await db.insert(parcelasComissao).values(
        op.parcelas.map((p, i) => ({
          operacaoId: criada.id,
          numero: i + 1,
          valor: p.valor.toFixed(2),
          vencimento: p.vencimento,
          // Parcela com vencimento no passado entra já como vencida.
          status: (new Date(p.vencimento + "T00:00:00") < HOJE
            ? "vencida"
            : "a_vencer") as "vencida" | "a_vencer",
        })),
      );
      const vencidas = op.parcelas.filter(
        (p) => new Date(p.vencimento + "T00:00:00") < HOJE,
      ).length;
      console.log(
        `     ${op.parcelas.length} parcela(s)${vencidas ? ` · ${vencidas} já vencida(s)` : ""} · VP ${brl(vp)}`,
      );
    } else {
      console.log("     sem cronograma no contrato — VP = comissão, deságio 0");
    }

    if (op.compradores) {
      await db.insert(operacaoCompradores).values(
        op.compradores.map((c, i) => ({
          operacaoId: criada.id,
          ordem: i + 1,
          tipoPessoa: c.tipoPessoa,
          nome: c.nome,
          documento: c.documento,
          telefone: c.telefone,
          email: c.email,
        })),
      );
      console.log(`     ${op.compradores.length} comprador(es) como pagadores`);
    }

    for (const doc of op.documentos) {
      await subirDoc(op, criada.id, unidade.id, corretorUserId, doc);
    }
  }

  /* ---- Resumo ---- */
  const resumo = await db.execute(sql`
    SELECT o.numero, o.status, o.valor_venda, o.valor_comissao, o.numero_parcelas,
           COALESCE(i.apelido, i.razao_social) AS unidade,
           c.razao_social AS contraparte
    FROM operacoes o
    LEFT JOIN imobiliarias i ON i.id = o.imobiliaria_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    ORDER BY o.numero
  `);
  type Row = Record<string, string | number>;
  const rows = (
    Array.isArray(resumo) ? resumo : ((resumo as unknown as { rows: Row[] }).rows ?? [])
  ) as Row[];

  console.log(`\n📋 Operações no cadastro: ${rows.length}`);
  for (const r of rows) {
    console.log(
      `   ${r.numero} · ${r.unidade} → ${r.contraparte} · venda ${brl(Number(r.valor_venda))} · comissão ${brl(Number(r.valor_comissao))} · ${r.numero_parcelas}x · ${r.status}`,
    );
  }
  console.log("\n✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e);
    process.exit(1);
  });
