"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoras, documentos, operacoes } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

const TIPOS_VALIDOS = [
  "contrato_venda",
  "contrato_comissao",
  "nota_fiscal",
  "comprovante_entrada",
  "outro",
] as const;

export type UploadDocState =
  | { ok: false; error: string }
  | { ok: true; docId: string }
  | null;

/** Construtora anexa documento à operação dela (comprovante, contrato, etc.) */
export async function uploadDocConstrutoraAction(
  _prev: UploadDocState,
  formData: FormData,
): Promise<UploadDocState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "construtora")
    return { ok: false, error: "Apenas construtora pode usar este formulário" };

  const operacaoId = String(formData.get("operacaoId") || "").trim();
  const tipo = String(formData.get("tipo") || "").trim();
  const url = String(formData.get("url") || "").trim();
  const nomeOriginal = String(formData.get("nomeOriginal") || "").trim();
  const sizeBytes = parseInt(String(formData.get("sizeBytes") || "0"), 10) || null;
  const mimeType = String(formData.get("mimeType") || "").trim() || null;

  if (!operacaoId) return { ok: false, error: "operacaoId obrigatório" };
  if (!url) return { ok: false, error: "Arquivo não foi enviado" };
  if (!(TIPOS_VALIDOS as readonly string[]).includes(tipo))
    return { ok: false, error: "Tipo de documento inválido" };

  // Confirma que op é da construtora desse user
  const [c] = await db
    .select({ id: construtoras.id })
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return { ok: false, error: "Construtora não encontrada" };

  const [op] = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      construtoraId: operacoes.construtoraId,
    })
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op || op.construtoraId !== c.id)
    return { ok: false, error: "Operação não pertence à sua construtora" };

  const [inserted] = await db
    .insert(documentos)
    .values({
      tipo: tipo as (typeof TIPOS_VALIDOS)[number],
      url,
      nomeOriginal: nomeOriginal || "documento",
      sizeBytes,
      mimeType,
      construtoraId: c.id,
      operacaoId,
    })
    .returning({ id: documentos.id });

  await audit({
    action: "construtora_anexou_doc",
    targetType: "operacao",
    targetId: operacaoId,
    targetLabel: op.numero,
    metadata: { tipo, docId: inserted.id, nomeOriginal },
  });

  revalidatePath(`/painel/operacoes/${operacaoId}`);
  return { ok: true, docId: inserted.id };
}
