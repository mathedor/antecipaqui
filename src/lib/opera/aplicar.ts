/**
 * APLICAÇÃO DOS EVENTOS QUE O FUNDO MANDA — as três peças de escuta.
 *
 *   03 · aplicarCadastro   — aprovado libera a operação; reprovado explica
 *   05 · aplicarStatus     — traduz a esteira e avisa todo mundo
 *   06 · aplicarDuplicatas — amarra os títulos e publica pros clientes
 *
 * Regras que valem pras três:
 *   · o evento cru já foi gravado ANTES daqui (a rota faz isso)
 *   · estado desconhecido nunca derruba a operação
 *   · evento mais velho que o último aplicado é ignorado, não retrocede
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  operacaoEvents,
  operacoes,
  operaClientes,
  operaDuplicatas,
  operaOperacoes,
  parcelasComissao,
  type Fundo,
} from "@/db/schema";
import { contratoDoFundo } from "@/lib/opera/client";
import {
  ler,
  lerData,
  lerNumero,
  lerTexto,
  lerTimestamp,
  normalizarStatus,
  traduzirStatus,
} from "@/lib/opera/contrato";
import { destravarOperacoesQueEsperam } from "@/lib/opera/agentes";
import { enfileirarJob } from "@/lib/opera/fila";
import { avisarAdmins, avisarEnvolvidos } from "@/lib/opera/notificar";

export type ResultadoAplicacao = {
  ok: boolean;
  /** Frase curta pro log e pro corpo da resposta ao fundo. */
  detalhe: string;
  operacaoId?: string;
  operaClienteId?: string;
};

const LINK_OPERACAO = (id: string) => `/painel/operacoes/${id}`;

/* ═══════════════════════════════════════════
   PEÇA 03 · RESPOSTA DO CADASTRO
   ═══════════════════════════════════════════ */

export async function aplicarCadastro(
  fundo: Fundo,
  payload: unknown,
): Promise<ResultadoAplicacao> {
  const contrato = contratoDoFundo(fundo);

  const protocolo = lerTexto(payload, contrato.leitura.refClienteProtocolo);
  const externoId = lerTexto(payload, contrato.leitura.refClienteExterno);
  const cnpj = lerTexto(payload, contrato.leitura.refClienteCnpj)?.replace(
    /\D/g,
    "",
  );

  const cliente = await acharCliente(fundo.id, { protocolo, externoId, cnpj });
  if (!cliente) {
    return {
      ok: false,
      detalhe: "Cadastro não localizado pelo protocolo, ID ou CNPJ informados",
    };
  }

  const situacaoCrua = lerTexto(payload, contrato.leitura.situacaoCadastro) ?? "";
  const motivo = lerTexto(payload, contrato.leitura.motivo);
  const chave = normalizarStatus(situacaoCrua);

  const aprovado = [
    "aprovado",
    "aprovada",
    "ativo",
    "liberado",
    "ok",
    "sucesso",
    "concluido",
  ].includes(chave);
  const reprovado = [
    "reprovado",
    "reprovada",
    "recusado",
    "negado",
    "rejeitado",
    "indeferido",
  ].includes(chave);

  if (!aprovado && !reprovado) {
    // Situação fora do catálogo: guarda, avisa o admin, não mexe em nada.
    await db
      .update(operaClientes)
      .set({
        ultimaResposta: payload as never,
        updatedAt: new Date(),
      })
      .where(eq(operaClientes.id, cliente.id));
    await avisarAdmins({
      type: "opera_cadastro_situacao_desconhecida",
      titulo: "Situação cadastral desconhecida",
      corpo: `O fundo devolveu "${situacaoCrua}" no cadastro de ${cliente.cnpj}. Nada foi alterado — confira e atualize o catálogo.`,
      link: "/admin/integracao",
    });
    return { ok: true, detalhe: `Situação "${situacaoCrua}" registrada sem efeito`, operaClienteId: cliente.id };
  }

  await db
    .update(operaClientes)
    .set({
      situacao: aprovado ? "aprovado" : "reprovado",
      motivo: reprovado ? (motivo ?? "Motivo não informado pelo fundo") : null,
      externoId: externoId ?? cliente.externoId,
      protocolo: protocolo ?? cliente.protocolo,
      respondidoEm: new Date(),
      ultimaResposta: payload as never,
      updatedAt: new Date(),
    })
    .where(eq(operaClientes.id, cliente.id));

  if (aprovado) {
    const liberadas = await destravarOperacoesQueEsperam({
      ...cliente,
      situacao: "aprovado",
    });
    return {
      ok: true,
      detalhe: `Cadastro aprovado · ${liberadas} operação(ões) liberada(s) para envio`,
      operaClienteId: cliente.id,
    };
  }

  // Reprovado: uma reprovação nunca fica muda.
  await avisarReprovacaoCadastral(fundo, cliente.id, motivo);
  return {
    ok: true,
    detalhe: "Cadastro reprovado · clientes avisados com o motivo",
    operaClienteId: cliente.id,
  };
}

