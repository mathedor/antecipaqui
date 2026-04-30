"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMuralMessageAction,
  toggleMuralMessageActiveAction,
} from "@/lib/actions/mural";
import { AdminMuralForm } from "@/components/admin-mural-form";
import type { MuralMessage } from "@/db/schema";

const AUDIENCE_LABEL: Record<string, string> = {
  both: "Imobiliária + construtora",
  imobiliaria: "Imobiliária / corretor",
  construtora: "Construtora",
};

const AUDIENCE_CLASS: Record<string, string> = {
  both: "bg-accent-soft text-accent border-accent/30",
  imobiliaria: "bg-blue-50 text-accent border-blue-200",
  construtora: "bg-violet-50 text-violet-700 border-violet-200",
};

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminMuralList({ messages }: { messages: MuralMessage[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (!confirm("Excluir esse recado? Não tem como reverter.")) return;
    start(async () => {
      try {
        await deleteMuralMessageAction(id);
        router.refresh();
      } catch (e) {
        alert("Erro: " + (e as Error).message);
      }
    });
  }

  function handleToggle(id: string, current: boolean) {
    start(async () => {
      try {
        await toggleMuralMessageActiveAction(id, !current);
        router.refresh();
      } catch (e) {
        alert("Erro: " + (e as Error).message);
      }
    });
  }

  if (messages.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
        <div className="text-4xl mb-3">📌</div>
        <p className="text-fg-muted">Nenhum recado publicado ainda.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {messages.map((m) => {
        const expired =
          m.expiresAt && new Date(m.expiresAt) <= new Date();
        const isEditing = editingId === m.id;
        return (
          <li
            key={m.id}
            className={`rounded-2xl border p-5 ${
              !m.active || expired
                ? "border-border bg-bg-card opacity-70"
                : "border-border bg-bg-elev"
            }`}
          >
            {isEditing ? (
              <AdminMuralForm
                mode="edit"
                message={m}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-wider font-mono ${AUDIENCE_CLASS[m.audience]}`}
                    >
                      {AUDIENCE_LABEL[m.audience]}
                    </span>
                    {!m.active && (
                      <span className="chip bg-bg-card text-fg-dim border-border">
                        inativo
                      </span>
                    )}
                    {expired && (
                      <span className="chip bg-yellow-50 text-warn border-yellow-200">
                        expirado
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-fg-dim">
                    {formatDateTime(m.createdAt)}
                  </span>
                </div>

                {m.titulo && (
                  <h3 className="font-bold text-base mb-1">{m.titulo}</h3>
                )}
                <p className="text-sm text-fg whitespace-pre-line leading-relaxed">
                  {m.body}
                </p>

                {m.expiresAt && (
                  <p className="mt-2 text-[11px] font-mono text-fg-dim">
                    expira em {formatDateTime(m.expiresAt)}
                  </p>
                )}

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setEditingId(m.id)}
                    className="text-xs px-3 h-8 rounded-lg border border-border text-fg-muted hover:text-fg hover:border-accent transition-colors"
                  >
                    ✎ editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(m.id, m.active)}
                    disabled={pending}
                    className="text-xs px-3 h-8 rounded-lg border border-border text-fg-muted hover:text-fg hover:border-accent transition-colors disabled:opacity-60"
                  >
                    {m.active ? "❚❚ desativar" : "▶ ativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.id)}
                    disabled={pending}
                    className="text-xs px-3 h-8 rounded-lg border border-danger/40 text-danger hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    ✕ excluir
                  </button>
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
