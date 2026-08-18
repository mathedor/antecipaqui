/**
 * PORTA DE ENTRADA DOS WEBHOOKS DO FUNDO.
 *
 * Todas as três peças de escuta passam por aqui, na mesma ordem:
 *   1. acha o fundo e confere se a integração está ligada
 *   2. confere a assinatura ANTES de olhar o conteúdo
 *   3. grava o evento cru (é o que permite reprocessar depois)
 *   4. desiste em silêncio se já processamos esse evento (idempotência)
 *   5. só então aplica o efeito
 *
 * Assinatura inválida responde 401 e fica registrada — tentativa de entrega
 * forjada é informação de segurança, não lixo pra descartar.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos, operaEventos, type Fundo } from "@/db/schema";
import {
  conferirAssinatura,
  contratoDoFundo,
  idDoEvento,
} from "@/lib/opera/client";
import { lerTexto } from "@/lib/opera/contrato";
import {
  aplicarCadastro,
  aplicarDuplicatas,
  aplicarStatus,
  type ResultadoAplicacao,
} from "@/lib/opera/aplicar";
import { consumirDistribuido } from "@/lib/seguranca/rate-limit";

export type TipoWebhook = "cadastro" | "status" | "duplicatas";

/** Corpo de webhook do fundo é pequeno (JSON de status/duplicatas). Um corpo
 *  gigante só serviria pra encher `opera_eventos` — cortamos antes de gravar. */
const MAX_CORPO_BYTES = 512 * 1024;
/** Teto por fundo: generoso pra não barrar rajada legítima de status, mas
 *  impede flood de eventos por quem descobriu o fundoId (UUID não enumerável). */
const HOOK_LIMITE = 120;
const HOOK_JANELA_MS = 10_000;

export type RespostaWebhook = {
  http: number;
  corpo: Record<string, unknown>;
};

export async function receberWebhook(input: {
  fundoId: string;
  tipo: TipoWebhook;
  corpoCru: string;
  headers: Record<string, string>;
}): Promise<RespostaWebhook> {
  // Corpo absurdo nem chega a virar linha no banco.
  if (input.corpoCru.length > MAX_CORPO_BYTES) {
    return { http: 413, corpo: { erro: "Corpo do webhook grande demais" } };
  }

  // Teto por fundo — contém flood de eventos sem barrar rajada legítima.
  const lim = await consumirDistribuido(
    `operahook:${input.fundoId}`,
    HOOK_LIMITE,
    HOOK_JANELA_MS,
  );
  if (!lim.ok) {
    return {
      http: 429,
      corpo: { erro: "Muitos eventos em sequência", retryEmSeg: lim.retryEmSeg },
    };
  }

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, input.fundoId))
    .limit(1);

  if (!fundo) {
    return { http: 404, corpo: { erro: "Fundo não encontrado" } };
  }
  if (fundo.integracaoTipo === "nenhuma") {
    return {
      http: 409,
      corpo: { erro: "Integração não está ativa para este fundo" },
    };
  }
  if (!fundo.integracaoWebhookSecret) {
    return {
      http: 409,
      corpo: { erro: "Integração sem segredo de assinatura configurado" },
    };
  }

  const contrato = contratoDoFundo(fundo);
  const assinatura =
    input.headers[contrato.assinatura.header.toLowerCase()] ?? null;

  const assinaturaOk = conferirAssinatura(
    fundo.integracaoWebhookSecret,
    input.corpoCru,
    assinatura,
    contrato,
  );

  let payload: unknown = null;
  try {
    payload = input.corpoCru ? JSON.parse(input.corpoCru) : null;
  } catch {
    payload = { _naoJson: input.corpoCru.slice(0, 2000) };
  }

  const eventoId = idDoEvento(
    lerTexto(payload, contrato.leitura.eventoId),
    input.corpoCru,
  );

  // Grava sempre — inclusive o que chegou com assinatura inválida.
  const inseridos = await db
    .insert(operaEventos)
    .values({
      fundoId: fundo.id,
      tipo: input.tipo,
      externoEventoId: eventoId,
      assinaturaValida: assinaturaOk,
      payload: (payload ?? {}) as never,
      headers: input.headers as never,
      status: assinaturaOk ? "recebido" : "erro",
      erro: assinaturaOk ? null : "Assinatura inválida",
    })
    .onConflictDoNothing({
      target: [
        operaEventos.fundoId,
        operaEventos.tipo,
        operaEventos.externoEventoId,
      ],
    })
    .returning({ id: operaEventos.id });

  if (!assinaturaOk) {
    return { http: 401, corpo: { erro: "Assinatura inválida" } };
  }

  // Já conhecíamos esse evento: reentrega não produz efeito novo.
  if (inseridos.length === 0) {
    const [anterior] = await db
      .select({ id: operaEventos.id, status: operaEventos.status })
      .from(operaEventos)
      .where(
        and(
          eq(operaEventos.fundoId, fundo.id),
          eq(operaEventos.tipo, input.tipo),
          eq(operaEventos.externoEventoId, eventoId),
        ),
      )
      .limit(1);

    // Se ficou em erro na primeira vez, a reentrega é uma chance de acertar.
    if (anterior && anterior.status === "erro") {
      return processar(fundo, input.tipo, payload, anterior.id);
    }
    return {
      http: 200,
      corpo: { ok: true, duplicado: true, eventoId },
    };
  }

  return processar(fundo, input.tipo, payload, inseridos[0].id);
}