async function acharCliente(
  fundoId: string,
  chaves: { protocolo?: string | null; externoId?: string | null; cnpj?: string | null },
) {
  if (chaves.protocolo) {
    const [c] = await db
      .select()
      .from(operaClientes)
      .where(
        and(
          eq(operaClientes.fundoId, fundoId),
          eq(operaClientes.protocolo, chaves.protocolo),
        ),
      )
      .limit(1);
    if (c) return c;
  }
  if (chaves.externoId) {
    const [c] = await db
      .select()
      .from(operaClientes)
      .where(
        and(
          eq(operaClientes.fundoId, fundoId),
          eq(operaClientes.externoId, chaves.externoId),
        ),
      )
      .limit(1);
    if (c) return c;
  }
  if (chaves.cnpj) {
    const [c] = await db
      .select()
      .from(operaClientes)
      .where(
        and(eq(operaClientes.fundoId, fundoId), eq(operaClientes.cnpj, chaves.cnpj)),
      )
      .limit(1);
    if (c) return c;
  }
  return null;
}

/** Avisa quem depende desse cadastro — e o admin, porque reprovação
 *  cadastral costuma exigir uma conversa. */
async function avisarReprovacaoCadastral(
  fundo: Fundo,
  operaClienteId: string,
  motivo: string | null,
) {
  const [cliente] = await db
    .select()
    .from(operaClientes)
    .where(eq(operaClientes.id, operaClienteId))
    .limit(1);
  if (!cliente) return;

  const condicao =
    cliente.entidadeTipo === "construtora"
      ? eq(operacoes.construtoraId, cliente.entidadeId)
      : eq(operacoes.imobiliariaId, cliente.entidadeId);

  const afetadas = await db
    .select()
    .from(operacoes)
    .where(and(condicao, eq(operacoes.fundoId, fundo.id)));

  const texto =
    motivo ??
    "O fundo não informou o motivo. Nosso time entra em contato para destravar.";

  for (const op of afetadas) {
    if (["realizada", "cancelada", "recusada"].includes(op.status)) continue;
    await avisarEnvolvidos(op, {
      papeis: ["cedente", "imobiliaria"],
      type: "opera_cadastro_reprovado",
      titulo: `Cadastro não aprovado · operação ${op.numero}`,
      corpo: `O cadastro necessário para esta operação não foi aprovado.\n\nMotivo: ${texto}\n\nAssim que a pendência for resolvida, reenviamos automaticamente.`,
      link: LINK_OPERACAO(op.id),
      email: true,
      assuntoEmail: `Antecipaqui · Cadastro pendente na operação ${op.numero}`,
      urgente: true,
      mensagemCurta: `Antecipaqui: cadastro da operação ${op.numero} precisa de correção. Acesse o painel.`,
    });
  }

  await avisarAdmins({
    type: "opera_cadastro_reprovado_admin",
    titulo: `Cadastro reprovado pelo fundo · ${cliente.cnpj}`,
    corpo: `${cliente.entidadeTipo === "construtora" ? "Construtora" : "Imobiliária"} reprovada. Motivo: ${texto}. Operações afetadas: ${afetadas.length}.`,
    link: "/admin/integracao",
  });
}

/* ═══════════════════════════════════════════
   PEÇA 05 · STATUS DA OPERAÇÃO
   ═══════════════════════════════════════════ */

