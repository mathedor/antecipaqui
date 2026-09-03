/**
 * HOMOLOGAÇÃO OPERA — CICLO COMPLETO com um cliente NOVO, em PRODUÇÃO.
 *
 * Diferente de `homologar-opera-cadastro.ts` (que só exercita o cadastro de
 * uma imobiliária solta), este script monta a fixture inteira que a esteira
 * real precisa e entra pela MESMA porta da produção:
 *
 *   imobiliária + documentos + construtora + operação com parcelas
 *     → iniciarIntegracaoDaOperacao()            (o gatilho de "análise final")
 *       → peça 01 consultar_cliente
 *         → peça 02 cadastrar_cliente            (manda a ficha + ZIP de docs)
 *           → peça 03 webhook de cadastro        (chega do lado da OPERA)
 *             → peça 04 enviar_operacao          (destravada pela aprovação)
 *
 * A operação existe porque o cadastro depende dela: o `faturamentoEstimado`
 * que a OperAPI exige é a soma das comissões dos últimos 12 meses. Em
 * produção é sempre assim — a imobiliária só é apresentada ao fundo quando
 * tem uma operação pra antecipar.
 *
 * Cada `--seq` é um cliente de teste distinto (CNPJ próprio), então dá pra
 * repetir a homologação quantas vezes a OPERA pedir sem esbarrar em
 * "cnpj already taken".
 *
 *   npx tsx scripts/homologar-opera-ciclo.ts --seq 2
 *   npx tsx scripts/homologar-opera-ciclo.ts --seq 2 --sincronizar
 *   npx tsx scripts/homologar-opera-ciclo.ts --seq 2 --status   (só lê)
 *   npx tsx scripts/homologar-opera-ciclo.ts --seq 2 --reset    (zera o espelho)
 */
import { config } from "dotenv";

config({ path: ".env.local" });

// PRODUÇÃO: mesmo endpoint Neon, só troca o nome do banco — tem que acontecer
// ANTES de importar src/db (a conexão nasce no import).
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  "/neondb?",
  "/antecipaqui_prod?",
);
if (!process.env.DATABASE_URL.includes("antecipaqui_prod")) {
  throw new Error("Não consegui derivar o banco de produção do DATABASE_URL");
}

const FUNDO_PROD = "e2a49b7e-0ea0-46c3-8b6f-1bdd0da4b953"; // Opera Capital

const argSeq = process.argv.indexOf("--seq");
const SEQ = argSeq !== -1 ? Number(process.argv[argSeq + 1]) : 2;
if (!Number.isInteger(SEQ) || SEQ < 2 || SEQ > 89) {
  throw new Error("--seq precisa ser um inteiro entre 2 e 89");
}
const SO_STATUS = process.argv.includes("--status");
const RESET = process.argv.includes("--reset");
/** Reconsulta o cadastro no fundo e reprocessa a esteira deste cliente —
 *  é como acompanhar a fila interna da OPERA sem esperar o cron. */
const SINCRONIZAR = process.argv.includes("--sincronizar");

const S = String(SEQ).padStart(2, "0");
const USER_ID = `user_homolog_opera_${S}`;
const EMAIL = `homologacao${S}@antecipaqui.digital`;
const NUMERO_OP = `OP-HOMOLOG-${String(SEQ).padStart(4, "0")}`;

