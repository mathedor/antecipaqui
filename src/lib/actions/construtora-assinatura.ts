"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { construtoras, operacoes } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

/** Status nos quais a construtora pode revisar/assinar a operação. */
const STATUS_ASSINAVEIS = [
  "pre_aprovada",
  "analise_final",
  "enviada_para_assinatura",
] as const;

export type AssinarState =
  | { ok: false; error: string }
  | { ok: true; action: "assinada" | "recusada" }
  | null;

/** Captura IP do header X-Forwarded-For (Vercel) ou similar. */
async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = h.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export async function assinarOperacaoAction(
  _prev: AssinarState,
  formData: FormData,
): Promise<AssinarState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "construtora")
    return { ok: false, error: "Apenas construtora pode assinar" };

  const operacaoId = String(formData.get("operacaoId") || "").trim();
  const decisao = String(formData.get("decisao") || "").trim();
  const motivo = String(formData.get("motivo") || "").trim().slice(0, 500);

  if (!operacaoId) return { ok: false, error: "operacaoId obrigatório" };
  if (decisao !== "assinar" && decisao !== "recusar")
    return { ok: false, error: "Decisão inválida" };
  if (decisao === "recusar" && !motivo)
    return { ok: false, error: "Motivo obrigatório pra recusar" };

  // Confirma que a op é da construtora desse user
  const [construtora] = await db
    .select({ id: construtoras.id })
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!construtora) return { ok: false, error: "Construtora não encontrada" };

  const [op] = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      construtoraId: operacoes.construtoraId,
      status: operacoes.status,
      construtoraAssinadaEm: operacoes.construtoraAssinadaEm,
      construtoraRecusouAssinaturaEm: operacoes.construtoraRecusouAssinaturaEm,
    })
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op || op.construtoraId !== construtora.id)
    return { ok: false, error: "Operação não pertence à sua construtora" };

  if (!STATUS_ASSINAVEIS.includes(op.status as (typeof STATUS_ASSINAVEIS)[number])) {
    return {
      ok: false,
      error: "Operação não está em fase de assinatura",
    };
  }
  if (op.construtoraAssinadaEm) {
    return { ok: false, error: "Operação já foi assinada" };
  }
  if (op.construtoraRecusouAssinaturaEm) {
    return { ok: false, error: "Operação já foi recusada antes" };
  }

  const ip = await getClientIp();

  if (decisao === "assinar") {
    await db
      .update(operacoes)
      .set({
        construtoraAssinadaEm: new Date(),
        construtoraAssinadaPorUserId: user.id,
        construtoraAssinaturaIp: ip,
        updatedAt: new Date(),
      })
      .where(eq(operacoes.id, operacaoId));
  } else {
    await db
      .update(operacoes)
      .set({
        construtoraRecusouAssinaturaEm: new Date(),
        construtoraRecusaAssinaturaMotivo: motivo,
        updatedAt: new Date(),
      })
      .where(eq(operacoes.id, operacaoId));
  }

  await audit({
    action:
      decisao === "assinar"
        ? "construtora_assinou_op"
        : "construtora_recusou_assinatura",
    targetType: "operacao",
    targetId: operacaoId,
    targetLabel: op.numero,
    metadata: {
      construtoraId: construtora.id,
      ip,
      motivo: motivo || null,
    },
  });

  revalidatePath(`/painel/operacoes/${operacaoId}`);
  revalidatePath("/painel/operacoes");
  revalidatePath("/painel");
  return {
    ok: true,
    action: decisao === "assinar" ? "assinada" : "recusada",
  };
}

/** Lista ops aguardando assinatura da construtora (pendentes, dentro do
 *  range de status assináveis). */
export async function listOpsAssinarConstrutora(construtoraId: string) {
  return db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      numeroParcelas: operacoes.numeroParcelas,
      dataVenda: operacoes.dataVenda,
      createdAt: operacoes.createdAt,
    })
    .from(operacoes)
    .where(
      and(
        eq(operacoes.construtoraId, construtoraId),
        isNull(operacoes.construtoraAssinadaEm),
        isNull(operacoes.construtoraRecusouAssinaturaEm),
        inArray(operacoes.status, [
          "pre_aprovada",
          "analise_final",
          "enviada_para_assinatura",
        ]),
      ),
    );
}
