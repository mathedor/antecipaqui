/**
 * AGENTES DE ENVIO — as três peças em que NÓS batemos na porta do fundo.
 *
 *   01 · consultarCliente  — esse CNPJ já existe na base?
 *   02 · cadastrarCliente  — não existe: manda a ficha e os documentos
 *   04 · enviarOperacao    — cadastros aprovados: manda a operação inteira
 *
 * Cada agente é executado pela fila (lib/opera/motor.ts) e devolve um
 * resultado; quem decide retentar, bloquear ou desistir é a fila.
 */
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  documentos,
  fundos,
  imobiliarias,
  operacaoCompradores,
  operacoes,
  operaClientes,
  operaJobs,
  operaOperacoes,
  parcelasComissao,
  users,
  type Fundo,
  type OperaCliente,
} from "@/db/schema";
import { get as blobGet } from "@vercel/blob";
import {
  contratoDoFundo,
  operaFetch,
  registrarSaude,
} from "@/lib/opera/client";
import {
  ler,
  lerFlag,
  lerTexto,
  normalizarStatus,
  type OperaContrato,
} from "@/lib/opera/contrato";
import { buscarCep } from "@/lib/cep";
import { enfileirarJob } from "@/lib/opera/fila";
import { montarZip } from "@/lib/opera/zip";

export type ResultadoAgente =
  | { tipo: "ok"; resultado: Record<string, unknown> }
  | { tipo: "retentar"; erro: string }
  | { tipo: "bloqueado"; motivo: string };

function soDigitos(v: string | null | undefined): string {
  return String(v ?? "").replace(/\D/g, "");
}

/** A OperAPI valida o CEP no formato com traço: "88330-000". */
function formatarCep(v: string | null | undefined): string | null {
  const d = soDigitos(v);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : null;
}

/** No criar-cliente o CNPJ vai COM máscara ("45.989.123/0001-35") — spec
 *  passada pela OPERA em 01/09. A consulta continua com dígitos puros. */
