/**
 * SONDA DE HOMOLOGAÇÃO — criar-cliente na OperAPI com o payload no MESMO
 * formato do agente de produção (src/lib/opera/agentes.ts), para o cliente
 * de TESTE criado por homologar-opera-cadastro.ts.
 *
 * Única diferença do envio real: faturamentoEstimado é fixture ("600000.00"),
 * porque o cliente fictício não tem operações pra somar — em produção o
 * valor sai das comissões dos últimos 12 meses.
 *
 *   npx tsx scripts/probe-opera-criar-cliente.ts [--sem-docs] [--sem-representantes] [--sem-opcionais]
 */
import { config } from "dotenv";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL ausente");
process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
  "/neondb?",
  "/antecipaqui_prod?",
);

const CNPJ_TESTE = "45989123000135";
const FATURAMENTO_FIXTURE = 600000; // numérico, em reais (spec OPERA 01/09)

async function main() {
  const { get } = await import("@vercel/blob");
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db");
  const { fundos, imobiliarias, documentos, users } = await import(
    "../src/db/schema"
  );
  const { montarZip } = await import("../src/lib/opera/zip");

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.integracaoTipo, "opera"))
    .limit(1);
  if (!fundo?.integracaoApiUrl) throw new Error("fundo opera sem URL");
  const cred = fundo.integracaoCredenciais as { usuario: string; senha: string };
  const envio = (fundo.integracaoContrato as { envio: { parceiro: string } })
    .envio;

  const [imob] = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.cnpj, CNPJ_TESTE))
    .limit(1);
  if (!imob) throw new Error("imobiliária de teste não existe — rode homologar-opera-cadastro.ts antes");
  const [dono] = await db
    .select()
    .from(users)
    .where(eq(users.id, imob.ownerUserId))
    .limit(1);
  const docs = await db
    .select()
    .from(documentos)
    .where(eq(documentos.imobiliariaId, imob.id));

  // ZIP dos documentos — mesmo formato do agente (doc_outros base64).
  const arquivos: { nome: string; conteudo: Buffer }[] = [];
  for (const d of docs) {
    const r = await get(d.url, { access: "private" });
    if (!r?.stream) throw new Error(`doc ${d.tipo} sumiu do storage`);
    arquivos.push({
      nome: `${d.tipo}-${d.nomeOriginal}`,
      conteudo: Buffer.from(
        await new Response(r.stream as ReadableStream).arrayBuffer(),
      ),
    });
  }

  const semDocs = process.argv.includes("--sem-docs");
  const semRepresentantes = process.argv.includes("--sem-representantes");
  const semOpcionais = process.argv.includes("--sem-opcionais");

  // Ficha idêntica à do agente (montarFichaCadastral), no formato da spec
  // que a OPERA passou em 01/09: CNPJ com máscara, numero string em campo
  // próprio, faturamento numérico, função do responsável e telefone do
  // representante obrigatórios.
  const payload: Record<string, unknown> = {
    cnpj: "45.989.123/0001-35",
    parceiro: envio.parceiro,
    razaoSocial: imob.razaoSocial,
    nomeFantasia: imob.nomeFantasia,
    endereco: "Rua da Homologacao",
    complemento: "",
    numero: "100",
    bairro: "Centro",
    cidade: imob.cidade,
    region: imob.uf,
    cep: "88330-000",
    dadosFinanceiros: { faturamentoEstimado: FATURAMENTO_FIXTURE },
    relato_consultoria:
      "Imobiliária parceira da Antecipaqui (antecipação de comissões " +
      "imobiliárias). CADASTRO DE TESTE da homologação da integração — " +
      "conferir recebimento e desconsiderar para análise.",
    funcao_responsavel_operacional: "Diretor",
    nome_responsavel_operacional: dono?.nome ?? null,
    email_responsavel_operacional: dono?.email ?? null,
    representantes: [
      {
        participacao: "1",
        telefone: "47999990000",
        nome: dono?.nome,
        email: dono?.email,
        celular: "47999990000",
        ...(process.argv.includes("--rep-cpf")
          ? { cpf: "52998224725" }
          : {}),
      },
    ],
    documentos: {
      doc_outros: [
        { outros_documentos: montarZip(arquivos).toString("base64") },
      ],
    },
  };

  if (process.argv.includes("--cep-sp")) {
    // Endereço 100% real e resolvível (Av. Paulista) — testa a hipótese de o
    // insert deles resolver cidade/UF pelo CEP.
    payload.endereco = "Avenida Paulista, 1000";
    payload.bairro = "Bela Vista";
    payload.cidade = "Sao Paulo";
    payload.region = "SP";
    payload.cep = "01310-100";
  }
  if (process.argv.includes("--sem-celular")) {
    const reps = payload.representantes as Record<string, unknown>[] | undefined;
    if (reps) for (const r of reps) delete r.celular;
  }
  if (process.argv.includes("--rep-minimo")) {
    const dono2 = dono;
    payload.representantes = [{ participacao: "1", nome: dono2?.nome }];
  }
  const iCnpj = process.argv.indexOf("--cnpj");
  if (iCnpj !== -1 && process.argv[iCnpj + 1]) {
    // CNPJ real (ex.: o da própria Antecipaqui) — testa a hipótese de o
    // backend deles enriquecer pela Receita e quebrar com CNPJ fictício.
    payload.cnpj = process.argv[iCnpj + 1];
  }
  if (process.argv.includes("--ascii")) {
    // Sem acento e sem travessão — testa a hipótese de encoding no insert.
    payload.relato_consultoria =
      "Imobiliaria parceira da Antecipaqui (antecipacao de comissoes " +
      "imobiliarias). CADASTRO DE TESTE da homologacao da integracao - " +
      "conferir recebimento e desconsiderar para analise.";
  }
  if (process.argv.includes("--part-2")) {
    const reps = payload.representantes as Record<string, unknown>[];
    for (const r of reps) r.participacao = "2";
  }
  if (semDocs) delete payload.documentos;
  if (semRepresentantes) delete payload.representantes;
  if (semOpcionais) {
    delete payload.nomeFantasia;
    delete payload.nome_responsavel_operacional;
    delete payload.email_responsavel_operacional;
  }
  console.log(
    "variante:",
    JSON.stringify({ semDocs, semRepresentantes, semOpcionais }),
  );

  if (process.argv.includes("--dry-run")) {
    // Imprime o payload sem enviar — o ZIP base64 vira um resumo legível.
    const docs2 = payload.documentos as
      | { doc_outros: { outros_documentos: string }[] }
      | undefined;
    const impressao = {
      ...payload,
      ...(docs2
        ? {
            documentos: {
              doc_outros: docs2.doc_outros.map((o) => ({
                outros_documentos: `<ZIP base64, ${o.outros_documentos.length} chars — ${arquivos.map((a) => a.nome).join(", ")}>`,
              })),
            },
          }
        : {}),
    };
    console.log(JSON.stringify(impressao, null, 2));
    return;
  }

  const base = fundo.integracaoApiUrl.replace(/\/+$/, "");
  const auth = await fetch(`${base}/operapi/autenticacao/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cred.usuario, password: cred.senha }),
  });
  if (!auth.ok) throw new Error(`auth HTTP ${auth.status}`);
  const { access } = (await auth.json()) as { access: string };

  const res = await fetch(`${base}/operapi/criar-cliente/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${access}`,
      "user-agent": "Antecipaqui/1.0 (homologacao)",
    },
    body: JSON.stringify(payload),
  });
  const corpo = await res.text();
  console.log(`HTTP ${res.status}`);
  console.log(corpo.slice(0, 2000));
}

main().then(() => process.exit(0), (e) => { console.error("erro:", (e as Error).message); process.exit(1); });
