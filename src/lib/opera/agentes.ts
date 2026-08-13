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
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  documentos,
  fundos,
  imobiliarias,
  operacaoCompradores,
  operacoes,
  operaClientes,
  operaOperacoes,
  parcelasComissao,
  users,
  type Fundo,
  type OperaCliente,
} from "@/db/schema";
import {
  contratoDoFundo,
  operaFetch,
  registrarSaude,
} from "@/lib/opera/client";
import { lerFlag, lerTexto } from "@/lib/opera/contrato";
import { enfileirarJob } from "@/lib/opera/fila";

export type ResultadoAgente =
  | { tipo: "ok"; resultado: Record<string, unknown> }
  | { tipo: "retentar"; erro: string }
  | { tipo: "bloqueado"; motivo: string };

function soDigitos(v: string | null | undefined): string {
  return String(v ?? "").replace(/\D/g, "");
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
  const resp = await operaFetch(fundo, contrato.rotas.consultarCliente, {
    vars: { cnpj: soDigitos(cliente.cnpj) },
  });
  await registrarSaude(fundo.id, { ok: resp.ok || resp.status === 404, erro: resp.erro });

  // 404 é resposta legítima de "não existe", não falha de comunicação.
  if (!resp.ok && resp.status !== 404) {
    return { tipo: "retentar", erro: resp.erro ?? `HTTP ${resp.status}` };
  }

  const externoId = lerTexto(resp.data, contrato.leitura.clienteId);
  const flag = lerFlag(resp.data, contrato.leitura.clienteExisteFlag);
  // Regra: existe se o fundo disse que existe OU se devolveu um ID de cliente.
  const existe = resp.status === 404 ? false : (flag ?? Boolean(externoId));

  await db
    .update(operaClientes)
    .set({
      situacao: existe ? "aprovado" : "nao_encontrado",
      externoId: externoId ?? cliente.externoId,
      consultadoEm: new Date(),
      respondidoEm: existe ? new Date() : null,
      ultimaResposta: { status: resp.status, corpo: resp.data } as never,
      updatedAt: new Date(),
    })
    .where(eq(operaClientes.id, cliente.id));

  if (!existe) {
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

  const corpo = {
    ...ficha.dados,
    [contrato.documentos.campo]: ficha.documentos.map((d) => ({
      tipo: d.tipo,
      nome: d.nomeOriginal,
      url: d.url,
    })),
  };

  const resp = await operaFetch(fundo, contrato.rotas.cadastrarCliente, {
    body: corpo,
  });
  await registrarSaude(fundo.id, { ok: resp.ok, erro: resp.erro });

  if (!resp.ok) {
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
      payloadEnviado: corpo as never,
      ultimaResposta: { status: resp.status, corpo: resp.data } as never,
      updatedAt: new Date(),
    })
    .where(eq(operaClientes.id, cliente.id));

  // Daqui pra frente quem manda é o webhook de cadastro (peça 03).
  return { tipo: "ok", resultado: { protocolo, externoId } };
}

