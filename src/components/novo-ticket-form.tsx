"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createTicketAction,
  type CreateTicketState,
} from "@/lib/actions/tickets";

export function NovoTicketForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateTicketState, FormData>(
    createTicketAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.push(`/painel/suporte/${state.ticketId}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      {state && !state.ok && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-4 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Assunto<span className="ml-1 text-accent">*</span>
        </label>
        <input
          name="assunto"
          required
          maxLength={200}
          placeholder="Ex: Dúvida sobre prazo da operação OP-2026-0042"
          className="w-full h-12 rounded-xl bg-bg border border-border-strong px-4 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors"
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Mensagem<span className="ml-1 text-accent">*</span>
        </label>
        <textarea
          name="body"
          rows={6}
          required
          placeholder="Descreva o que aconteceu, qual operação está envolvida, o que precisa..."
          className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !h-12 !px-6"
      >
        {pending ? "Enviando..." : "Abrir ticket"}
        <span className="arrow">→</span>
      </button>
    </form>
  );
}
