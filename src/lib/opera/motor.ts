/**
 * MOTOR DA FILA — executa os jobs de saída da integração.
 *
 * Chamado pelo cron a cada 5 minutos e, opcionalmente, logo depois de
 * enfileirar (pra operação não esperar o próximo tique). Um job por vez, com
 * marcação de 'processando' antes da chamada externa — dois crons
 * simultâneos não disparam o mesmo envio duas vezes.
 */
import { and, asc, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { operaJobs, operacoes } from "@/db/schema";
import {
  cadastrarCliente,
  consultarCliente,
  enviarOperacao,
  type ResultadoAgente,
} from "@/lib/opera/agentes";
import { bloquearJob, concluirJob, falharJob } from "@/lib/opera/fila";
import { avisarAdmins } from "@/lib/opera/notificar";

const ROTULO_JOB: Record<string, string> = {
  consultar_cliente: "consulta de cadastro",
  cadastrar_cliente: "cadastro do cliente",
  enviar_operacao: "envio da operação",
};

async function executar(job: typeof operaJobs.$inferSelect): Promise<ResultadoAgente> {
  switch (job.tipo) {
    case "consultar_cliente":
      return consultarCliente(job.refId);
    case "cadastrar_cliente":
      return cadastrarCliente(job.refId);
    case "enviar_operacao":
      return enviarOperacao(job.refId);
    default:
      return { tipo: "bloqueado", motivo: `Tipo de job desconhecido: ${job.tipo}` };
  }
}

export async function processarFilaOpera(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 25;
  const agora = new Date();

  const pendentes = await db
    .select()
    .from(operaJobs)
    .where(
      and(
        eq(operaJobs.status, "pendente"),
        or(
          isNull(operaJobs.proximaTentativaEm),
          lte(operaJobs.proximaTentativaEm, agora),
        ),
      ),
    )
    .orderBy(asc(operaJobs.createdAt))
    .limit(limit);

  let concluidos = 0;
  let falhados = 0;
  let bloqueados = 0;

  for (const job of pendentes) {
    // Trava otimista: só executa quem conseguiu virar 'processando'.
    const travados = await db
      .update(operaJobs)
      .set({ status: "processando", updatedAt: new Date() })
      .where(and(eq(operaJobs.id, job.id), eq(operaJobs.status, "pendente")))
      .returning({ id: operaJobs.id });
    if (travados.length === 0) continue;

    let r: ResultadoAgente;
    try {
      r = await executar(job);
    } catch (e) {
      r = { tipo: "retentar", erro: (e as Error).message };
    }

    if (r.tipo === "ok") {
      concluidos++;
      await concluirJob(job.id, r.resultado);
      continue;
    }

    if (r.tipo === "bloqueado") {
      bloqueados++;
      await bloquearJob(job.id, r.motivo);
      await avisarAdminDoJob(job, r.motivo, "bloqueado");
      continue;
    }

    falhados++;
    const { desistiu } = await falharJob(job.id, job.tentativas, r.erro);
    if (desistiu) await avisarAdminDoJob(job, r.erro, "desistido");
  }

  return {
    total: pendentes.length,
    concluidos,
    falhados,
    bloqueados,
  };
}

/** Job travado tem dono: o admin é avisado com o número da operação e o
 *  motivo exato, não com um erro genérico de integração. */
async function avisarAdminDoJob(
  job: typeof operaJobs.$inferSelect,
  motivo: string,
  situacao: "bloqueado" | "desistido",
) {
  let numero = "";
  if (job.operacaoId) {
    const [op] = await db
      .select({ numero: operacoes.numero })
      .from(operacoes)
      .where(eq(operacoes.id, job.operacaoId))
      .limit(1);
    numero = op?.numero ?? "";
  }

  const rotulo = ROTULO_JOB[job.tipo] ?? job.tipo;
  await avisarAdmins({
    type: `opera_job_${situacao}`,
    titulo:
      situacao === "bloqueado"
        ? `Integração parada${numero ? ` · ${numero}` : ""}`
        : `Integração falhou${numero ? ` · ${numero}` : ""}`,
    corpo:
      situacao === "bloqueado"
        ? `A ${rotulo} está esperando uma correção: ${motivo}`
        : `A ${rotulo} falhou nas quatro tentativas. Último erro: ${motivo}`,
    link: job.operacaoId
      ? `/admin/operacoes/${job.operacaoId}`
      : "/admin/integracao",
    operacaoId: job.operacaoId ?? undefined,
  });
}
