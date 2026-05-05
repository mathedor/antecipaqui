"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  uploadRepositorioFileAction,
  deleteRepositorioFileAction,
} from "@/lib/actions/repositorio";
import { useFeedback } from "@/components/feedback-provider";
import { sanitizeFileName } from "@/lib/sanitize-filename";
import { toBlobProxyHref } from "@/lib/blob-url";
import type { RepositorioFile } from "@/db/schema";

type Props = {
  /** Pelo menos um deve ser passado. */
  targetUserId?: string | null;
  targetConstrutoraId?: string | null;
  files: RepositorioFile[];
};

function formatDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function RepositorioPanel({
  targetUserId,
  targetConstrutoraId,
  files,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [descricao, setDescricao] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(file: File) {
    setUploading(true);
    setProgress(0);
    try {
      const folder = targetUserId
        ? `repositorio/user-${targetUserId}`
        : `repositorio/construtora-${targetConstrutoraId}`;
      const safeName = sanitizeFileName(file.name);
      const blob = await upload(
        `${folder}/${Date.now()}-${safeName}`,
        file,
        {
          access: "private",
          handleUploadUrl: "/api/upload",
          contentType: file.type || undefined,
          onUploadProgress: (e) => setProgress(e.percentage),
        },
      );
      await uploadRepositorioFileAction({
        targetUserId,
        targetConstrutoraId,
        url: blob.url,
        nomeOriginal: file.name,
        descricao: descricao.trim() || null,
        sizeBytes: file.size,
        mimeType: file.type,
      });
      setDescricao("");
      await alertSuccess(
        `${file.name} foi adicionado ao repositório.`,
        "Arquivo enviado",
      );
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message, "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  async function handleDelete(file: RepositorioFile) {
    const ok = await confirm({
      title: "Excluir arquivo",
      message: `Excluir "${file.nomeOriginal}" do repositório? Não tem como reverter.`,
      confirmLabel: "Excluir",
      variant: "danger",
    });
    if (!ok) return;
    start(async () => {
      try {
        await deleteRepositorioFileAction(file.id);
        await alertSuccess("Arquivo removido.", "Pronto");
        router.refresh();
      } catch (e) {
        await alertError((e as Error).message);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
          repositório admin · {files.length}
        </div>
        <p className="text-[11px] text-fg-muted">
          Arquivos arbitrários (anotações, contratos, comprovantes). Visível só
          pra admin.
        </p>
      </div>

      {/* Upload */}
      <div className="rounded-xl border border-dashed border-border-strong bg-bg p-4 mb-4">
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Descrição (opcional)
        </label>
        <input
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex: Comprovante TED · 30/04/2026"
          disabled={uploading}
          className="form-input !h-10 mb-3"
        />
        {uploading ? (
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
        ) : (
          <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border-strong bg-bg hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer text-sm text-fg-muted">
            <span>+ Selecionar arquivo</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
              qualquer tipo · até 15MB
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>
        )}
      </div>

      {/* List */}
      {files.length === 0 ? (
        <p className="text-sm text-fg-muted text-center py-4">
          Nenhum arquivo no repositório ainda.
        </p>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-bg"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={toBlobProxyHref(f.url)}
                  target="_blank"
                  rel="noopener"
                  className="block font-semibold text-sm text-fg hover:text-accent truncate"
                  title={f.nomeOriginal}
                >
                  {f.nomeOriginal}
                </a>
                {f.descricao && (
                  <p className="text-xs text-fg-muted truncate">
                    {f.descricao}
                  </p>
                )}
                <div className="text-[10px] font-mono text-fg-dim mt-0.5">
                  {formatDate(f.createdAt)} · {formatSize(f.sizeBytes)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(f)}
                disabled={pending}
                className="size-8 rounded-lg border border-border text-fg-dim hover:border-danger hover:text-danger transition-colors disabled:opacity-60"
                aria-label="Excluir"
                title="Excluir"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