export async function aplicarStatus(
  fundo: Fundo,
  payload: unknown,
): Promise<ResultadoAplicacao> {
  const contrato = contratoDoFundo(fundo);

  const externoId = lerTexto(payload, contrato.leitura.refOperacaoExterna);
  const nossaRef = lerTexto(payload, contrato.leitura.refOperacaoNossa);
  const espelho = await acharEspelho(fundo.id, { externoId, nossaRef });
  if (!espelho) {
    return { ok: false, detalhe: "Operação não localizada pelos identificadores enviados" };
  }

  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, espelho.operacaoId))
    .limit(1);
  if (!op) return { ok: false, detalhe: "Operação não encontrada" };

  const statusCru = lerTexto(payload, contrato.leitura.statusOperacao) ?? "";
  const observacao = lerTexto(payload, contrato.leitura.observacao);
  const linkAssinatura = lerTexto(payload, contrato.leitura.linkAssinatura);
  const quando = lerTimestamp(payload, contrato.leitura.eventoData) ?? new Date();

  // Fora de ordem não retrocede a esteira — a data do evento manda.
  if (espelho.ultimoEventoEm && quando < espelho.ultimoEventoEm) {
    return {
      ok: true,
      detalhe: "Evento mais antigo que o último aplicado — ignorado",
      operacaoId: op.id,
    };
  }

  const traduzido = traduzirStatus(statusCru);

  await db
    .update(operaOperacoes)
    .set({
      externoId: externoId ?? espelho.externoId,
      statusExterno: statusCru,
      statusLabel: traduzido?.label ?? statusCru,
      statusInterno: traduzido?.interno ?? null,
      statusDesconhecido: !traduzido,
      observacao: observacao ?? null,
      linkAssinatura: linkAssinatura ?? espelho.linkAssinatura,
      linkAssinaturaEm: linkAssinatura ? new Date() : espelho.linkAssinaturaEm,
      ultimoEventoEm: quando,
      ultimaResposta: payload as never,
      updatedAt: new Date(),
    })
    .where(eq(operaOperacoes.id, espelho.id));

  if (!traduzido) {
    // Estado desconhecido: registra, avisa o admin, cliente não vê nada
    // quebrado. Entra no catálogo na primeira atualização.
    await db.insert(operacaoEvents).values({
      operacaoId: op.id,
      type: "opera_status_desconhecido",
      payload: { statusExterno: statusCru, observacao } as never,
    });
    await avisarAdmins({
      type: "opera_status_desconhecido",
      titulo: `Status desconhecido na operação ${op.numero}`,
      corpo: `O fundo enviou "${statusCru}". A esteira do cliente não foi alterada. Confira e inclua no catálogo de status.`,
      link: `/admin/operacoes/${op.id}`,
      operacaoId: op.id,
    });
    return { ok: true, detalhe: `Status "${statusCru}" fora do catálogo — registrado sem efeito`, operacaoId: op.id };
  }

  // Anda a esteira interna. Contrato, assinatura e pagamento são do fundo
  // nesse modelo, então aqui só refletimos o estado — sem regerar nada.
  const mudouStatus = op.status !== traduzido.interno;
  if (mudouStatus) {
    const updates: Partial<typeof operacoes.$inferInsert> = {
      status: traduzido.interno,
      updatedAt: new Date(),
    };
    if (traduzido.interno === "recusada") {
      updates.motivoRecusa =
        observacao ?? "Recusada pelo fundo (motivo não informado)";
    }
    if (traduzido.interno === "realizada") {
      updates.liquidadoEm = quando;
    }
    await db.update(operacoes).set(updates).where(eq(operacoes.id, op.id));
  }

  await db.insert(operacaoEvents).values({
    operacaoId: op.id,
    type: `opera_status_${normalizarStatus(statusCru)}`,
    payload: {
      statusExterno: statusCru,
      statusInterno: traduzido.interno,
      statusAnterior: op.status,
      observacao,
      temLinkAssinatura: Boolean(linkAssinatura),
      quando: quando.toISOString(),
    } as never,
  });

  // Espelha pra quem assina nossos webhooks de saída (fundos e parceiros).
  if (mudouStatus) {
    const { enqueueWebhookEvento } = await import("@/lib/actions/webhooks");
    enqueueWebhookEvento({
      evento: "op_status_change",
      fundoId: op.fundoId,
      payload: {
        operacaoId: op.id,
        numero: op.numero,
        statusAnterior: op.status,
        statusNovo: traduzido.interno,
        origem: "opera",
        statusExterno: statusCru,
        mudouEm: quando.toISOString(),
      },
    }).catch(() => undefined);
  }

  const corpo = [
    traduzido.descricao,
    observacao ? `\nObservação do fundo: ${observacao}` : "",
    traduzido.acao === "assinar" && linkAssinatura
      ? `\n\nLink para assinar: ${linkAssinatura}`
      : "",
  ].join("");

  await avisarEnvolvidos(op, {
    papeis: traduzido.avisar,
    type: `opera_status_${traduzido.interno}`,
    titulo: `Operação ${op.numero} · ${traduzido.label}`,
    corpo,
    link: LINK_OPERACAO(op.id),
    email: traduzido.email,
    assuntoEmail: `Antecipaqui · Operação ${op.numero}: ${traduzido.label.toLowerCase()}`,
    urgente: traduzido.urgente,
    mensagemCurta:
      traduzido.acao === "assinar"
        ? `Antecipaqui: contrato da operação ${op.numero} pronto para assinatura. Acesse o painel.`
        : `Antecipaqui: operação ${op.numero} · ${traduzido.label}.`,
  });

  return {
    ok: true,
    detalhe: `Status aplicado: ${traduzido.label}`,
    operacaoId: op.id,
  };
}

