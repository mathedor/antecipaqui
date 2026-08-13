/**
 * FILA DE SAÍDA — OPERA CAPITAL
 *
 * Tudo que NÓS mandamos pro fundo passa por aqui. Mesma disciplina da fila de
 * webhooks que já roda em produção: retentativa com espera crescente, erro
 * guardado por extenso e nada perdido se a API do fundo cair.
 *
 * Só enfileira. Quem executa é lib/opera/motor.ts — a separação evita
 * dependência circular com os agentes.
 */
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { operaJobs } from "@/db/schema";

export type OperaJobTipo =
  | "consultar_cliente"
  | "cadastrar_cliente"
  | "enviar_operacao";

/** Espera antes de cada nova tentativa: 1, 5, 25 e 125 minutos. Na quinta
 *  falha o job vira 'desistido' e o admin é quem decide reenviar. */
export const MAX_TENTATIVAS = 4;

export function esperaDaTentativa(tentativa: number): number {
  return Math.min(125, Math.pow(5, Math.max(0, tentativa - 1)));
}

/** Enfileira um job. Idempotente por (tipo, refId): se já existe um job vivo
 *  pra mesma referência, não cria outro — reenvio duplicado é o erro mais
 *  fácil de cometer numa integração e o mais caro de explicar depois. */
export async function enfileirarJob(input: {
  fundoId: string;
  tipo: OperaJobTipo;
  refTipo: "opera_cliente" | "operacao";
  refId: string;
  operacaoId?: string | null;
  payload?: Record<string, unknown>;
  /** Força um job novo mesmo havendo um vivo (usado no botão de reenviar). */
  forcar?: boolean;
}): Promise<{ criado: boolean; jobId: string }> {
  if (!input.forcar) {
    const [vivo] = await db
      .select({ id: operaJobs.id })
      .from(operaJobs)
      .where(
        and(
          eq(operaJobs.tipo, input.tipo),
          eq(operaJobs.refId, input.refId),
          inArray(operaJobs.status, ["pendente", "processando", "bloqueado"]),
        ),
      )
      .limit(1);
    if (vivo) return { criado: false, jobId: vivo.id };
  }

  const [criado] = await db
    .insert(operaJobs)
    .values({
      fundoId: input.fundoId,
      tipo: input.tipo,
      refTipo: input.refTipo,
      refId: input.refId,
      operacaoId: input.operacaoId ?? null,
      payload: (input.payload ?? {}) as never,
      status: "pendente",
      proximaTentativaEm: new Date(),
    })
    .returning({ id: operaJobs.id });

  return { criado: true, jobId: criado.id };
}

/** Marca um job como concluído, guardando o que o fundo respondeu. */
export async function concluirJob(
  jobId: string,
  resultado: Record<string, unknown>,
) {
  await db
    .update(operaJobs)
    .set({
      status: "concluido",
      resultado: resultado as never,
      ultimoErro: null,
      concluidoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(operaJobs.id, jobId));
}

/** Falha recuperável: agenda a próxima tentativa ou desiste depois da quarta. */
export async function falharJob(
  jobId: string,
  tentativasAtuais: number,
  erro: string,
) {
  const tentativas = tentativasAtuais + 1;
  const desistiu = tentativas >= MAX_TENTATIVAS;
  await db
    .update(operaJobs)
    .set({
      status: desistiu ? "desistido" : "pendente",
      tentativas,
      ultimoErro: erro.slice(0, 500),
      proximaTentativaEm: desistiu
        ? null
        : new Date(Date.now() + esperaDaTentativa(tentativas) * 60_000),
      updatedAt: new Date(),
    })
    .where(eq(operaJobs.id, jobId));
  return { desistiu, tentativas };
}

/** Falha que NÃO é do fundo — falta documento, falta dado nosso. Fica
 *  'bloqueado' esperando o cliente agir; retentar sozinho não adiantaria. */
export async function bloquearJob(jobId: string, motivo: string) {
  await db
    .update(operaJobs)
    .set({
      status: "bloqueado",
      ultimoErro: motivo.slice(0, 500),
      proximaTentativaEm: null,
      updatedAt: new Date(),
    })
    .where(eq(operaJobs.id, jobId));
}

/** Destrava um job bloqueado — chamado quando o cliente completa o que
 *  faltava, ou pelo admin na aba OPERA da operação. */
export async function destravarJob(jobId: string) {
  await db
    .update(operaJobs)
    .set({
      status: "pendente",
      ultimoErro: null,
      proximaTentativaEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(operaJobs.id, jobId));
}