function formatarCnpj(v: string | null | undefined): string | null {
  const d = soDigitos(v);
  if (d.length !== 14) return d || null;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** A OperAPI quer o número do imóvel em campo próprio (string, obrigatório).
 *  Extrai o número do fim do logradouro ("Rua X, 100" → "100"); endereço sem
 *  número declarado vai como "S/N". */
function separarNumero(logradouro: string | null): {
  rua: string | null;
  numero: string;
} {
  const t = (logradouro ?? "").trim();
  const m = t.match(/^(.*?),?\s*(?:n[ºo°.]?\s*)?(\d+[a-zA-Z]?)$/);
  if (m?.[1]) return { rua: m[1].replace(/,\s*$/, "").trim(), numero: m[2] };
  return { rua: t || null, numero: "S/N" };
}

/** Nosso endereço é linha única ("Rua X, 100 - Centro"); a OperAPI exige o
 *  bairro em campo próprio. O trecho depois do último " - " é tratado como
 *  bairro — a menos que contenha número (aí é complemento, não bairro). */
function separarEndereco(linha: string | null | undefined): {
  logradouro: string | null;
  bairro: string | null;
} {
  const t = (linha ?? "").trim();
  if (!t) return { logradouro: null, bairro: null };
  const i = t.lastIndexOf(" - ");
  if (i === -1) return { logradouro: t, bairro: null };
  const cauda = t.slice(i + 3).trim();
  if (!cauda || /\d/.test(cauda)) return { logradouro: t, bairro: null };
  return { logradouro: t.slice(0, i).trim(), bairro: cauda };
}

/** Bairro que não veio no endereço sai do ViaCEP — falha vira null e a
 *  validação do fundo decide (o 422 volta por extenso pro admin). */
async function resolverBairro(
  endereco: string | null | undefined,
  cep: string | null | undefined,
): Promise<{ logradouro: string | null; bairro: string | null }> {
  const partes = separarEndereco(endereco);
  if (partes.bairro) return partes;
  const viaCep = await buscarCep(cep ?? "").catch(() => null);
  return { logradouro: partes.logradouro, bairro: viaCep?.bairro || null };
}

/** Faturamento estimado que a OperAPI exige no cadastro do cedente: soma das
 *  comissões das operações da imobiliária nos últimos 12 meses — o que dá
 *  pra estimar com honestidade a partir dos nossos dados. */
async function faturamentoEstimadoImobiliaria(
  imobiliariaId: string,
): Promise<number> {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  const [r] = await db
    .select({
      total: sql<string>`coalesce(sum(${operacoes.valorComissao}), 0)`,
    })
    .from(operacoes)
    .where(
      and(
        eq(operacoes.imobiliariaId, imobiliariaId),
        gte(operacoes.createdAt, umAnoAtras),
      ),
    );
  return Math.round(Number(r?.total ?? 0));
}

async function carregarFundo(fundoId: string): Promise<Fundo | null> {
  const [f] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  return f ?? null;
}

/* ═══════════════════════════════════════════
   PEÇA 01 · CONSULTA DE CADASTRO
   ═══════════════════════════════════════════ */

export async function consultarCliente(
  operaClienteId: string,
): Promise<ResultadoAgente> {
  const [cliente] = await db
    .select()
    .from(operaClientes)
    .where(eq(operaClientes.id, operaClienteId))
    .limit(1);
  if (!cliente) return { tipo: "bloqueado", motivo: "Registro não encontrado" };

  const fundo = await carregarFundo(cliente.fundoId);
  if (!fundo) return { tipo: "bloqueado", motivo: "Fundo não encontrado" };

  const contrato = contratoDoFundo(fundo);
  if (!contrato.envio.parceiro) {
    return {
      tipo: "bloqueado",
      motivo:
        "Parceiro não configurado — preencha o campo 'parceiro' na integração do fundo",
    };
  }

  const rota = contrato.rotas.consultarCliente;
  const cnpj = soDigitos(cliente.cnpj);
  const resp = await operaFetch(fundo, rota, {
    vars: { cnpj },
    // A OperAPI consulta por POST com o par parceiro + CNPJ.
    body:
      rota.metodo === "GET"
        ? undefined
        : { parceiro: contrato.envio.parceiro, cnpj_cliente: cnpj },
  });
  await registrarSaude(fundo.id, { ok: resp.ok || resp.status === 404, erro: resp.erro });

  // 404 é resposta legítima de "não existe", não falha de comunicação.
  if (!resp.ok && resp.status !== 404) {
    return { tipo: "retentar", erro: resp.erro ?? `HTTP ${resp.status}` };
  }

  const externoIdBruto = lerTexto(resp.data, contrato.leitura.clienteId);
  // A OperAPI devolve id 0 enquanto o cadastro ainda está "RECEBIDO" na
  // esteira interna deles — 0 é "ainda sem id", não um id.
  const externoId =
    externoIdBruto && externoIdBruto !== "0" ? externoIdBruto : null;
  const flag = lerFlag(resp.data, contrato.leitura.clienteExisteFlag);
  // Regra: existe (pronto pra operar) se o fundo disse que existe OU se
  // devolveu um ID de cliente.
  const existe = resp.status === 404 ? false : (flag ?? Boolean(externoId));

  // A consulta também devolve o estado da ESTEIRA INTERNA do fundo
  // (observado na homologação de 01/09): "RECEBIDO" e "INTEGRADO_*" são
  // cadastro em trânsito (id ainda 0), "ERRO" é cadastro que o fundo
  // registrou mas não conseguiu processar. Nos três casos o CNPJ JÁ está
  // na base deles — mandar cadastro de novo só rende "already taken".
  const statusFundo = normalizarStatus(
    lerTexto(resp.data, contrato.leitura.situacaoCadastro) ?? "",
  );
  const registroComErro = statusFundo === "erro";
  const registroEmTransito =
    statusFundo === "recebido" || statusFundo.includes("integrado");

  // O fundo ecoou a identidade do cliente (razão social / CNPJ) → o CNPJ ESTÁ
  // na base deles, seja qual for o rótulo da esteira interna. É o que vale:
  // eles inventam status novos (02/09 apareceu "RETORNADO_PARCEIRO", fora do
  // catálogo) e tratar rótulo desconhecido como "não existe" reenviaria o
  // cadastro — exatamente a duplicata que o fundo reclamou.
  const identidadeEcoada = Boolean(
    lerTexto(resp.data, ["razao_social", "razaoSocial", "cnpj_cliente"]),
  );
  const registroExiste =
    existe || registroComErro || registroEmTransito || identidadeEcoada;

  // Aprovado com id real não é rebaixado por uma resposta transitória (a
  // consulta devolve id 0 enquanto a esteira deles anda).
  const jaAprovado = cliente.situacao === "aprovado" && Boolean(cliente.externoId);

  const situacao = existe
    ? "aprovado"
    : registroComErro
      ? "erro"
      : jaAprovado
        ? "aprovado"
        : registroEmTransito || identidadeEcoada
          ? "em_analise"
          : "nao_encontrado";

  await db
    .update(operaClientes)
    .set({
      situacao,
      externoId: externoId ?? cliente.externoId,
      // Cliente encontrado (ou em trânsito lá) apaga recusas antigas.
      ...(existe || registroEmTransito || identidadeEcoada
        ? { motivo: null }
        : {}),
      ...(registroComErro
        ? {
            motivo:
              "O fundo recebeu o cadastro mas registrou erro no processamento (status ERRO na consulta) — confirmar o motivo com o fundo.",
          }
        : {}),
      consultadoEm: new Date(),
      respondidoEm: existe ? new Date() : null,
      ultimaResposta: { status: resp.status, corpo: resp.data } as never,
      updatedAt: new Date(),
    })
    .where(eq(operaClientes.id, cliente.id));

  // O CNPJ já está na base do fundo → qualquer job de cadastro esperando
  // (bloqueado por recusa antiga, ou pendente) perdeu o motivo de existir.
  if (registroExiste) {
    await db
      .update(operaJobs)
      .set({
        status: "concluido",
        resultado: { resolvidoPor: "consulta", externoId, statusFundo } as never,
        ultimoErro: null,
        concluidoEm: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(operaJobs.tipo, "cadastrar_cliente"),
          eq(operaJobs.refId, cliente.id),
          inArray(operaJobs.status, ["pendente", "bloqueado"]),
        ),
      );
  }

  if (!registroExiste) {
    // Não existe → peça 02 assume.
    await enfileirarJob({
      fundoId: fundo.id,
      tipo: "cadastrar_cliente",
      refTipo: "opera_cliente",
      refId: cliente.id,
      operacaoId: null,
    });
    return { tipo: "ok", resultado: { existe: false, proximaPeca: "cadastro" } };
  }

  if (!existe) {
    // Em trânsito ou com erro: quem resolve é o fundo (webhook ou nova
    // consulta) — não há o que retentar daqui.
    return { tipo: "ok", resultado: { existe: true, situacao, statusFundo } };
  }

  // Já cadastrado → atalho: se todos os clientes da operação estão prontos,
  // a operação pode ir direto pra peça 04.
  await destravarOperacoesQueEsperam(cliente);
  return { tipo: "ok", resultado: { existe: true, externoId } };
}

/* ═══════════════════════════════════════════
   PEÇA 02 · CADASTRO DO CLIENTE COM DOCUMENTOS
   ═══════════════════════════════════════════ */

export async function cadastrarCliente(
  operaClienteId: string,
): Promise<ResultadoAgente> {
  const [cliente] = await db
    .select()
    .from(operaClientes)
    .where(eq(operaClientes.id, operaClienteId))
    .limit(1);
  if (!cliente) return { tipo: "bloqueado", motivo: "Registro não encontrado" };

  const fundo = await carregarFundo(cliente.fundoId);
  if (!fundo) return { tipo: "bloqueado", motivo: "Fundo não encontrado" };

  const contrato = contratoDoFundo(fundo);
  if (!contrato.envio.parceiro) {
    return {
      tipo: "bloqueado",
      motivo:
        "Parceiro não configurado — preencha o campo 'parceiro' na integração do fundo",
    };
  }

  const ficha = await montarFichaCadastral(cliente);
  if (!ficha) return { tipo: "bloqueado", motivo: "Cliente não encontrado na nossa base" };

  // Nunca mandamos cadastro pela metade: falta documento, o job espera o
  // cliente. Retentar sozinho não resolveria.
  const tiposPresentes = new Set(ficha.documentos.map((d) => d.tipo));
  const faltando = contrato.documentos.obrigatorios.filter(
    (t) => !tiposPresentes.has(t),
  );
  if (faltando.length > 0) {
    return {
      tipo: "bloqueado",
      motivo: `Documentos faltando: ${faltando.join(", ")}`,
    };
  }

  // Faturamento zerado (imobiliária sem operações nos 12 meses) reprova na
  // validação do fundo — 422 visto em 01/09: "must be at least 3 characters".
  // Dado que falta é NOSSO: o job espera, não adianta retentar igual.
  const fat = (
    ficha.dados as { dadosFinanceiros?: { faturamentoEstimado?: number } }
  ).dadosFinanceiros?.faturamentoEstimado;
  if (fat !== undefined && fat < 3) {
    return {
      tipo: "bloqueado",
      motivo:
        "Imobiliária sem faturamento estimável (nenhuma operação nos últimos 12 meses) — o fundo exige o valor no cadastro. Pendência aberta com a OPERA sobre a semântica do campo.",
    };
  }

  const corpo: Record<string, unknown> = {
    parceiro: contrato.envio.parceiro,
    ...ficha.dados,
  };

  if (contrato.documentos.modo === "zip_base64") {
    // Formato da OperAPI: um ZIP com todos os documentos, em base64, dentro
    // de documentos.doc_outros. Baixamos os arquivos na hora — link vencido
    // ou fora do ar é motivo de retentativa, não de cadastro pela metade.
    const arquivos: { nome: string; conteudo: Buffer }[] = [];
    for (const d of ficha.documentos) {
      try {
        arquivos.push({
          nome: `${d.tipo}-${d.nomeOriginal}`,
          conteudo: await baixarDocumento(d.url),
        });
      } catch (err) {
        return {
          tipo: "retentar",
          erro: `Falha ao baixar documento ${d.tipo}: ${(err as Error).message}`,
        };
      }
    }
    corpo[contrato.documentos.campo] = {
      doc_outros: [
        { outros_documentos: montarZip(arquivos).toString("base64") },
      ],
    };
  } else {
    corpo[contrato.documentos.campo] = ficha.documentos.map((d) => ({
      tipo: d.tipo,
      nome: d.nomeOriginal,
      url: d.url,
    }));
  }

  const resp = await operaFetch(fundo, contrato.rotas.cadastrarCliente, {
    body: corpo,
  });
  await registrarSaude(fundo.id, { ok: resp.ok, erro: resp.erro });

  if (!resp.ok) {
    // "CNPJ already taken": o cliente JÁ está na base do fundo (envio
    // anterior, corrida com outro processo). Não é recusa nem motivo de
    // retentativa — o certo é consultar e sincronizar a situação de lá.
    // (Visto na homologação de 01/09: reenvio dava 422 com essa mensagem.)
    if (/already (been )?taken/i.test(resp.cru)) {
      await db
        .update(operaClientes)
        .set({
          situacao: "em_analise",
          motivo: null,
          ultimaResposta: { status: resp.status, corpo: resp.cru } as never,
          updatedAt: new Date(),
        })
        .where(eq(operaClientes.id, cliente.id));
      await enfileirarJob({
        fundoId: fundo.id,
        tipo: "consultar_cliente",
        refTipo: "opera_cliente",
        refId: cliente.id,
        operacaoId: null,
      });
      return { tipo: "ok", resultado: { jaCadastradoNoFundo: true } };
    }
    // 4xx que não seja 429 é erro de conteúdo: retentar igual não adianta.
    if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
      await db
        .update(operaClientes)
        .set({
          situacao: "erro",
          motivo: `O fundo recusou o cadastro (HTTP ${resp.status}). ${resp.cru.slice(0, 300)}`,
          ultimaResposta: { status: resp.status, corpo: resp.cru } as never,
          updatedAt: new Date(),
        })
        .where(eq(operaClientes.id, cliente.id));
      return {
        tipo: "bloqueado",
        motivo: `Cadastro recusado pelo fundo (HTTP ${resp.status})`,
      };
    }
    return { tipo: "retentar", erro: resp.erro ?? `HTTP ${resp.status}` };
  }

  const protocolo = lerTexto(resp.data, contrato.leitura.protocolo);
  const externoId = lerTexto(resp.data, contrato.leitura.clienteId);

  await db
    .update(operaClientes)
    .set({
      situacao: "em_analise",
      protocolo: protocolo ?? cliente.protocolo,
      externoId: externoId ?? cliente.externoId,
      enviadoEm: new Date(),
      // Guarda a ficha sem binário — a lista de arquivos basta pra auditoria.
      payloadEnviado: {
        ...corpo,
        [contrato.documentos.campo]: ficha.documentos.map((d) => ({
          tipo: d.tipo,
          nome: d.nomeOriginal,
        })),
      } as never,
      ultimaResposta: { status: resp.status, corpo: resp.data } as never,
      updatedAt: new Date(),
    })
    .where(eq(operaClientes.id, cliente.id));

  // Daqui pra frente quem manda é o webhook de cadastro (peça 03).
  return { tipo: "ok", resultado: { protocolo, externoId } };
}