/** Ficha + documentos de uma imobiliária ou construtora. */
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

    return {
      dados: {
        tipo: "cedente",
        papel: "imobiliaria",
        razaoSocial: imob.razaoSocial,
        nomeFantasia: imob.nomeFantasia,
        cnpj: soDigitos(imob.cnpj),
        creci: imob.creciResponsavel,
        telefone: soDigitos(imob.telefone),
        email: dono?.email ?? null,
        responsavel: dono?.nome ?? null,
        endereco: {
          logradouro: imob.endereco,
          cidade: imob.cidade,
          uf: imob.uf,
          cep: soDigitos(imob.cep),
        },
        dadosBancarios: {
          banco: imob.bancoNome,
          codigoBanco: imob.bancoCodigo,
          agencia: imob.bancoAgencia,
          conta: imob.bancoConta,
        },
        referenciaExterna: imob.id,
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

  return {
    dados: {
      tipo: "sacado",
      papel: "construtora",
      razaoSocial: con.razaoSocial,
      nomeFantasia: con.nomeFantasia,
      cnpj: soDigitos(con.cnpj),
      telefone: soDigitos(con.telefone),
      email: con.email,
      endereco: {
        logradouro: con.endereco,
        cidade: con.cidade,
        uf: con.uf,
        cep: soDigitos(con.cep),
      },
      referenciaExterna: con.id,
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

  // Portão: os dois cadastros precisam estar aprovados. É o que a peça 03
  // libera — antes disso não sai nada.
  const pendentes = await clientesPendentesDaOperacao(op);
  if (pendentes.length > 0) {
    return {
      tipo: "bloqueado",
      motivo: `Aguardando aprovação cadastral: ${pendentes.join(", ")}`,
    };
  }

  const contrato = contratoDoFundo(fundo);
  const dossie = await montarDossieOperacao(op);
  const resp = await operaFetch(fundo, contrato.rotas.enviarOperacao, {
    body: dossie,
  });
  await registrarSaude(fundo.id, { ok: resp.ok, erro: resp.erro });

  if (!resp.ok) {
    if (resp.status >= 400 && resp.status < 500 && resp.status !== 429) {
      // Erro de validação: o campo exato vem no corpo e vira pendência.
      await registrarEspelhoOperacao(op.id, fundo.id, {
        payloadEnviado: dossie,
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
    payloadEnviado: dossie,
    ultimaResposta: { status: resp.status, corpo: resp.data },
  });

  return { tipo: "ok", resultado: { externoId, protocolo } };
}

/** Quais clientes da operação ainda não estão aprovados no fundo. */
async function clientesPendentesDaOperacao(
  op: typeof operacoes.$inferSelect,
): Promise<string[]> {
  if (!op.fundoId) return ["fundo não vinculado"];
  const alvos: { tipo: string; id: string; rotulo: string }[] = [
    { tipo: "construtora", id: op.construtoraId, rotulo: "construtora" },
  ];
  if (op.imobiliariaId)
    alvos.push({
      tipo: "imobiliaria",
      id: op.imobiliariaId,
      rotulo: "imobiliária",
    });

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

/** O dossiê completo: valores, prazo, parcelas, comprador, imóvel e todos
 *  os documentos vinculados à operação. */
async function montarDossieOperacao(op: typeof operacoes.$inferSelect) {
  const [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);

  const [imob] = op.imobiliariaId
    ? await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.id, op.imobiliariaId))
        .limit(1)
    : [null];

  const [cedente] = await db
    .select()
    .from(users)
    .where(eq(users.id, op.corretorUserId))
    .limit(1);

  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, op.id))
    .orderBy(parcelasComissao.numero);

  const compradores = await db
    .select()
    .from(operacaoCompradores)
    .where(eq(operacaoCompradores.operacaoId, op.id));

  const docs = await db
    .select()
    .from(documentos)
    .where(eq(documentos.operacaoId, op.id));

  return {
    referenciaExterna: op.id,
    numero: op.numero,
    dataVenda: op.dataVenda,
    valores: {
      valorVenda: Number(op.valorVenda),
      valorComissao: Number(op.valorComissao),
      valorEntrada: op.valorEntrada ? Number(op.valorEntrada) : null,
      valorPresente: Number(op.valorPresente),
      desagio: Number(op.desagio),
      taxaMensal: Number(op.taxaMensal),
      numeroParcelas: op.numeroParcelas,
    },
    cedente: {
      nome: cedente?.nome ?? null,
      email: cedente?.email ?? null,
      telefone: soDigitos(cedente?.telefone),
      imobiliaria: imob
        ? {
            razaoSocial: imob.razaoSocial,
            cnpj: soDigitos(imob.cnpj),
            referenciaExterna: imob.id,
          }
        : null,
    },
    sacado: {
      tipo: op.pagadorTipo,
      construtora: construtora
        ? {
            razaoSocial: construtora.razaoSocial,
            cnpj: soDigitos(construtora.cnpj),
            referenciaExterna: construtora.id,
          }
        : null,
      compradores: compradores.map((c) => ({
        nome: c.nome,
        documento: soDigitos(c.documento),
      })),
    },
    parcelas: parcelas.map((p) => ({
      numero: p.numero,
      valor: Number(p.valor),
      vencimento: p.vencimento,
    })),
    documentos: docs.map((d) => ({
      tipo: d.tipo,
      nome: d.nomeOriginal,
      url: d.url,
    })),
  };
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

  const [construtora] = await db
    .select({ id: construtoras.id, cnpj: construtoras.cnpj })
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);

  const alvos: { tipo: "imobiliaria" | "construtora"; id: string; cnpj: string }[] =
    [];
  if (construtora)
    alvos.push({ tipo: "construtora", id: construtora.id, cnpj: construtora.cnpj });

  if (op.imobiliariaId) {
    const [imob] = await db
      .select({ id: imobiliarias.id, cnpj: imobiliarias.cnpj })
      .from(imobiliarias)
      .where(eq(imobiliarias.id, op.imobiliariaId))
      .limit(1);
    if (imob) alvos.push({ tipo: "imobiliaria", id: imob.id, cnpj: imob.cnpj });
  }

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
    const pendentes = await clientesPendentesDaOperacao(op);
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
