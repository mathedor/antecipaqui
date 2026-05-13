"use client";

import { useActionState, useState } from "react";
import {
  uploadDocConstrutoraAction,
  type UploadDocState,
} from "@/lib/actions/construtora-upload-doc";
import { FileUploadField, type UploadedBlob } from "@/components/file-upload-field";

const TIPO_LABELS: { value: string; label: string }[] = [
  { value: "comprovante_entrada", label: "Comprovante de pagamento" },
  { value: "nota_fiscal", label: "Nota fiscal" },
  { value: "contrato_venda", label: "Contrato de venda" },
  { value: "contrato_comissao", label: "Contrato de comissão" },
  { value: "outro", label: "Outro documento" },
];

export function ConstrutoraUploadDocForm({ operacaoId }: { operacaoId: string }) {
  const [state, action, pending] = useActionState<UploadDocState, FormData>(
    uploadDocConstrutoraAction,
    null,
  );
  const [tipo, setTipo] = useState("comprovante_entrada");
  const [blob, setBlob] = useState<UploadedBlob | null>(null);

  return (
    <form
      action={action}
      className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6 space-y-4"
    >
      <div className="flex items-start gap-3 mb-1">
        <span className="text-2xl">📎</span>
        <div>
          <h3 className="font-bold tracking-tight">Anexar documento</h3>
          <p className="text-xs text-fg-muted">
            Envie comprovantes de pagamento, contratos ou outros documentos
            relacionados a esta operação.
          </p>
        </div>
      </div>

      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-50 text-success p-3 text-sm">
          Documento anexado com sucesso.
        </div>
      )}

      <input type="hidden" name="operacaoId" value={operacaoId} />

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Tipo
        </label>
        <select
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="w-full bg-bg h-11 px-3 rounded-xl border border-border-strong text-fg outline-none focus:border-accent transition-colors"
        >
          {TIPO_LABELS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <FileUploadField
        label="Arquivo"
        name="url"
        folder={`operacoes/${operacaoId}/construtora`}
        accept="application/pdf,image/jpeg,image/png,image/webp"
        maxMB={10}
        onChange={setBlob}
      />
      <input type="hidden" name="nomeOriginal" value={blob?.name ?? ""} />
      <input type="hidden" name="sizeBytes" value={blob?.size ?? ""} />
      <input type="hidden" name="mimeType" value={blob?.contentType ?? ""} />

      <button
        type="submit"
        disabled={!blob || pending}
        className="btn-primary !h-11 !px-5 disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Anexar"}
      </button>
    </form>
  );
}