/** Os documentos vivem no Vercel Blob PRIVADO — fetch puro na URL devolve
 *  403. URL do nosso store desce pelo SDK autenticado; qualquer outra origem
 *  (legado, link externo) segue no fetch comum. */
async function baixarDocumento(url: string): Promise<Buffer> {
  if (url.includes(".private.blob.vercel-storage.com/")) {
    const r = await blobGet(url, { access: "private" });
    if (!r?.stream) throw new Error("Arquivo não encontrado no storage");
    return Buffer.from(await new Response(r.stream as ReadableStream).arrayBuffer());
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Ficha + documentos de uma imobiliária ou construtora, no formato do
 *  CriarClienteRequest da OperAPI (cnpj, razaoSocial, endereço achatado,
 *  region = UF, representantes com participacao "1" = Repr. Legal). */
async function montarFichaCadastral(cliente: OperaCliente): Promise<{
  dados: Record<string, unknown>;
  documentos: { tipo: string; url: string; nomeOriginal: string }[];
} | null> {
  if (cliente.entidadeTipo === "imobiliaria") {
    const [imob] = await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.id, cliente.entidadeId))
      .limit(1);
    if (!imob) return null;

    const [dono] = await db
      .select()
      .from(users)
      .where(eq(users.id, imob.ownerUserId))
      .limit(1);

    const docs = await db
      .select()
      .from(documentos)
      .where(eq(documentos.imobiliariaId, imob.id));

    const docsDoDono = dono
      ? await db.select().from(documentos).where(eq(documentos.userId, dono.id))
      : [];

    const telefone = soDigitos(imob.telefone ?? dono?.telefone);
    const { logradouro, bairro } = await resolverBairro(imob.endereco, imob.cep);
    const { rua, numero } = separarNumero(logradouro);
    return {
      dados: {
        cnpj: formatarCnpj(imob.cnpj),
        razaoSocial: imob.razaoSocial,
        nomeFantasia: imob.nomeFantasia ?? null,
        endereco: rua,
        numero,
        complemento: "",
        bairro,
        cidade: imob.cidade ?? null,
        region: imob.uf ?? null,
        cep: formatarCep(imob.cep),
        dadosFinanceiros: {
          // Numérico, em reais (spec OPERA 01/09; mínimo aceito é 3).
          faturamentoEstimado: await faturamentoEstimadoImobiliaria(imob.id),
        },
        relato_consultoria:
          `Imobiliária parceira da Antecipaqui (antecipação de comissões ` +
          `imobiliárias). Ficha e documentos enviados automaticamente pela ` +
          `integração; histórico operacional disponível sob consulta.`,
        funcao_responsavel_operacional: "Diretor",
        nome_responsavel_operacional: dono?.nome ?? null,
        email_responsavel_operacional: dono?.email ?? null,
        representantes: dono
          ? [
              {
                participacao: "1",
                nome: dono.nome,
                email: dono.email,
                celular: telefone || null,
                // Obrigatório; sem linha fixa cadastrada, repete o celular.
                telefone: telefone || null,
              },
            ]
          : null,
      },
      documentos: [...docs, ...docsDoDono].map((d) => ({
        tipo: d.tipo,
        url: d.url,
        nomeOriginal: d.nomeOriginal,
      })),
    };
  }

  const [con] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, cliente.entidadeId))
    .limit(1);
  if (!con) return null;

  const docs = await db
    .select()
    .from(documentos)
    .where(eq(documentos.construtoraId, con.id));

  const enderecoCon = await resolverBairro(con.endereco, con.cep);
  const numeroCon = separarNumero(enderecoCon.logradouro);
  return {
    dados: {
      cnpj: formatarCnpj(con.cnpj),
      razaoSocial: con.razaoSocial,
      nomeFantasia: con.nomeFantasia ?? null,
      endereco: numeroCon.rua,
      numero: numeroCon.numero,
      complemento: "",
      bairro: enderecoCon.bairro,
      cidade: con.cidade ?? null,
      region: con.uf ?? null,
      cep: formatarCep(con.cep),
      email_responsavel_operacional: con.email ?? null,
    },
    documentos: docs.map((d) => ({
      tipo: d.tipo,
      url: d.url,
      nomeOriginal: d.nomeOriginal,
    })),
  };
}

