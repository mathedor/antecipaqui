/** Lê os campos de validação por IA gravados como hidden inputs pelo
 *  FileUploadField, dado o `name` base do upload. Retorna campos prontos
 *  pra spread no .values() do INSERT em documentos.
 *
 *  Exemplo de uso numa server action:
 *    const docs = await db.insert(documentos).values({
 *      ...buildDocFields(formData, "doc_contrato_social"),
 *      tipo: "contrato_social",
 *      url: ...,
 *      ...
 *    });
 */
export type ValidacaoFields = {
  validacaoStatus: "ok" | "revisao" | null;
  validacaoConfianca: string | null; // numeric column — string no Drizzle
  validacaoMotivo: string | null;
};

export function extractValidacao(
  formData: FormData,
  nameBase: string,
): ValidacaoFields {
  const status = String(formData.get(`${nameBase}_validacao_status`) || "").trim();
  const confiancaRaw = String(
    formData.get(`${nameBase}_validacao_confianca`) || "",
  ).trim();
  const motivo = String(formData.get(`${nameBase}_validacao_motivo`) || "").trim();

  const validacaoStatus: ValidacaoFields["validacaoStatus"] =
    status === "ok" || status === "revisao" ? status : null;

  let validacaoConfianca: string | null = null;
  if (confiancaRaw) {
    const n = parseFloat(confiancaRaw);
    if (Number.isFinite(n) && n >= 0 && n <= 1) {
      validacaoConfianca = n.toFixed(2);
    }
  }

  return {
    validacaoStatus,
    validacaoConfianca,
    validacaoMotivo: motivo ? motivo.slice(0, 500) : null,
  };
}