async function processar(
  fundo: Fundo,
  tipo: TipoWebhook,
  payload: unknown,
  eventoLinhaId: string,
): Promise<RespostaWebhook> {
  let r: ResultadoAplicacao;
  try {
    r =
      tipo === "cadastro"
        ? await aplicarCadastro(fundo, payload)
        : tipo === "status"
          ? await aplicarStatus(fundo, payload)
          : await aplicarDuplicatas(fundo, payload);
  } catch (e) {
    const msg = (e as Error).message;
    await db
      .update(operaEventos)
      .set({ status: "erro", erro: msg.slice(0, 500), processadoEm: new Date() })
      .where(eq(operaEventos.id, eventoLinhaId));
    console.error(`[opera/${tipo}]`, msg);
    // 500 pede reentrega ao fundo — o evento cru já está guardado aqui.
    return { http: 500, corpo: { erro: "Falha ao processar", detalhe: msg } };
  }

  await db
    .update(operaEventos)
    .set({
      status: r.ok ? "processado" : "ignorado",
      erro: r.ok ? null : r.detalhe,
      operacaoId: r.operacaoId ?? null,
      operaClienteId: r.operaClienteId ?? null,
      processadoEm: new Date(),
    })
    .where(eq(operaEventos.id, eventoLinhaId));

  // Não achar a operação é problema de dado, não de servidor: 422 evita que
  // o fundo fique reentregando pra sempre o que nunca vai casar.
  return {
    http: r.ok ? 200 : 422,
    corpo: { ok: r.ok, detalhe: r.detalhe },
  };
}

/** Reprocessa um evento já gravado — usado pelo admin depois de corrigir uma
 *  regra ou o mapeamento de campos. Não fala com o fundo. */
export async function reprocessarEvento(eventoId: string) {
  const [ev] = await db
    .select()
    .from(operaEventos)
    .where(eq(operaEventos.id, eventoId))
    .limit(1);
  if (!ev) return { ok: false, detalhe: "Evento não encontrado" };

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, ev.fundoId))
    .limit(1);
  if (!fundo) return { ok: false, detalhe: "Fundo não encontrado" };

  const r = await processar(
    fundo,
    ev.tipo as TipoWebhook,
    ev.payload,
    ev.id,
  );
  return { ok: r.http === 200, detalhe: String(r.corpo.detalhe ?? r.corpo.erro ?? "") };
}