async function acharEspelho(
  fundoId: string,
  chaves: { externoId?: string | null; nossaRef?: string | null },
) {
  if (chaves.externoId) {
    const [e] = await db
      .select()
      .from(operaOperacoes)
      .where(
        and(
          eq(operaOperacoes.fundoId, fundoId),
          eq(operaOperacoes.externoId, chaves.externoId),
        ),
      )
      .limit(1);
    if (e) return e;
  }

  if (chaves.nossaRef) {
    // A referência que mandamos é o UUID da operação; aceitamos também o
    // número visível (OP-2026-0001) porque é o que costuma ser digitado.
    const ehUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        chaves.nossaRef,
      );
    if (ehUuid) {
      const [e] = await db
        .select()
        .from(operaOperacoes)
        .where(eq(operaOperacoes.operacaoId, chaves.nossaRef))
        .limit(1);
      if (e) return e;
    } else {
      const [op] = await db
        .select({ id: operacoes.id })
        .from(operacoes)
        .where(eq(operacoes.numero, chaves.nossaRef))
        .limit(1);
      if (op) {
        const [e] = await db
          .select()
          .from(operaOperacoes)
          .where(eq(operaOperacoes.operacaoId, op.id))
          .limit(1);
        if (e) return e;
      }
    }
  }

  return null;
}

/* ═══════════════════════════════════════════
   PEÇA 06 · DUPLICATAS
   ═══════════════════════════════════════════ */

