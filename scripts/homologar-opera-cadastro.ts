/**
 * HOMOLOGAÇÃO OPERA — cadastro de cliente de ponta a ponta, em PRODUÇÃO.
 *
 * Cria uma imobiliária DE TESTE (nome grita "homologação", CNPJ fictício com
 * dígitos válidos), sobe os 3 documentos obrigatórios como PDFs de teste no
 * Blob, espelha em opera_clientes e roda a esteira real:
 *
 *   consultar_cliente → (não existe) → cadastrar_cliente → protocolo/ID
 *
 * Usa os MESMOS agentes de produção (src/lib/opera/agentes.ts) e a mesma
 * disciplina da fila — mas processa SOMENTE os jobs deste cliente, pra não
 * encostar em mais nada do banco de produção.
 *
 * Idempotente: rodar de novo reaproveita user/imobiliária/docs existentes.
 *
 *   npx tsx scripts/homologar-opera-cadastro.ts
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
const USER_ID = "user_homolog_opera_teste";
const EMAIL = "homologacao@antecipaqui.digital";

/** CNPJ fictício com dígitos verificadores corretos (mod-11 oficial). */
function cnpjTeste(): string {
  const base = "45989123" + "0001"; // raiz inventada + filial 0001
  const dv = (nums: string, pesos: number[]) => {
    const soma = nums
      .split("")
      .reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = dv(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = dv(base + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return base + String(d1) + String(d2);
}

/** PDF mínimo válido, uma página, com o texto avisando que é teste. */
function pdfTeste(titulo: string): Buffer {
  const linhas = [
    "DOCUMENTO DE TESTE - NAO POSSUI VALOR LEGAL",
    `Tipo: ${titulo}`,
    "Homologacao da integracao ANTECIPAQUI x OPERA CAPITAL (OperAPI)",
    "Cliente ficticio: IMOBILIARIA TESTE HOMOLOGACAO ANTECIPAQUI LTDA",
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

async function main() {
  const { put } = await import("@vercel/blob");
  const { and, eq, inArray, isNull, lte, or } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { users, imobiliarias, documentos, operaClientes, operaJobs } =
    await import("../src/db/schema");
  const { consultarCliente, cadastrarCliente } = await import(
    "../src/lib/opera/agentes"
  );
  const { enfileirarJob, concluirJob, falharJob, bloquearJob } = await import(
    "../src/lib/opera/fila"
  );

  const cnpj = cnpjTeste();
  console.log(`CNPJ de teste: ${cnpj}`);

  /* 1 · Dono (user sintético, sem Clerk — só a ficha precisa dele) */
  await db
    .insert(users)
    .values({
      id: USER_ID,
      email: EMAIL,
      nome: "Homologacao Antecipaqui",
      telefone: "47999990000",
    })
    .onConflictDoNothing();

  /* 2 · Imobiliária de teste (upsert por CNPJ) */
  let [imob] = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.cnpj, cnpj))
    .limit(1);
  if (!imob) {
    [imob] = await db
      .insert(imobiliarias)
      .values({
        ownerUserId: USER_ID,
        razaoSocial: "IMOBILIARIA TESTE HOMOLOGACAO ANTECIPAQUI LTDA",
        nomeFantasia: "TESTE HOMOLOGACAO ANTECIPAQUI",
        cnpj,
        telefone: "47999990000",
        cep: "88330000",
        endereco: "Rua da Homologacao, 100 - Centro",
        cidade: "Balneario Camboriu",
        uf: "SC",
      })
      .returning();
  }
  console.log(`Imobiliária: ${imob.razaoSocial} (${imob.id})`);

  /* 3 · Documentos obrigatórios — PDFs de teste no Blob */
  const TIPOS = ["contrato_social", "cartao_cnpj", "comprovante_endereco"] as const;
  const existentes = await db
    .select({ tipo: documentos.tipo })
    .from(documentos)
    .where(eq(documentos.imobiliariaId, imob.id));
  const jaTem = new Set(existentes.map((d) => d.tipo));
  for (const tipo of TIPOS) {
    if (jaTem.has(tipo)) continue;
    const pdf = pdfTeste(tipo.replace(/_/g, " ").toUpperCase());
    const blob = await put(`homologacao-opera/${tipo}.pdf`, pdf, {
      access: "private",
      addRandomSuffix: true,
      contentType: "application/pdf",
    });
    await db.insert(documentos).values({
      tipo,
      url: blob.url,
      nomeOriginal: `${tipo}-teste-homologacao.pdf`,
      sizeBytes: pdf.length,
      mimeType: "application/pdf",
      imobiliariaId: imob.id,
    });
    console.log(`Documento ${tipo}: ${blob.url}`);
  }

  /* 4 · Espelho cadastral no fundo (opera_clientes) */
  let [cliente] = await db
    .select()
    .from(operaClientes)
    .where(
      and(
        eq(operaClientes.fundoId, FUNDO_PROD),
        eq(operaClientes.entidadeTipo, "imobiliaria"),
        eq(operaClientes.entidadeId, imob.id),
      ),
    )
    .limit(1);
  if (!cliente) {
    [cliente] = await db
      .insert(operaClientes)
      .values({
        fundoId: FUNDO_PROD,
        entidadeTipo: "imobiliaria",
        entidadeId: imob.id,
        cnpj,
        situacao: "nao_consultado",
      })
      .returning();
  }
  console.log(`opera_clientes: ${cliente.id} (situação: ${cliente.situacao})`);

  /* 5 · Enfileira a peça 01 e roda a esteira — SÓ os jobs deste cliente.
   *     Job bloqueado/desistido de rodada anterior volta pra fila: cada
   *     execução do script é uma nova tentativa de homologação. */
  await db
    .update(operaJobs)
    .set({
      status: "pendente",
      ultimoErro: null,
      proximaTentativaEm: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(operaJobs.refId, cliente.id),
        inArray(operaJobs.status, ["bloqueado", "desistido"]),
      ),
    );
  await enfileirarJob({
    fundoId: FUNDO_PROD,
    tipo: "consultar_cliente",
    refTipo: "opera_cliente",
    refId: cliente.id,
    operacaoId: null,
  });

  for (let rodada = 1; rodada <= 4; rodada++) {
    // Mesmo filtro do motor de produção: job que falhou espera o backoff
    // (proximaTentativaEm). Sem isso o loop metralha a API do fundo com o
    // mesmo envio em segundos — foi o que a OPERA viu em 01/09.
    const pendentes = await db
      .select()
      .from(operaJobs)
      .where(
        and(
          eq(operaJobs.refId, cliente.id),
          inArray(operaJobs.status, ["pendente"]),
          or(
            isNull(operaJobs.proximaTentativaEm),
            lte(operaJobs.proximaTentativaEm, new Date()),
          ),
        ),
      );
    if (pendentes.length === 0) break;

    for (const job of pendentes) {
      // Mesma trava otimista do motor de produção.
      const travados = await db
        .update(operaJobs)
        .set({ status: "processando", updatedAt: new Date() })
        .where(and(eq(operaJobs.id, job.id), eq(operaJobs.status, "pendente")))
        .returning({ id: operaJobs.id });
      if (travados.length === 0) continue;

      console.log(`\n→ executando job ${job.tipo} (${job.id.slice(0, 8)})…`);
      const r =
        job.tipo === "consultar_cliente"
          ? await consultarCliente(job.refId)
          : job.tipo === "cadastrar_cliente"
            ? await cadastrarCliente(job.refId)
            : ({ tipo: "bloqueado", motivo: `tipo inesperado: ${job.tipo}` } as const);

      if (r.tipo === "ok") {
        await concluirJob(job.id, r.resultado);
        console.log(`  OK: ${JSON.stringify(r.resultado)}`);
      } else if (r.tipo === "bloqueado") {
        await bloquearJob(job.id, r.motivo);
        console.log(`  BLOQUEADO: ${r.motivo}`);
      } else {
        await falharJob(job.id, job.tentativas, r.erro);
        console.log(`  FALHA (vai retentar): ${r.erro}`);
      }
    }
  }

  /* 6 · Resultado final — a prova pra OPERA conferir */
  const [final] = await db
    .select()
    .from(operaClientes)
    .where(eq(operaClientes.id, cliente.id))
    .limit(1);
  console.log("\n═══ RESULTADO ═══");
  console.log(
    JSON.stringify(
      {
        cnpj: final.cnpj,
        situacao: final.situacao,
        protocolo: final.protocolo,
        externoId: final.externoId,
        motivo: final.motivo,
        consultadoEm: final.consultadoEm,
        enviadoEm: final.enviadoEm,
        ultimaResposta: final.ultimaResposta,
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
