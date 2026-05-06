"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  replyChatAction,
  getChatMessagesSince,
  type ReplyChatState,
} from "@/lib/actions/chat";
import { closeTicketAction } from "@/lib/actions/tickets";
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

type Participant = {
  id: string;
  userId: string;
  role: string;
  leftAt: Date | string | null;
  nome: string | null;
  email: string | null;
};

type Props = {
  ticketId: string;
  ticketStatus: string;
  ticketCategoria: string;
  initialMessages: Message[];
  participantes: Participant[];
  viewerId: string;
  viewerRole: string;
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Antecipaqui",
  fundo: "Fundo",
  comercial: "Comercial",
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

const POLL_MS = 7000;

export function ChatThread({
  ticketId,
  ticketStatus,
  ticketCategoria,
  initialMessages,
  participantes,
  viewerId,
  viewerRole,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReplyChatState, FormData>(
    replyChatAction,
    null,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Polling
  useEffect(() => {
    if (ticketStatus === "finalizado") return;
    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function tick() {
      if (stopped) return;
      try {
        const last = messages[messages.length - 1];
        const sinceIso = last
          ? new Date(last.createdAt).toISOString()
          : new Date(0).toISOString();
        const novos = await getChatMessagesSince(ticketId, sinceIso);
        if (!stopped && novos.length > 0) {
          setMessages((prev) => [
            ...prev,
            ...(novos as Message[]).filter(
              (n) => !prev.some((p) => p.id === n.id),
            ),
          ]);
        }
      } catch {
        /* ignora erro de polling */
      }
      timeoutId = setTimeout(tick, POLL_MS);
    }

    timeoutId = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [ticketId, ticketStatus, messages]);

  // Auto-scroll quando chega mensagem nova
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const isClosed = ticketStatus === "finalizado";

  const ativos = participantes.filter((p) => !p.leftAt);
  const inativos = participantes.filter((p) => !!p.leftAt);

  return (
    <div className="space-y-5">
      {/* Banner de participantes */}
      <div className="rounded-2xl border border-border bg-bg-elev px-5 py-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-2">
          participantes ({ativos.length}) · categoria{" "}
          <span className="text-fg">{ticketCategoria}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {ativos.map((p) => (
            <span
              key={p.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${
                p.userId === viewerId
                  ? "border-accent/40 bg-accent-soft text-accent font-semibold"
                  : "border-border bg-bg-card text-fg"
              }`}
              title={p.email ?? undefined}
            >
              <span className="size-1.5 rounded-full bg-success" />
              {p.nome ?? p.email ?? "—"}
              <span className="font-mono text-[9px] uppercase tracking-wider text-fg-dim">
                · {ROLE_LABEL[p.role] ?? p.role}
              </span>
            </span>
          ))}
          {inativos.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-bg-card text-xs text-fg-dim line-through"
              title="saiu do chat"
            >
              {p.nome ?? p.email ?? "—"}
            </span>
          ))}
        </div>
      </div>

      {/* Histórico */}
      <ul className="space-y-3">
        {messages.map((m) => {
          const isMine = m.fromUserId === viewerId;
          return (
            <li
              key={m.id}
              className={`rounded-2xl border p-5 ${
                isMine
                  ? "border-accent/30 bg-accent-soft ml-6"
                  : "border-border bg-bg-elev mr-6"
              }`}
            >
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2 rounded-full ${
                      isMine ? "bg-accent" : "bg-fg-dim"
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
        <div ref={bottomRef} />
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
          <textarea
            name="body"
            rows={3}
            required
            placeholder="Escreva sua mensagem..."
            className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-y"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-dark transition-colors disabled:opacity-60"
            >
              {pending ? "Enviando..." : "Enviar"}
            </button>
            <CloseTicketButton ticketId={ticketId} viewerRole={viewerRole} />
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-border-strong bg-bg-card p-5 text-sm text-fg-muted text-center">
          Este chat foi finalizado.
        </div>
      )}
    </div>
  );
}

function CloseTicketButton({
  ticketId,
  viewerRole,
}: {
  ticketId: string;
  viewerRole: string;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  // Só admin/dono tem botão (action server valida; UI só esconde se for participante "comum")
  if (viewerRole !== "admin") return null;
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Finalizar chat",
          message: "Finalizar este chat? Não dá pra reabrir.",
          confirmLabel: "Finalizar",
          variant: "danger",
        });
        if (!ok) return;
        try {
          await closeTicketAction(ticketId);
          await alertSuccess("Chat finalizado.", "Pronto");
          router.refresh();
        } catch (e) {
          await alertError((e as Error).message);
        }
      }}
      className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border text-fg-muted hover:text-fg font-medium text-sm transition-colors"
    >
      ✓ Finalizar chat
    </button>
  );
}