/* ═══════════════════════════════════════════
   PEÇA 04 · ENVIO DA OPERAÇÃO
   ═══════════════════════════════════════════ */

export async function enviarOperacao(
  operacaoId: string,
): Promise<ResultadoAgente> {
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) return { tipo: "bloqueado", motivo: "Operação não encontrada" };
  if (!op.fundoId)
    return { tipo: "bloqueado", motivo: "Operação sem fundo vinculado" };

  const fundo = await carregarFundo(op.fundoId);
  if (!fundo) return { tipo: "bloqueado", motivo: "Fundo não encontrado" };

  const contrato = contratoDoFundo(fundo);
  if (!contrato.envio.parceiro || !contrato.envio.cnpjEmpresa) {
    return {
      tipo: "bloqueado",
      motivo:
        "Parceiro ou CNPJ da empresa não configurados na integração do fundo",
    };
  }

  // Portão: o cadastro do cedente (e do sacado, quando o fundo exige)
  // precisa estar aprovado. É o que a peça 03 libera — antes disso não sai nada.
  const pendentes = await clientesPendentesDaOperacao(op, contrato.envio.cadastrarSacado);
  if (pendentes.length > 0) {
    return {
      tipo: "bloqueado",
      motivo: `Aguardando aprovação cadastral: ${pendentes.join(", ")}`,
    };
  }

  const dossie = await montarPayloadOperacao(op, fundo, contrato);
  if ("erro" in dossie) {
    // Consulta de favorecidos fora do ar é problema de comunicação, não de
    // conteúdo: a fila tenta de novo em vez de parar a operação.
    return dossie.retentar
      ? { tipo: "retentar", erro: dossie.erro }
      : { tipo: "bloqueado", motivo: dossie.erro };
  }

  const resp = await operaFetch(fundo, contrato.rotas.enviarOperacao, {
    body: dossie.payload,
  });
  await registrarSaude(fundo.id, { ok: resp.ok, erro: resp.erro });

  if (!resp.ok) {
    if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
      // Erro de validação: o campo exato vem no corpo e vira pendência.
      await registrarEspelhoOperacao(op.id, fundo.id, {
        payloadEnviado: dossie.payload,
        ultimaResposta: { status: resp.status, corpo: resp.cru },
      });
      return {
        tipo: "bloqueado",
        motivo: `O fundo recusou a operação (HTTP ${resp.status}): ${resp.cru.slice(0, 300)}`,
      };
    }
    return { tipo: "retentar", erro: resp.erro ?? `HTTP ${resp.status}` };
  }

  const externoId = lerTexto(resp.data, contrato.leitura.operacaoId);
  const protocolo = lerTexto(resp.data, contrato.leitura.protocolo);

  await registrarEspelhoOperacao(op.id, fundo.id, {
    externoId,
    protocolo,
    enviadaEm: new Date(),
    payloadEnviado: dossie.payload,
    ultimaResposta: { status: resp.status, corpo: resp.data },
  });

  return { tipo: "ok", resultado: { externoId, protocolo } };
}

