"use client";

import { useActionState, useState } from "react";
import {
  executarAcaoOpAction,
  type AcaoOpState,
} from "@/lib/actions/admin-mesa-actions";

type Props = {
  operacaoId: string;
  status: string;
};

/** Ações disponíveis por status (transições aceitas pelo fluxo). */
const ACOES_POR_STATUS: Record<
  string,
  Array<{
    target: string;
    label: string;
    tone: "primary" | "success" | "danger" | "warn" | "neutral";
    requireMotivo?: boolean;
  }>
> = {
  aguardando_aprovacao: [
    { target: "pre_aprovada", label: "Pré-aprovar", tone: "primary" },
    {
      target: "documentos_incompletos",
      label: "Pedir docs",
      tone: "warn",
      requireMotivo: true,
    },
    {
      target: "recusada",
      label: "Recusar",
      tone: "danger",
      requireMotivo: true,
    },
  ],
  documentos_incompletos: [
    { target: "aguardando_aprovacao", label: "Reabrir análise", tone: "neutral" },
    {
      target: "recusada",
      label: "Recusar",
      tone: "danger",
      requireMotivo: true,
    },
  ],
  pre_aprovada: [
    { target: "analise_final", label: "Análise final", tone: "primary" },
    {
      target: "documentos_incompletos",
      label: "Pedir docs",
      tone: "warn",
      requireMotivo: true,
    },
    {
      target: "recusada",
      label: "Recusar",
      tone: "danger",
      requireMotivo: true,
    },
  ],
  analise_final: [
    {
      target: "enviada_para_assinatura",
      label: "Enviar pra assinatura",
      tone: "primary",
    },
    {
      target: "documentos_incompletos",
      label: "Pedir docs",
      tone: "warn",
      requireMotivo: true,
    },
    {
      target: "recusada",
      label: "Recusar",
      tone: "danger",
      requireMotivo: true,
    },
  ],
  enviada_para_assinatura: [
    {
      target: "enviada_para_pagamento",
      label: "Enviar pra pagamento",
      tone: "success",
    },
    {
      target: "cancelada",
      label: "Cancelar",
      tone: "danger",
      requireMotivo: true,
    },
  ],
};

const TONE_CLASS: Record<string, string> = {
  primary: "bg-accent text-white hover:bg-accent-dark",
  success: "bg-success text-white hover:bg-green-700",
  danger: "border border-danger/40 text-danger hover:bg-red-50",
  warn: "border border-warn/40 text-warn hover:bg-yellow-50",
  neutral: "border border-border-strong text-fg hover:bg-bg-card",
};

export function AdminAcaoOpForm({ operacaoId, status }: Props) {
  const [confirm, setConfirm] = useState<{
    target: string;
    label: string;
    requireMotivo: boolean;
  } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [state, action, pending] = useActionState<AcaoOpState, FormData>(
    executarAcaoOpAction,
    null,
  );

  const acoes = ACOES_POR_STATUS[status] ?? [];

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-success/40 bg-green-50 text-success px-4 py-2.5 text-sm">
        ✓ Status atualizado pra {state.novoStatus.replace(/_/g, " ")}
      </div>
    );
  }

  if (confirm) {
    return (
      <form action={action} className="space-y-2">
        <input type="hidden" name="operacaoId" value={operacaoId} />
        <input type="hidden" name="novoStatus" value={confirm.target} />
        {confirm.requireMotivo && (
          <textarea
            name="motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (obrigatório)"
            rows={2}
            required
            minLength={5}
            className="form-input w-full !min-h-14 resize-none"
          />
        )}
        {state?.ok === false && (
          <div className="text-xs text-danger">{state.error}</div>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={
              pending || (confirm.requireMotivo && motivo.trim().length < 5)
            }
            className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors"
          >
            {pending ? "Aplicando..." : `Confirmar: ${confirm.label}`}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirm(null);
              setMotivo("");
            }}
            className="h-10 px-3 rounded-lg border border-border-strong text-fg-muted text-sm hover:bg-bg-card"
          >
            cancelar
          </button>
        </div>
      </form>
    );
  }

  if (acoes.length === 0) {
    return (
      <div className="text-xs text-fg-muted">
        Sem ações disponíveis pra esse status. Use a 360 da op.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {acoes.map((a) => (
        <button
          key={a.target}
          type="button"
          onClick={() =>
            setConfirm({
              target: a.target,
              label: a.label,
              requireMotivo: !!a.requireMotivo,
            })
          }
          disabled={pending}
          className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            TONE_CLASS[a.tone]
          }`}
        >
          {a.label}
        </button>
      ))}
      {state?.ok === false && (
        <span className="text-xs text-danger">{state.error}</span>
      )}
    </div>
  );
}
