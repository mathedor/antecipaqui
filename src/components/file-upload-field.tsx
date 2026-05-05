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
};

type Props = {
  label: string;
  /** Hidden input name used for form submission (URL). */
  name: string;
  required?: boolean;
  description?: string;
  /** Pasta de prefixo no Blob (ex: 'kyc' ou 'operacoes/...') */
  folder?: string;
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
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    initial ? "done" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setBlob(null);
    setProgress(0);
    setStatus("idle");
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.(null);
  }

  async function handleFile(file: File) {
    setErrorMsg(null);
    if (file.size > maxMB * 1024 * 1024) {
      setStatus("error");
      setErrorMsg(`Arquivo maior que ${maxMB}MB`);
      return;
    }
    setStatus("uploading");
    setProgress(0);
    try {
      const safeName = sanitizeFileName(file.name);
      const path = `${folder}/${Date.now()}-${safeName}`;
      const newBlob = await upload(path, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: file.type || undefined,
        onUploadProgress: (e) => setProgress(e.percentage),
      });
      const uploaded: UploadedBlob = {
        url: newBlob.url,
        pathname: newBlob.pathname,
        size: file.size,
        name: file.name,
        contentType: file.type,
      };
      setBlob(uploaded);
      setStatus("done");
      setProgress(100);
      onChange?.(uploaded);
    } catch (e) {
      setStatus("error");
      const msg = (e as Error).message || "Erro no upload";
      console.error("[file-upload]", e, { file: file.name, type: file.type, size: file.size });
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

      {status === "idle" && (
        <label
          htmlFor={inputId}
          className="flex items-center justify-between gap-3 px-4 h-12 rounded-xl border border-dashed border-border-strong bg-bg hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer text-sm text-fg-muted"
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
            Selecionar arquivo
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            PDF · JPG · PNG · até {maxMB}MB
          </span>
        </label>
      )}

      {status === "uploading" && (
        <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-accent/50 bg-accent-soft text-sm">
          <div className="flex-1">
            <div className="text-fg text-xs mb-1">Enviando…</div>
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
        <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-success/50 bg-green-50 text-sm">
          <span className="size-5 rounded-full bg-success text-white text-[10px] flex items-center justify-center shrink-0">
            ✓
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