/** Quais clientes da operação ainda não estão aprovados no fundo. Na OPERA
 *  só o cedente (imobiliária) precisa de cadastro — o sacado vai inline nos
 *  títulos; `cadastrarSacado` liga a exigência pra fundos que pedirem. */
async function clientesPendentesDaOperacao(
  op: typeof operacoes.$inferSelect,
  cadastrarSacado: boolean,
): Promise<string[]> {
  if (!op.fundoId) return ["fundo não vinculado"];
  const alvos: { tipo: string; id: string; rotulo: string }[] = [];
  if (cadastrarSacado)
    alvos.push({ tipo: "construtora", id: op.construtoraId, rotulo: "construtora" });
  if (op.imobiliariaId)
    alvos.push({
      tipo: "imobiliaria",
      id: op.imobiliariaId,
      rotulo: "imobiliária",
    });
  else return ["cedente (a operação não tem imobiliária vinculada)"];

  const linhas = await db
    .select()
    .from(operaClientes)
    .where(
      and(
        eq(operaClientes.fundoId, op.fundoId),
        inArray(
          operaClientes.entidadeId,
          alvos.map((a) => a.id),
        ),
      ),
    );

  const pendentes: string[] = [];
  for (const alvo of alvos) {
    const linha = linhas.find(
      (l) => l.entidadeId === alvo.id && l.entidadeTipo === alvo.tipo,
    );
    if (!linha || linha.situacao !== "aprovado") pendentes.push(alvo.rotulo);
  }
  return pendentes;
}

