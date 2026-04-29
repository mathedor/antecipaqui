"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveOperacaoAction,
  rejectOperacaoAction,
} from "@/lib/actions/admin";

type Props = {
  operacaoId: string;
  isPending: boolean;
};

export function AdminAprovarRecusar({ operacaoId, isPending }: Props) {
  const router = useRouter();
  const [showRecusa, setShowRecusa] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pending, startTransition] = useTransition();

  if (!isPending) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-5">
        <p className="text-sm text-fg-muted">
          Esta operação não está mais em análise. As ações administrativas só
          ficam disponíveis enquanto o status é{" "}
          <span className="font-mono text-xs">em_analise</span>.
        </p>
      </div>
    );
  }

  function handleApprove() {
    if (!confirm("Confirma a aprovação dessa operação?")) return;
    startTransition(async () => {
      await approveOperacaoAction(operacaoId);
      router.refresh();
    });
  }

  function handleReject() {
    if (!motivo.trim()) {
      alert("Informe o motivo da recusa.");
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("operacaoId", operacaoId);
      fd.set("motivo", motivo.trim());
      await rejectOperacaoAction(fd);
      setShowRecusa(false);
      setMotivo("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
        ações administrativas
      </div>
      <h3 className="text-lg font-bold mb-1">Decisão sobre essa operação</h3>
      <p className="text-sm text-fg-muted mb-5">
        Confira os documentos anexados antes de decidir.
      </p>

      {!showRecusa ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={pending}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-success text-white font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            ✓ Aprovar
          </button>
          <button
            type="button"
            onClick={() => setShowRecusa(true)}
            disabled={pending}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-danger/40 text-danger hover:bg-red-50 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            ✕ Recusar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono">
            Motivo da recusa<span className="ml-1 text-accent">*</span>
          </label>
          <textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: documento ilegível, valores inconsistentes…"
            className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-none"
            autoFocus
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReject}
              disabled={pending || !motivo.trim()}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-danger text-white font-semibold text-sm hover:bg-red-800 transition-colors disabled:opacity-60"
            >
              {pending ? "Recusando..." : "Confirmar recusa"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowRecusa(false);
                setMotivo("");
              }}
              disabled={pending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border text-fg-muted hover:text-fg font-medium text-sm transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
