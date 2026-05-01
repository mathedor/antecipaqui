"use client";

import { useTransition } from "react";
import {
  cobrarDocumentacaoConstrutoraAction,
  cobrarDocumentacaoUsuarioAction,
} from "@/lib/actions/cobranca";
import { useFeedback } from "@/components/feedback-provider";

type Props = {
  target: "user" | "construtora";
  id: string;
  /** Se passado, usa como label do tooltip / aria; senão usa default */
  label?: string;
  /** Variant: "icon" (botão pequeno na listagem) ou "button" (botão grande na detail) */
  variant?: "icon" | "button";
};

export function AdminCobrarButton({
  target,
  id,
  label = "Cobrar documentação",
  variant = "icon",
}: Props) {
  const [pending, start] = useTransition();
  const { confirm, alertSuccess, alertError } = useFeedback();

  async function handleClick() {
    const ok = await confirm({
      title: "Cobrar documentação",
      message:
        "Enviar email + notificação cobrando documentação faltante pra esse cadastro?",
      confirmLabel: "Enviar cobrança",
    });
    if (!ok) return;
    start(async () => {
      try {
        if (target === "user") {
          await cobrarDocumentacaoUsuarioAction(id);
        } else {
          await cobrarDocumentacaoConstrutoraAction(id);
        }
        await alertSuccess(
          "Email + notificação foram disparados com sucesso.",
          "Cobrança enviada",
        );
      } catch (e) {
        await alertError((e as Error).message, "Erro ao enviar cobrança");
      }
    });
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        title={label}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-warn/40 text-warn hover:bg-yellow-50 font-medium text-sm transition-colors disabled:opacity-60"
      >
        {pending ? "Enviando..." : "✉ Cobrar documentação"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-warn hover:text-warn transition-colors disabled:opacity-60"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    </button>
  );
}