/** O payload do envio no formato da OperAPI: identidade do parceiro, cedente
 *  por CPF/CNPJ, taxa de deságio em % ao mês e um título por parcela, com o
 *  sacado (quem paga a comissão) inline em cada título. */
async function montarPayloadOperacao(
  op: typeof operacoes.$inferSelect,
  fundo: Fundo,
  contrato: OperaContrato,
): Promise<
  | { payload: Record<string, unknown> }
  | { erro: string; retentar?: boolean }
> {
  const envio = contrato.envio;
  const [imob] = op.imobiliariaId
    ? await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.id, op.imobiliariaId))
        .limit(1)
    : [null];
  if (!imob) {
    return { erro: "Operação sem imobiliária — o fundo exige um cedente PJ" };
  }

  const [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);

  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, op.id))
    .orderBy(parcelasComissao.numero);
  if (parcelas.length === 0) {
    return { erro: "Operação sem parcelas — não há títulos a enviar" };
  }

  // Sacado dos títulos: quem paga a comissão. Construtora (padrão) ou o
  // comprador principal, quando a operação foi montada nesse modelo.
  let sacado: {
    documento: string;
    nome: string;
    endereco?: Record<string, unknown>;
    telefone?: Record<string, unknown>;
  } | null = null;

  if (op.pagadorTipo === "compradores") {
    const compradores = await db
      .select()
      .from(operacaoCompradores)
      .where(eq(operacaoCompradores.operacaoId, op.id));
    const principal = compradores[0];
    if (principal) {
      sacado = {
        documento: soDigitos(principal.documento),
        nome: principal.nome,
      };
    }
  } else if (construtora) {
    sacado = {
      documento: soDigitos(construtora.cnpj),
      nome: construtora.razaoSocial,
    };
    if (construtora.endereco && construtora.cidade && construtora.uf) {
      sacado.endereco = {
        endereco: construtora.endereco,
        numero: "S/N",
        bairro: "",
        cidade: construtora.cidade,
        uf: construtora.uf,
        cep: Number(soDigitos(construtora.cep)) || 0,
        ...(construtora.email ? { email: construtora.email } : {}),
      };
    }
    const tel = soDigitos(construtora.telefone);
    if (tel.length >= 10) {
      sacado.telefone = {
        ddd: Number(tel.slice(0, 2)),
        numero: Number(tel.slice(2)),
      };
    }
  }

  if (!sacado?.documento || !sacado.nome) {
    return { erro: "Sacado sem nome ou documento — confira o pagador da operação" };
  }
  const s = sacado;

  // Taxa em % a.m. — internamente guardamos fração (0.0309 = 3,09%).
  const taxaFracao = Number(op.taxaFundoSnapshot ?? op.taxaMensal);
  const taxaDesagio = Math.round(taxaFracao * 100 * 100) / 100;

  // Onde o dinheiro cai. O ERP do fundo exige o código da conta na base
  // DELE, então a conta é consultada a cada envio — e o valor do favorecido
  // é a soma dos títulos que estão indo.
  const totalTitulos =
    Math.round(parcelas.reduce((s, p) => s + Number(p.valor), 0) * 100) / 100;
  const favorecidos = await resolverFavorecidos(
    fundo,
    contrato,
    imob,
    totalTitulos,
  );
  if ("erro" in favorecidos) return favorecidos;

  const payload: Record<string, unknown> = {
    parceiro: envio.parceiro,
    cnpj_empresa: envio.cnpjEmpresa,
    operacao_pre_calculada: envio.operacaoPreCalculada,
    fase_liberacao: envio.faseLiberacao,
    executa_filtro: envio.executaFiltro,
    numero_operacao_parceiro: op.numero,
    cpf_cnpj_cedente: soDigitos(imob.cnpj),
    taxa_desagio: taxaDesagio,
    tipo_documento: envio.tipoDocumento,
    observacao: `Antecipaqui ${op.numero} — antecipação de comissão imobiliária. Cedente: ${imob.razaoSocial}.`,
    favorecidos: favorecidos.lista,
    titulos: parcelas.map((p) => ({
      cpf_cnpj_sacado: s.documento,
      nome_sacado: s.nome,
      ...(s.endereco ? { endereco_sacado: s.endereco } : {}),
      ...(s.telefone ? { telefone_sacado: s.telefone } : {}),
      numero_titulo: `${op.numero}/${String(p.numero).padStart(3, "0")}`,
      data_emissao: op.dataVenda,
      data_vencimento: p.vencimento,
      valor_nominal: Number(p.valor),
      valor_desconto: 0,
    })),
  };

  return { payload };
}

