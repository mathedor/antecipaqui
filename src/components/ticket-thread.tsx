"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  replyTicketAction,
  closeTicketAction,
  type ReplyTicketState,
} from "@/lib/actions/tickets";
import { useFeedback } from "@/components/feedback-provider";

type Message = {
  id: string;
  fromUserId: string;
  fromRole: string;
  body: string;
  createdAt: Date | string;
  fromNome?: string | null;
  fromEmail?: string | null;
};

type Props = {
  ticketId: string;
  ticketStatus: string;
  messages: Message[];
  /** Role de quem está visualizando (corretor/imobiliaria/construtora/admin) */
  viewerRole: string;
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Antecipaqui",
};

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketThread({
  ticketId,
  ticketStatus,
  messages,
  viewerRole,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReplyTicketState, FormData>(
    replyTicketAction,
    null,
  );
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const isClosed = ticketStatus === "finalizado";

  return (
    <div className="space-y-5">
      {/* Histórico */}
      <ul className="space-y-3">
        {messages.map((m) => {
          const fromAdmin = m.fromRole === "admin";
          return (
            <li
              key={m.id}
              className={`rounded-2xl border p-5 ${
                fromAdmin
                  ? "border-accent/30 bg-accent-soft"
                  : "border-border bg-bg-elev"
              }`}
            >
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      fromAdmin ? "bg-accent" : "bg-fg-dim"
                    }`}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                    {ROLE_LABEL[m.fromRole] ?? m.fromRole}
                  </span>
                  <span className="text-xs text-fg">
                    {m.fromNome ?? m.fromEmail ?? ""}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-fg-dim">
                  {formatDateTime(m.createdAt)}
                </span>
              </div>
              <p className="text-sm text-fg whitespace-pre-line leading-relaxed">
                {m.body}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Form de resposta */}
      {!isClosed ? (
        <form ref={formRef} action={action} className="space-y-3">
          <input type="hidden" name="ticketId" value={ticketId} />
          {state && !state.ok && (
            <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
              {state.error}
            </div>
          )}
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim font-mono">
            Sua resposta
          </label>
          <textarea
            name="body"
            rows={4}
            required
            placeholder="Escreva aqui..."
            className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-y"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar resposta"}
            </button>
            <CloseTicketButton ticketId={ticketId} />
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-border-strong bg-bg-card p-5 text-sm text-fg-muted text-center">
          Este ticket foi finalizado.
          {viewerRole !== "admin" && (
            <>
              {" "}
              Precisa de algo mais? Abra um novo ticket.
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CloseTicketButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Finalizar ticket",
          message: "Finalizar este ticket? Não dá pra reabrir.",
          confirmLabel: "Finalizar",
          variant: "danger",
        });
        if (!ok) return;
        try {
          await closeTicketAction(ticketId);
          await alertSuccess("Ticket finalizado.", "Pronto");
          router.refresh();
        } catch (e) {
          await alertError((e as Error).message);
        }
      }}
      className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border text-fg-muted hover:text-fg font-medium text-sm transition-colors"
    >
      ✓ Finalizar ticket
    </button>
  );
}
