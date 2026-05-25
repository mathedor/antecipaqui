"use client";

import { useId, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { sanitizeFileName } from "@/lib/sanitize-filename";
import { toBlobProxyHref } from "@/lib/blob-url";

export type UploadedBlob = {
  url: string;
  pathname: string;
  size: number;
  name: string;
  contentType?: string;
  /** Resultado da validação IA quando `tipo` foi passado. */
  validacaoStatus?: "ok" | "revisao";
  validacaoMotivo?: string;
  validacaoConfianca?: number;
};

type Props = {
  label: string;
  /** Hidden input name used for form submission (URL). */
  name: string;
  required?: boolean;
  description?: string;
  /** Pasta de prefixo no Blob (ex: 'kyc' ou 'operacoes/...') — usado só
   *  quando `tipo` não é passado (fluxo antigo). */
  folder?: string;
  /** Tipo de documento esperado. Quando passado, ativa a validação IA
   *  do conteúdo do arquivo antes de aceitar o upload. */
  tipo?: string;
  /** Tipo MIME aceito */
  accept?: string;
  /** Tamanho máximo em MB */
  maxMB?: number;
  /** Callback opcional pra notificar parent quando upload conclui */
  onChange?: (blob: UploadedBlob | null) => void;
  /** Se passado, mostra como "já enviado" — usuário pode substituir.
   *  URL é submetida como hidden value pra preservar o arquivo. */
  initial?: { url: string; name: string } | null;
};

export function FileUploadField({
  label,
  name,
  required,
  description,
  folder = "geral",
  tipo,
  accept = "application/pdf,image/jpeg,image/png,image/webp",
  maxMB = 15,
  onChange,
  initial = null,
}: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [blob, setBlob] = useState<UploadedBlob | null>(
    initial
      ? {
          url: initial.url,
          pathname: initial.url,
          size: 0,
          name: initial.name,
        }
      : null,
  );
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "validating" | "done" | "error" | "rejected"
  >(initial ? "done" : "idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rejectionMotivo, setRejectionMotivo] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setBlob(null);
    setProgress(0);
    setStatus("idle");
    setErrorMsg(null);
    setRejectionMotivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.(null);
  }

  /** Fluxo legado: upload client-side direto pro Blob via @vercel/blob/client */
  async function uploadLegado(file: File) {
    const safeName = sanitizeFileName(file.name);
    const path = `${folder}/${Date.now()}-${safeName}`;
    const newBlob = await upload(path, file, {
      access: "private",
      handleUploadUrl: "/api/upload",
      contentType: file.type || undefined,
      onUploadProgress: (e) => setProgress(e.percentage),
    });
    return {
      url: newBlob.url,
      pathname: newBlob.pathname,
      size: file.size,
      name: file.name,
      contentType: file.type,
    } as UploadedBlob;
  }

  /** Fluxo com validação IA.
   *  Passo 1: sobe o arquivo DIRETO pro Blob (client-side). Isso evita o
   *  limite rígido de 4,5 MB do corpo das funções serverless da Vercel —
   *  que era a causa do "Erro 413 no upload" em fotos grandes de iPhone/iPad.
   *  Passo 2: manda só a URL (JSON minúsculo) pro servidor validar o conteúdo
   *  por IA, lendo o arquivo de volta do Blob. */
  async function uploadValidado(
    file: File,
    tipoDoc: string,
  ): Promise<{ ok: true; blob: UploadedBlob } | { ok: false; motivo: string }> {
    // Passo 1 — upload direto pro Blob (sem passar pela função → sem 413)
    setStatus("uploading");
    setProgress(0);
    const safeName = sanitizeFileName(file.name);
    const path = `${folder}/${tipoDoc}/${Date.now()}-${safeName}`;
    const uploaded = await upload(path, file, {
      access: "private",
      handleUploadUrl: "/api/upload",
      contentType: file.type || undefined,
      onUploadProgress: (e) => setProgress(Math.min(90, e.percentage)),
    });

    // Passo 2 — valida o conteúdo server-side (corpo é só JSON)
    setStatus("validating");
    const res = await fetch("/api/upload-validado", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: uploaded.url,
        pathname: uploaded.pathname,
        tipo: tipoDoc,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 422) {
      return {
        ok: false,
        motivo:
          data.motivo ??
          "O arquivo não bate com o tipo esperado. Envie versão mais clara.",
      };
    }
    if (!res.ok) {
      throw new Error(data.error ?? `Erro ${res.status} na validação`);
    }
    return {
      ok: true,
      blob: {
        url: data.url,
        pathname: data.pathname,
        size: file.size,
        name: file.name,
        contentType: file.type,
        validacaoStatus: data.status,
        validacaoMotivo: data.motivo,
        validacaoConfianca: data.confianca,
      },
    };
  }

  async function handleFile(file: File) {
    setErrorMsg(null);
    setRejectionMotivo(null);
    if (file.size > maxMB * 1024 * 1024) {
      setStatus("error");
      setErrorMsg(`Arquivo maior que ${maxMB}MB`);
      return;
    }
    setStatus("uploading");
    setProgress(0);
    try {
      let uploaded: UploadedBlob;
      if (tipo) {
        const result = await uploadValidado(file, tipo);
        if (!result.ok) {
          setStatus("rejected");
          setRejectionMotivo(result.motivo);
          onChange?.(null);
          return;
        }
        uploaded = result.blob;
      } else {
        uploaded = await uploadLegado(file);
      }
      setBlob(uploaded);
      setStatus("done");
      setProgress(100);
      onChange?.(uploaded);
    } catch (e) {
      setStatus("error");
      const msg = (e as Error).message || "Erro no upload";
      console.error("[file-upload]", e, {
        file: file.name,
        type: file.type,
        size: file.size,
      });
      setErrorMsg(msg);
    }
  }

  const sizeLabel = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono"
      >
        {label}
        {required && <span className="ml-1 text-accent">*</span>}
      </label>

      {/* Hidden input com a URL pra submit no form action.
          NÃO usa `required` em hidden — Chrome/Firefox bloqueiam submit
          silenciosamente em hidden required vazios. A validação do
          obrigatório é feita pelo botão (disabled) + server action. */}
      <input type="hidden" name={name} value={blob?.url ?? ""} />
      {/* Campos de validação por IA — server actions leem com extractValidacao
          do helper validacao-form.ts pra persistir em documentos.validacao_*. */}
      <input
        type="hidden"
        name={`${name}_validacao_status`}
        value={blob?.validacaoStatus ?? ""}
      />
      <input
        type="hidden"
        name={`${name}_validacao_confianca`}
        value={
          blob?.validacaoConfianca != null
            ? String(blob.validacaoConfianca)
            : ""
        }
      />
      <input
        type="hidden"
        name={`${name}_validacao_motivo`}
        value={blob?.validacaoMotivo ?? ""}
      />

      {status === "idle" && (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`flex items-center justify-between gap-3 px-4 h-12 rounded-xl border border-dashed transition-colors cursor-pointer text-sm ${
            dragOver
              ? "border-accent bg-accent-soft text-accent"
              : "border-border-strong bg-bg hover:border-accent hover:bg-accent-soft text-fg-muted"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {dragOver ? "Solte o arquivo aqui" : "Selecionar ou arrastar arquivo"}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            PDF · JPG · PNG · até {maxMB}MB
          </span>
        </label>
      )}

      {(status === "uploading" || status === "validating") && (
        <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-accent/50 bg-accent-soft text-sm">
          <div className="flex-1">
            <div className="text-fg text-xs mb-1">
              {status === "validating"
                ? "Validando conteúdo do arquivo…"
                : "Enviando…"}
            </div>
            <div className="h-1 bg-bg-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-xs text-accent tabular">
            {Math.round(progress)}%
          </span>
        </div>
      )}

      {status === "done" && blob && (
        <div className="space-y-1.5">
          <div
            className={`flex items-center gap-3 px-4 h-12 rounded-xl border text-sm ${
              blob.validacaoStatus === "revisao"
                ? "border-warn/50 bg-yellow-50"
                : "border-success/50 bg-green-50"
            }`}
          >
            <span
              className={`size-5 rounded-full text-white text-[10px] flex items-center justify-center shrink-0 ${
                blob.validacaoStatus === "revisao" ? "bg-warn" : "bg-success"
              }`}
            >
              {blob.validacaoStatus === "revisao" ? "?" : "✓"}
            </span>
            <a
              href={toBlobProxyHref(blob.url)}
              target="_blank"
              rel="noopener"
              className="flex-1 truncate text-fg hover:text-accent transition-colors"
              title={blob.name}
            >
              {blob.name}
            </a>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              {sizeLabel(blob.size)}
            </span>
            <button
              type="button"
              onClick={reset}
              className="text-fg-dim hover:text-danger text-xs"
              aria-label="Remover"
            >
              ✕
            </button>
          </div>
          {blob.validacaoMotivo && blob.validacaoStatus && (
            <p
              className={`text-[11px] ${
                blob.validacaoStatus === "revisao" ? "text-warn" : "text-fg-dim"
              }`}
            >
              {blob.validacaoStatus === "revisao" && "⚠ "}
              {blob.validacaoMotivo}
            </p>
          )}
        </div>
      )}

      {status === "rejected" && (
        <div className="flex items-start gap-3 px-4 py-2.5 rounded-xl border border-danger/50 bg-red-50 text-sm">
          <span className="size-5 rounded-full bg-danger text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">
            ✕
          </span>
          <span className="flex-1 text-danger text-xs leading-relaxed">
            {rejectionMotivo}
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-fg-dim hover:text-fg text-xs whitespace-nowrap shrink-0"
          >
            tentar outro
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-danger/50 bg-red-50 text-sm">
          <span className="text-danger flex-1">{errorMsg ?? "Erro"}</span>
          <button
            type="button"
            onClick={reset}
            className="text-fg-dim hover:text-fg text-xs"
          >
            tentar de novo
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {description && (
        <p className="mt-1 text-[11px] text-fg-dim">{description}</p>
      )}
    </div>
  );
}