/** Contas de recebimento do cedente na base do fundo. O ERP da OPERA exige o
 *  campo `favorecidos` no envio, com o CÓDIGO da conta lá (03/09) — e quem
 *  cadastra as contas é a esteira cadastral do fundo, não nós. Por isso a
 *  consulta acontece a cada envio, e não achar conta é motivo de espera, não
 *  de erro: o cadastro pode estar a caminho. */
async function resolverFavorecidos(
  fundo: Fundo,
  contrato: OperaContrato,
  imob: typeof imobiliarias.$inferSelect,
  valorTotal: number,
): Promise<
  { lista: Record<string, unknown>[] } | { erro: string; retentar?: boolean }
> {
  const rota = contrato.rotas.consultarFavorecidos;
  if (!rota) {
    return {
      erro: "Rota de consulta de favorecidos não configurada na integração do fundo",
    };
  }

  const resp = await operaFetch(fundo, rota, {
    vars: { cnpj: soDigitos(imob.cnpj) },
  });
  await registrarSaude(fundo.id, { ok: resp.ok, erro: resp.erro });

  if (!resp.ok) {
    // 5xx/timeout é comunicação; 4xx é conteúdo e não melhora sozinho.
    const comunicacao = resp.status === 0 || resp.status === 429 || resp.status >= 500;
    return {
      erro: comunicacao
        ? `Falha ao consultar as contas de recebimento no fundo (HTTP ${resp.status})`
        : `O fundo recusou a consulta das contas de recebimento (HTTP ${resp.status}): ${resp.cru.slice(0, 200)}`,
      retentar: comunicacao,
    };
  }

  const bruto = Array.isArray(resp.data)
    ? resp.data
    : ler(resp.data, contrato.leitura.favorecidosLista);
  const contas = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];

  if (contas.length === 0) {
    return {
      erro:
        `O fundo ainda não tem conta de recebimento cadastrada para ${imob.razaoSocial} ` +
        `(CNPJ ${imob.cnpj}). O cadastro da conta acontece na esteira cadastral do fundo — ` +
        `assim que ela existir, o envio segue sozinho.`,
    };
  }

  const escolhida = escolherConta(contas, imob, contrato);
  if (!escolhida) {
    const resumo = contas
      .map((c) => {
        const banco = lerTexto(c, contrato.leitura.favorecidoBanco) ?? "?";
        const ag = lerTexto(c, contrato.leitura.favorecidoAgencia) ?? "?";
        const cc = lerTexto(c, contrato.leitura.favorecidoConta) ?? "?";
        const cod = lerTexto(c, contrato.leitura.favorecidoCodigo) ?? "?";
        return `código ${cod} (banco ${banco}, ag. ${ag}, conta ${cc})`;
      })
      .join("; ");
    return {
      erro:
        `O fundo tem ${contas.length} contas de recebimento para este cedente e nenhuma bate ` +
        `com a conta do cadastro dele aqui — escolher a certa é decisão humana: ${resumo}.`,
    };
  }

  const codigo = lerTexto(escolhida, contrato.leitura.favorecidoCodigo);
  const indicador = lerTexto(escolhida, contrato.leitura.favorecidoIndicador);
  if (!codigo) {
    return { erro: "A conta de recebimento veio do fundo sem código — não dá pra indicar onde o dinheiro cai." };
  }

  return {
    lista: [
      {
        indicador: indicador ?? "P",
        codigo: Number(codigo),
        forma_pagamento: contrato.envio.formaPagamento,
        valor: valorTotal,
        observacao: "",
      },
    ],
  };
}

/** Uma conta só resolve. Havendo várias, a que bate com os dados bancários
 *  do cadastro do cedente vence — dinheiro na conta errada é o pior defeito
 *  possível, então empate sem prova não é resolvido por chute. */
function escolherConta(
  contas: unknown[],
  imob: typeof imobiliarias.$inferSelect,
  contrato: OperaContrato,
): unknown | null {
  if (contas.length === 1) return contas[0];

  const contaCadastro = soDigitos(imob.bancoConta);
  if (contaCadastro) {
    const casadas = contas.filter(
      (c) =>
        soDigitos(lerTexto(c, contrato.leitura.favorecidoConta)) === contaCadastro,
    );
    if (casadas.length === 1) return casadas[0];
  }
  return null;
}

/** Cria ou atualiza o espelho da operação no fundo. */
async function registrarEspelhoOperacao(
  operacaoId: string,
  fundoId: string,
  dados: Partial<typeof operaOperacoes.$inferInsert>,
) {
  const [existente] = await db
    .select({ id: operaOperacoes.id })
    .from(operaOperacoes)
    .where(eq(operaOperacoes.operacaoId, operacaoId))
    .limit(1);

  if (existente) {
    await db
      .update(operaOperacoes)
      .set({ ...dados, updatedAt: new Date() })
      .where(eq(operaOperacoes.id, existente.id));
    return existente.id;
  }

  const [criado] = await db
    .insert(operaOperacoes)
    .values({ operacaoId, fundoId, ...dados })
    .returning({ id: operaOperacoes.id });
  return criado.id;
}

/* ═══════════════════════════════════════════
   COORDENAÇÃO
   ═══════════════════════════════════════════ */

/** Garante que existam as linhas de espelho cadastral da operação e coloca a
 *  peça 01 na fila pra cada uma. É o ponto de entrada da integração — chamado
 *  quando a operação é destinada a um fundo integrado. */
