"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeOperacaoStatusAction } from "@/lib/actions/status-flow";

type Status =
  | "rascunho"
  | "aguardando_aprovacao"
  | "documentos_incompletos"
  | "pre_aprovada"
  | "analise_final"
  | "recusada"
  | "enviada_para_assinatura"
  | "enviada_para_pagamento"
  | "realizada"
  | "cancelada";

// Status pra onde o admin pode mover (todos exceto "rascunho", que só o
// corretor cria via submissão)
type TargetStatus = Exclude<Status, "rascunho">;

type TransitionDef = {
  label: string;
  to: TargetStatus;
  variant: "primary" | "success" | "warn" | "danger" | "ghost";
  needsMotivo?: boolean;
  motivoLabel?: string;
  confirm?: string;
};

const TRANSITIONS: Partial<Record<Status, TransitionDef[]>> = {
  rascunho: [
    {
      label: "Submeter para análise",
      to: "aguardando_aprovacao",
      variant: "primary",
    },
  ],
  aguardando_aprovacao: [
    { label: "✓ Pré-aprovar", to: "pre_aprovada", variant: "success", confirm: "Pré-aprovar essa operação? A construtora vai receber notificação pra confirmar." },
    {
      label: "⚠ Documentos incompletos",
      to: "documentos_incompletos",
      variant: "warn",
      needsMotivo: true,
      motivoLabel: "Descreva o que falta nos documentos",
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  documentos_incompletos: [
    {
      label: "↻ Voltar pra análise",
      to: "aguardando_aprovacao",
      variant: "primary",
      confirm: "Volta pra fila de análise? Use depois que o corretor reenviar os documentos.",
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  pre_aprovada: [
    {
      label: "✓ Construtora confirmou (análise final)",
      to: "analise_final",
      variant: "success",
      confirm: "Marcar que a construtora confirmou a operação?",
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  analise_final: [
    {
      label: "✓ Aprovar e enviar pra assinatura",
      to: "enviada_para_assinatura",
      variant: "success",
      confirm: "Gera o contrato e envia pra assinatura digital?",
    },
    {
      label: "✕ Recusar",
      to: "recusada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo da recusa",
    },
  ],
  enviada_para_assinatura: [
    {
      label: "✓ Assinaturas concluídas — pagar",
      to: "enviada_para_pagamento",
      variant: "success",
      confirm: "Confirma que todos assinaram e a operação vai pra pagamento?",
    },
    {
      label: "✕ Cancelar",
      to: "cancelada",
      variant: "danger",
      needsMotivo: true,
      motivoLabel: "Motivo do cancelamento",
    },
  ],
  enviada_para_pagamento: [
    {
      label: "✓ Pagamento confirmado",
      to: "realizada",
      variant: "success",
      confirm: "Marca pagamento como confirmado e operação como realizada?",
    },
  ],
  recusada: [],
  realizada: [],
  cancelada: [],
};

const VARIANT_CLS: Record<TransitionDef["variant"], string> = {
  primary:
    "bg-accent text-white hover:bg-accent-dark border-accent",
  success:
    "bg-success text-white hover:bg-green-700 border-success",
  warn:
    "bg-orange-500 text-white hover:bg-orange-600 border-orange-500",
  danger:
    "bg-danger text-white hover:bg-red-800 border-danger",
  ghost:
    "bg-bg-elev text-fg border-border hover:border-accent",
};

export function AdminStatusFlow({
  operacaoId,
  currentStatus,
}: {
  operacaoId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeMotivo, setActiveMotivo] = useState<{
    to: TargetStatus;
    label: string;
  } | null>(null);
  const [motivoText, setMotivoText] = useState("");

  const transitions = TRANSITIONS[currentStatus as Status] ?? [];

  function executeTransition(to: TargetStatus, motivo?: string) {
    startTransition(async () => {
      try {
        await changeOperacaoStatusAction({
          operacaoId,
          newStatus: to,
          motivo,
        });
        setActiveMotivo(null);
        setMotivoText("");
        router.refresh();
      } catch (e) {
        alert("Erro ao mudar status: " + (e as Error).message);
      }
    });
  }

  function handleClick(t: TransitionDef) {
    if (t.needsMotivo) {
      setActiveMotivo({ to: t.to, label: t.motivoLabel ?? "Motivo" });
      return;
    }
    if (t.confirm && !confirm(t.confirm)) return;
    executeTransition(t.to);
  }

  if (transitions.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
          fluxo de status
        </div>
        <p className="text-sm text-fg-muted">
          Nenhuma transição disponível. Status atual:{" "}
          <span className="font-mono text-xs uppercase">{currentStatus}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent-soft p-5 md:p-6">
      <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-3">
        ações administrativas · próximo passo
      </div>

      {!activeMotivo ? (
        <>
          <p className="text-sm text-fg-muted mb-5">
            Status atual:{" "}
            <span className="font-mono text-xs uppercase font-semibold text-fg">
              {currentStatus}
            </span>
            . Escolha pra onde ir:
          </p>
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <button
                key={t.to}
                type="button"
                onClick={() => handleClick(t)}
                disabled={pending}
                className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl border font-semibold text-sm transition-colors disabled:opacity-60 ${VARIANT_CLS[t.variant]}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono">
            {activeMotivo.label}
            <span className="ml-1 text-accent">*</span>
          </label>
          <textarea
            rows={3}
            value={motivoText}
            onChange={(e) => setMotivoText(e.target.value)}
            placeholder="Descreva..."
            className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-none"
            autoFocus
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (!motivoText.trim()) {
                  alert("Preencha o motivo.");
                  return;
                }
                executeTransition(activeMotivo.to, motivoText.trim());
              }}
              disabled={pending || !motivoText.trim()}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-60"
            >
              {pending ? "Salvando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMotivo(null);
                setMotivoText("");
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