/** CNPJ fictício com dígitos verificadores corretos (mod-11 oficial). */
function cnpjFicticio(base12: string): string {
  const dv = (nums: string, pesos: number[]) =>
    ((r) => (r < 2 ? 0 : 11 - r))(
      nums.split("").reduce((a, d, i) => a + Number(d) * pesos[i], 0) % 11,
    );
  const d1 = dv(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv(base12 + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base12 + String(d1) + String(d2);
}

const CNPJ_IMOB = cnpjFicticio(`${45989200 + SEQ}0001`);
const CNPJ_CONSTRUTORA = cnpjFicticio(`${45989300 + SEQ}0001`);

/** PDF mínimo válido, uma página, avisando em letras garrafais que é teste. */
function pdfTeste(titulo: string): Buffer {
  const linhas = [
    "DOCUMENTO DE TESTE - NAO POSSUI VALOR LEGAL",
    `Tipo: ${titulo}`,
    "Homologacao da integracao ANTECIPAQUI x OPERA CAPITAL (OperAPI)",
    `Cliente ficticio: IMOBILIARIA TESTE HOMOLOGACAO ${S} ANTECIPAQUI LTDA`,
    "Pode ser descartado apos a conferencia do recebimento.",
  ];
  const conteudo = linhas
    .map((l, i) => `BT /F1 11 Tf 50 ${760 - i * 22} Td (${l}) Tj ET`)
    .join("\n");
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
  ];
  let corpo = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((obj, i) => {
    offsets.push(corpo.length);
    corpo += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = corpo.length;
  corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets)
    corpo += `${String(off).padStart(10, "0")} 00000 n \n`;
  corpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(corpo, "latin1");
}

function emDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const { put } = await import("@vercel/blob");
  const { and, eq, inArray, isNull, lte, or } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const {
    users,
    imobiliarias,
    construtoras,
    documentos,
    operacoes,
    parcelasComissao,
    fundos,
    operaClientes,
    operaOperacoes,
    operaJobs,
  } = await import("../src/db/schema");
  const { consultarCliente, cadastrarCliente, enviarOperacao, iniciarIntegracaoDaOperacao } =
    await import("../src/lib/opera/agentes");
  const { concluirJob, falharJob, bloquearJob } = await import(
    "../src/lib/opera/fila"
  );

  console.log(`═══ HOMOLOGAÇÃO OPERA · cliente de teste #${S} ═══`);
  console.log(`CNPJ imobiliária (cedente): ${CNPJ_IMOB}`);
  console.log(`CNPJ construtora (sacado):  ${CNPJ_CONSTRUTORA}`);
  console.log(`Operação:                   ${NUMERO_OP}\n`);

  /* ── modo leitura / reset ─────────────────────────────────────── */
  if (SO_STATUS || RESET) {
    const [esp] = await db
      .select()
      .from(operaClientes)
      .where(eq(operaClientes.cnpj, CNPJ_IMOB))
      .limit(1);
    if (!esp) {
      console.log("Nenhum espelho com esse CNPJ — rode sem --status/--reset.");
      return;
    }
    if (RESET) {
      await db
        .update(operaJobs)
        .set({
          status: "concluido",
          ultimoErro: null,
          proximaTentativaEm: null,
          concluidoEm: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(operaJobs.refId, esp.id),
            inArray(operaJobs.status, [
              "pendente",
              "processando",
              "bloqueado",
              "desistido",
            ]),
          ),
        );
      await db
        .update(operaClientes)
        .set({
          situacao: "nao_consultado",
          externoId: null,
          protocolo: null,
          motivo: null,
          consultadoEm: null,
          enviadoEm: null,
          respondidoEm: null,
          ultimaResposta: null,
          updatedAt: new Date(),
        })
        .where(eq(operaClientes.id, esp.id));
      console.log("Espelho resetado e jobs vivos encerrados.");
      return;
    }
    console.log(JSON.stringify(esp, null, 2));
    const jobs = await db
      .select()
      .from(operaJobs)
      .where(eq(operaJobs.refId, esp.id));
    console.log(JSON.stringify(jobs, null, 2));
    return;
  }

  /* 1 · Dono (user sintético; a ficha do cedente sai dele).
   *     SEM telefone de propósito: número inventado é número de alguém, e
   *     um status urgente do fundo dispara SMS/WhatsApp pro cadastro. O
   *     telefone da ficha que vai pra OPERA sai da imobiliária. */
  await db
    .insert(users)
    .values({
      id: USER_ID,
      email: EMAIL,
      nome: `Homologacao Antecipaqui ${S}`,
    })
    .onConflictDoNothing();

  /* 2 · Imobiliária de teste — o CEDENTE */
  let [imob] = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.cnpj, CNPJ_IMOB))
    .limit(1);
  if (!imob) {
    [imob] = await db
      .insert(imobiliarias)
      .values({
        ownerUserId: USER_ID,
        razaoSocial: `IMOBILIARIA TESTE HOMOLOGACAO ${S} ANTECIPAQUI LTDA`,
        nomeFantasia: `TESTE HOMOLOGACAO ${S} ANTECIPAQUI`,
        cnpj: CNPJ_IMOB,
        telefone: "47999990000",
        cep: "88330000",
        endereco: `Rua da Homologacao, ${SEQ * 100} - Centro`,
        cidade: "Balneario Camboriu",
        uf: "SC",
      })
      .returning();
  }
  console.log(`Imobiliária: ${imob.razaoSocial} (${imob.id})`);

  /* 3 · Documentos obrigatórios do cedente (PDFs de teste no Blob) */
  const TIPOS = ["contrato_social", "cartao_cnpj", "comprovante_endereco"] as const;
  const jaTem = new Set(
    (
      await db
        .select({ tipo: documentos.tipo })
        .from(documentos)
        .where(eq(documentos.imobiliariaId, imob.id))
    ).map((d) => d.tipo),
  );
  for (const tipo of TIPOS) {
    if (jaTem.has(tipo)) continue;
    const pdf = pdfTeste(tipo.replace(/_/g, " ").toUpperCase());
    const blob = await put(`homologacao-opera/${S}/${tipo}.pdf`, pdf, {
      access: "private",
      addRandomSuffix: true,
      contentType: "application/pdf",
    });
    await db.insert(documentos).values({
      tipo,
      url: blob.url,
      nomeOriginal: `${tipo}-teste-homologacao-${S}.pdf`,
      sizeBytes: pdf.length,
      mimeType: "application/pdf",
      imobiliariaId: imob.id,
    });
    console.log(`  documento ${tipo}: ok`);
  }

  /* 4 · Construtora de teste — o SACADO dos títulos (a OPERA não a cadastra:
   *     ela vai inline em cada título do envio da operação). */
  let [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.cnpj, CNPJ_CONSTRUTORA))
    .limit(1);
  if (!construtora) {
    [construtora] = await db
      .insert(construtoras)
      .values({
        razaoSocial: `CONSTRUTORA TESTE HOMOLOGACAO ${S} ANTECIPAQUI LTDA`,
        nomeFantasia: `CONSTRUTORA TESTE ${S}`,
        cnpj: CNPJ_CONSTRUTORA,
        telefone: "4733330000",
        email: EMAIL,
        cep: "88330000",
        endereco: "Avenida da Homologacao, 500 - Centro",
        cidade: "Balneario Camboriu",
        uf: "SC",
      })
      .returning();
  }
  console.log(`Construtora: ${construtora.razaoSocial} (${construtora.id})`);

  /* 5 · Operação de teste com 3 parcelas — é ela que dá lastro ao
   *     faturamentoEstimado do cadastro e vira os títulos da peça 04. */
  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, FUNDO_PROD))
    .limit(1);
  if (!fundo) throw new Error("Fundo Opera não encontrado em produção");

  let [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.numero, NUMERO_OP))
    .limit(1);
  if (!op) {
    const VALOR_VENDA = 600000;
    const VALOR_COMISSAO = 18000;
    const N = 3;
    const parcela = VALOR_COMISSAO / N;
    const taxaCliente = 0.06;
    const vp = Array.from({ length: N }, (_, i) => i + 1).reduce(
      (acc, n) => acc + parcela / Math.pow(1 + taxaCliente, n),
      0,
    );
    [op] = await db
      .insert(operacoes)
      .values({
        numero: NUMERO_OP,
        corretorUserId: USER_ID,
        imobiliariaId: imob.id,
        construtoraId: construtora.id,
        fundoId: FUNDO_PROD,
        valorVenda: VALOR_VENDA.toFixed(2),
        valorComissao: VALOR_COMISSAO.toFixed(2),
        dataVenda: emDias(0),
        numeroParcelas: N,
        taxaMensal: taxaCliente.toFixed(4),
        taxaFundoSnapshot: String(fundo.taxaMensalBase),
        valorPresente: vp.toFixed(2),
        desagio: (VALOR_COMISSAO - vp).toFixed(2),
        // É o estado em que a produção dispara a integração (status-flow).
        status: "analise_final",
        pagadorTipo: "construtora",
      })
      .returning();
    await db.insert(parcelasComissao).values(
      Array.from({ length: N }, (_, i) => ({
        operacaoId: op.id,
        numero: i + 1,
        valor: parcela.toFixed(2),
        vencimento: emDias(30 * (i + 1)),
        status: "a_vencer" as const,
      })),
    );
  }
  console.log(
    `Operação: ${op.numero} (${op.id}) — R$ ${op.valorComissao} em ${op.numeroParcelas}x\n`,
  );

  /* 6 · Porta de entrada REAL da integração */
  if (SINCRONIZAR) {
    const [espelho] = await db
      .select({ id: operaClientes.id })
      .from(operaClientes)
      .where(eq(operaClientes.cnpj, CNPJ_IMOB))
      .limit(1);
    if (!espelho) throw new Error("espelho do cedente não existe — rode sem --sincronizar");
    const { enfileirarJob } = await import("../src/lib/opera/fila");
    const r = await enfileirarJob({
      fundoId: FUNDO_PROD,
      tipo: "consultar_cliente",
      refTipo: "opera_cliente",
      refId: espelho.id,
      operacaoId: op.id,
      forcar: true,
    });
    console.log(`consulta de sincronização enfileirada (${r.jobId.slice(0, 8)})\n`);
  } else {
    const inicio = await iniciarIntegracaoDaOperacao(op.id);
    console.log(`iniciarIntegracaoDaOperacao → ${JSON.stringify(inicio)}\n`);
  }

  /* 7 · Roda a esteira — só os jobs desta operação/cliente, com o mesmo
   *     filtro de backoff do motor de produção (nada de metralhar a API). */
  const espelhos = await db
    .select({ id: operaClientes.id })
    .from(operaClientes)
    .where(
      and(
        eq(operaClientes.fundoId, FUNDO_PROD),
        inArray(operaClientes.entidadeId, [imob.id, construtora.id]),
      ),
    );
  const refs = [...espelhos.map((e) => e.id), op.id];

  for (let rodada = 1; rodada <= 5; rodada++) {
    const pendentes = await db
      .select()
      .from(operaJobs)
      .where(
        and(
          inArray(operaJobs.refId, refs),
          eq(operaJobs.status, "pendente"),
          or(
            isNull(operaJobs.proximaTentativaEm),
            lte(operaJobs.proximaTentativaEm, new Date()),
          ),
        ),
      );
    if (pendentes.length === 0) break;

    for (const job of pendentes) {
      const travados = await db
        .update(operaJobs)
        .set({ status: "processando", updatedAt: new Date() })
        .where(and(eq(operaJobs.id, job.id), eq(operaJobs.status, "pendente")))
        .returning({ id: operaJobs.id });
      if (travados.length === 0) continue;

      console.log(`→ ${job.tipo} (${job.id.slice(0, 8)})…`);
      const r =
        job.tipo === "consultar_cliente"
          ? await consultarCliente(job.refId)
          : job.tipo === "cadastrar_cliente"
            ? await cadastrarCliente(job.refId)
            : job.tipo === "enviar_operacao"
              ? await enviarOperacao(job.refId)
              : ({ tipo: "bloqueado", motivo: `tipo inesperado: ${job.tipo}` } as const);

      if (r.tipo === "ok") {
        await concluirJob(job.id, r.resultado);
        console.log(`  OK: ${JSON.stringify(r.resultado)}`);
      } else if (r.tipo === "bloqueado") {
        await bloquearJob(job.id, r.motivo);
        console.log(`  BLOQUEADO: ${r.motivo}`);
      } else {
        await falharJob(job.id, job.tentativas, r.erro);
        console.log(`  FALHA (retenta com backoff): ${r.erro}`);
      }
    }
  }

  /* 8 · Resultado — a prova pra conferir com a OPERA */
  const [cliente] = await db
    .select()
    .from(operaClientes)
    .where(eq(operaClientes.cnpj, CNPJ_IMOB))
    .limit(1);
  const [espelhoOp] = await db
    .select()
    .from(operaOperacoes)
    .where(eq(operaOperacoes.operacaoId, op.id))
    .limit(1);

  console.log("\n═══ RESULTADO ═══");
  console.log(
    JSON.stringify(
      {
        cedente: cliente && {
          cnpj: cliente.cnpj,
          situacao: cliente.situacao,
          protocolo: cliente.protocolo,
          externoId: cliente.externoId,
          motivo: cliente.motivo,
          consultadoEm: cliente.consultadoEm,
          enviadoEm: cliente.enviadoEm,
          ultimaResposta: cliente.ultimaResposta,
        },
        operacao: espelhoOp
          ? {
              numero: op.numero,
              externoId: espelhoOp.externoId,
              protocolo: espelhoOp.protocolo,
              enviadaEm: espelhoOp.enviadaEm,
              ultimaResposta: espelhoOp.ultimaResposta,
            }
          : `ainda não enviada (${NUMERO_OP} espera o cadastro do cedente ser aprovado)`,
      },
      null,
      2,
    ),
  );
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error("erro:", (e as Error).message);
    process.exit(1);
  },
);