export async function aplicarDuplicatas(
  fundo: Fundo,
  payload: unknown,
): Promise<ResultadoAplicacao> {
  const contrato = contratoDoFundo(fundo);

  const externoId = lerTexto(payload, contrato.leitura.refOperacaoExterna);
  const nossaRef = lerTexto(payload, contrato.leitura.refOperacaoNossa);
  const espelho = await acharEspelho(fundo.id, { externoId, nossaRef });
  if (!espelho) {
    return { ok: false, detalhe: "Operação não localizada para as duplicatas" };
  }

  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, espelho.operacaoId))
    .limit(1);
  if (!op) return { ok: false, detalhe: "Operação não encontrada" };

  const bruto = ler(payload, contrato.leitura.duplicatasLista);
  const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
  if (lista.length === 0) {
    return { ok: false, detalhe: "Nenhuma duplicata no corpo do evento" };
  }

  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, op.id))
    .orderBy(parcelasComissao.numero);

  let gravadas = 0;
  let semCasamento = 0;

  for (const item of lista) {
    const numero = lerTexto(item, contrato.leitura.duplicataNumero);
    const valor = lerNumero(item, contrato.leitura.duplicataValor);
    const vencimento = lerData(item, contrato.leitura.duplicataVencimento);
    if (!numero || valor === null || !vencimento) {
      semCasamento++;
      continue;
    }

    // Casa pela data de vencimento; havendo empate, pelo valor mais próximo.
    const candidatas = parcelas.filter((p) => p.vencimento === vencimento);
    const parcela =
      candidatas.length === 1
        ? candidatas[0]
        : candidatas.sort(
            (a, b) =>
              Math.abs(Number(a.valor) - valor) -
              Math.abs(Number(b.valor) - valor),
          )[0];
    if (!parcela) semCasamento++;

    const dados = {
      operacaoId: op.id,
      fundoId: fundo.id,
      parcelaId: parcela?.id ?? null,
      numero,
      valor: valor.toFixed(2),
      vencimento,
      sacadoNome: lerTexto(item, contrato.leitura.duplicataSacadoNome),
      sacadoDocumento: lerTexto(item, contrato.leitura.duplicataSacadoDocumento),
      linhaDigitavel: lerTexto(item, contrato.leitura.duplicataLinhaDigitavel),
      codigoBarras: lerTexto(item, contrato.leitura.duplicataCodigoBarras),
      linkExterno: lerTexto(item, contrato.leitura.duplicataLink),
      payload: item as never,
      updatedAt: new Date(),
    };

    const [existente] = await db
      .select({ id: operaDuplicatas.id })
      .from(operaDuplicatas)
      .where(
        and(
          eq(operaDuplicatas.fundoId, fundo.id),
          eq(operaDuplicatas.numero, numero),
        ),
      )
      .limit(1);

    if (existente) {
      await db
        .update(operaDuplicatas)
        .set(dados)
        .where(eq(operaDuplicatas.id, existente.id));
    } else {
      await db.insert(operaDuplicatas).values(dados);
    }

    // A parcela ganha o título pra aparecer onde a construtora já paga.
    if (parcela && dados.linkExterno) {
      await db
        .update(parcelasComissao)
        .set({
          boletoUrl: dados.linkExterno,
          linhaDigitavel: dados.linhaDigitavel ?? parcela.linhaDigitavel,
          cobrancaStatus: "emitida",
        })
        .where(eq(parcelasComissao.id, parcela.id));
    }

    gravadas++;
  }

  await db.insert(operacaoEvents).values({
    operacaoId: op.id,
    type: "opera_duplicatas_recebidas",
    payload: { gravadas, semCasamento } as never,
  });

  if (gravadas > 0) {
    await avisarEnvolvidos(op, {
      papeis: ["construtora", "imobiliaria", "cedente"],
      type: "opera_duplicatas",
      titulo: `Operação ${op.numero} · duplicatas disponíveis`,
      corpo: `${gravadas} ${gravadas === 1 ? "duplicata está disponível" : "duplicatas estão disponíveis"} no painel, com valor, vencimento e link para download.`,
      link: LINK_OPERACAO(op.id),
      email: true,
      assuntoEmail: `Antecipaqui · Duplicatas da operação ${op.numero}`,
    });
  }

  if (semCasamento > 0) {
    await avisarAdmins({
      type: "opera_duplicata_sem_parcela",
      titulo: `Duplicata sem parcela correspondente · ${op.numero}`,
      corpo: `${semCasamento} título(s) não casaram automaticamente com uma parcela. Resolva na aba OPERA da operação.`,
      link: `/admin/operacoes/${op.id}`,
      operacaoId: op.id,
    });
  }

  return {
    ok: true,
    detalhe: `${gravadas} duplicata(s) gravada(s)${semCasamento ? `, ${semCasamento} sem parcela` : ""}`,
    operacaoId: op.id,
  };
}

/** Reenvio manual de uma operação — usado pelo botão do admin na aba OPERA. */
export async function reenviarOperacao(operacaoId: string, fundoId: string) {
  return enfileirarJob({
    fundoId,
    tipo: "enviar_operacao",
    refTipo: "operacao",
    refId: operacaoId,
    operacaoId,
    forcar: true,
  });
}