export async function iniciarIntegracaoDaOperacao(operacaoId: string): Promise<{
  ok: boolean;
  motivo?: string;
  jobs: number;
}> {
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) return { ok: false, motivo: "Operação não encontrada", jobs: 0 };
  if (!op.fundoId)
    return { ok: false, motivo: "Operação sem fundo vinculado", jobs: 0 };

  const fundo = await carregarFundo(op.fundoId);
  if (!fundo) return { ok: false, motivo: "Fundo não encontrado", jobs: 0 };
  if (fundo.integracaoTipo === "nenhuma")
    return { ok: false, motivo: "Fundo sem integração ativa", jobs: 0 };

  const contrato = contratoDoFundo(fundo);

  if (!op.imobiliariaId) {
    return {
      ok: false,
      motivo:
        "Operação sem imobiliária — a integração exige um cedente PJ cadastrado no fundo",
      jobs: 0,
    };
  }

  const alvos: { tipo: "imobiliaria" | "construtora"; id: string; cnpj: string }[] =
    [];

  // Na OPERA só o cedente é cadastrado; o sacado vai inline nos títulos.
  if (contrato.envio.cadastrarSacado) {
    const [construtora] = await db
      .select({ id: construtoras.id, cnpj: construtoras.cnpj })
      .from(construtoras)
      .where(eq(construtoras.id, op.construtoraId))
      .limit(1);
    if (construtora)
      alvos.push({ tipo: "construtora", id: construtora.id, cnpj: construtora.cnpj });
  }

  const [imob] = await db
    .select({ id: imobiliarias.id, cnpj: imobiliarias.cnpj })
    .from(imobiliarias)
    .where(eq(imobiliarias.id, op.imobiliariaId))
    .limit(1);
  if (imob) alvos.push({ tipo: "imobiliaria", id: imob.id, cnpj: imob.cnpj });

  let jobs = 0;
  let todosAprovados = alvos.length > 0;

  for (const alvo of alvos) {
    const [existente] = await db
      .select()
      .from(operaClientes)
      .where(
        and(
          eq(operaClientes.fundoId, fundo.id),
          eq(operaClientes.entidadeTipo, alvo.tipo),
          eq(operaClientes.entidadeId, alvo.id),
        ),
      )
      .limit(1);

    if (existente?.situacao === "aprovado") continue;
    todosAprovados = false;

    const clienteId =
      existente?.id ??
      (
        await db
          .insert(operaClientes)
          .values({
            fundoId: fundo.id,
            entidadeTipo: alvo.tipo,
            entidadeId: alvo.id,
            cnpj: alvo.cnpj,
            situacao: "nao_consultado",
          })
          .returning({ id: operaClientes.id })
      )[0].id;

    // Já em análise no fundo? Então quem responde é o webhook, não a fila.
    if (existente?.situacao === "em_analise" || existente?.situacao === "enviado")
      continue;

    const r = await enfileirarJob({
      fundoId: fundo.id,
      tipo: "consultar_cliente",
      refTipo: "opera_cliente",
      refId: clienteId,
      operacaoId: op.id,
    });
    if (r.criado) jobs++;
  }

  // Atalho: os dois já cadastrados lá → a operação vai direto pra peça 04.
  if (todosAprovados) {
    const r = await enfileirarJob({
      fundoId: fundo.id,
      tipo: "enviar_operacao",
      refTipo: "operacao",
      refId: op.id,
      operacaoId: op.id,
    });
    if (r.criado) jobs++;
  }

  return { ok: true, jobs };
}

/** Depois que um cliente é aprovado, verifica quais operações dele estavam
 *  esperando e libera a peça 04 das que já têm tudo aprovado. */
export async function destravarOperacoesQueEsperam(cliente: OperaCliente) {
  const condicao =
    cliente.entidadeTipo === "construtora"
      ? eq(operacoes.construtoraId, cliente.entidadeId)
      : eq(operacoes.imobiliariaId, cliente.entidadeId);

  const fundo = await carregarFundo(cliente.fundoId);
  if (!fundo) return 0;
  const cadastrarSacado = contratoDoFundo(fundo).envio.cadastrarSacado;

  const candidatas = await db
    .select()
    .from(operacoes)
    .where(
      and(
        condicao,
        eq(operacoes.fundoId, cliente.fundoId),
        inArray(operacoes.status, [
          "analise_final",
          "pre_aprovada",
          "aguardando_aprovacao",
        ]),
      ),
    );

  let liberadas = 0;
  for (const op of candidatas) {
    const pendentes = await clientesPendentesDaOperacao(op, cadastrarSacado);
    if (pendentes.length > 0) continue;

    // Já enviada? Não manda de novo.
    const [espelho] = await db
      .select({ externoId: operaOperacoes.externoId })
      .from(operaOperacoes)
      .where(eq(operaOperacoes.operacaoId, op.id))
      .limit(1);
    if (espelho?.externoId) continue;

    const r = await enfileirarJob({
      fundoId: cliente.fundoId,
      tipo: "enviar_operacao",
      refTipo: "operacao",
      refId: op.id,
      operacaoId: op.id,
    });
    if (r.criado) liberadas++;
  }
  return liberadas;
}
