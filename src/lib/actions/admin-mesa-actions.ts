"use server";

import { revalidatePath } from "next/cache";
import { changeOperacaoStatusAction } from "@/lib/actions/status-flow";

export type AcaoOpState =
  | { ok: false; error: string }
  | { ok: true; novoStatus: string }
  | null;

/** Wrapper de FormData pra changeOperacaoStatusAction.
 *  Usado nos botões de ação inline da mesa de decisão admin. */
export async function executarAcaoOpAction(
  _prev: AcaoOpState,
  formData: FormData,
): Promise<AcaoOpState> {
  const operacaoId = String(formData.get("operacaoId") || "").trim();
  const novoStatus = String(formData.get("novoStatus") || "").trim();
  const motivo = String(formData.get("motivo") || "").trim();

  if (!operacaoId) return { ok: false, error: "operacaoId obrigatório" };
  if (!novoStatus) return { ok: false, error: "novoStatus obrigatório" };

  const statusValidos = [
    "documentos_incompletos",
    "pre_aprovada",
    "analise_final",
    "recusada",
    "enviada_para_assinatura",
    "enviada_para_pagamento",
    "realizada",
    "cancelada",
    "aguardando_aprovacao",
  ] as const;
  type StatusValido = (typeof statusValidos)[number];
  if (!(statusValidos as readonly string[]).includes(novoStatus)) {
    return { ok: false, error: `Status inválido: ${novoStatus}` };
  }

  try {
    await changeOperacaoStatusAction({
      operacaoId,
      newStatus: novoStatus as StatusValido,
      motivo: motivo || undefined,
    });
    revalidatePath("/admin/decidir");
    revalidatePath("/admin/operacoes");
    revalidatePath(`/admin/operacoes/${operacaoId}`);
    return { ok: true, novoStatus };
  } catch (e) {
    const msg = (e as Error).message || "Erro ao mudar status";
    return { ok: false, error: msg };
  }
}
