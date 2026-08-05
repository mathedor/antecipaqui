"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  replyChatAction,
  getChatMessagesSince,
  setChatArquivado,
  reopenChatAction,
  nudgeChatAction,
  type ReplyChatState,
  type ChatAttachment,
} from "@/lib/actions/chat";
import { closeTicketAction } from "@/lib/actions/tickets";
import { useFeedback } from "@/components/feedback-provider";
import { agoraMs } from "@/lib/agora";

type Message = {
  id: string;
  fromUserId: string;
  fromRole: string;
  body: string;
  kind?: string | null;
  attachments?: unknown;
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
  ticketArquivadoEm?: Date | string | null;
  ticketUpdatedAt?: Date | string;
  initialMessages: Message[];
  participantes: Participant[];
  viewerId: string;
  viewerRole: string;
  ticketOwnerId: string;
};

const ROLE_LABEL: Record<string, string> = {
  corretor: "Imobiliária / Corretor",
  imobiliaria: "Imobiliária / Corretor",
  construtora: "Construtora",
  admin: "Antecipaqui",
  fundo: "Fundo",
  comercial: "Comercial",
};

const POLL_MS = 7000;
const MAX_ATTACHMENTS = 5;
const MAX_SIZE_MB = 15;

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

function isImage(mime: string) {
  return mime.startsWith("image/");
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function parseAttachments(raw: unknown): ChatAttachment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ChatAttachment[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ChatAttachment[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function ChatThread({
  ticketId,
  ticketStatus,
  ticketCategoria,
  ticketArquivadoEm,
  ticketUpdatedAt,
  initialMessages,
  participantes,
  viewerId,
  viewerRole,
  ticketOwnerId,
}: Props) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<ReplyChatState, FormData>(
    replyChatAction,
    null,
  );
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [agora] = useState(() => agoraMs());
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>(
    [],
  );
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
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
      setPendingAttachments([]);
      router.refresh();
    }
  }, [state, router]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const available = MAX_ATTACHMENTS - pendingAttachments.length;
    const toUpload = Array.from(files).slice(0, available);
    if (Array.from(files).length > available) {
      setUploadError(`Máximo ${MAX_ATTACHMENTS} anexos por mensagem.`);
    }

    for (const file of toUpload) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`"${file.name}" passa de ${MAX_SIZE_MB}MB.`);
        continue;
      }
      setUploadingCount((n) => n + 1);
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/chats/upload",
        });
        const proxyUrl = `/api/blob/${blob.pathname}`;
        setPendingAttachments((prev) => [
          ...prev,
          {
            url: proxyUrl,
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
          },
        ]);
      } catch (e) {
        setUploadError(`Falha ao enviar "${file.name}": ${(e as Error).message}`);
      } finally {
        setUploadingCount((n) => n - 1);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingAttachment(idx: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  const isClosed = ticketStatus === "finalizado";
  const isArchived = !!ticketArquivadoEm;
  const ativos = participantes.filter((p) => !p.leftAt);
  const inativos = participantes.filter((p) => !!p.leftAt);

  // Cutucão liberado se ≥12h parado, não finalizado, não arquivado.
  // O "agora" é fotografado uma vez na montagem: ler o relógio no corpo do
  // render é impuro e faz servidor e cliente divergirem na hidratação.
  const hoursIdle = ticketUpdatedAt
    ? (agora -
        (typeof ticketUpdatedAt === "string"
          ? new Date(ticketUpdatedAt).getTime()
          : ticketUpdatedAt.getTime())) /
      (1000 * 60 * 60)
    : 0;
  const canNudge = !isClosed && !isArchived && hoursIdle >= 12;

  const canArchive =
    viewerRole === "admin" || viewerId === ticketOwnerId;
  const canReopen = viewerRole === "admin" && isClosed;

  return (
    <div className="space-y-5">
      {/* Banner de participantes + barra de ações */}
      <div className="rounded-2xl border border-border bg-bg-elev px-5 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim">
            participantes ({ativos.length}) · categoria{" "}
            <span className="text-fg">{ticketCategoria}</span>
            {isArchived && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-50 text-warn text-[10px] font-semibold">
                📦 arquivado
              </span>
            )}
          </div>
          <ChatActionButtons
            ticketId={ticketId}
            canArchive={canArchive}
            isArchived={isArchived}
            canReopen={canReopen}
            canNudge={canNudge}
            busy={actionBusy}
            setBusy={setActionBusy}
            onSuccess={() => router.refresh()}
            confirm={confirm}
            alertSuccess={alertSuccess}
            alertError={alertError}
          />
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
          if (m.kind === "system") {
            return (
              <li
                key={m.id}
                className="flex items-center justify-center px-4"
              >
                <div className="rounded-full border border-dashed border-border bg-bg-card px-4 py-1.5 text-xs text-fg-muted italic">
                  {m.body}
                  <span className="ml-2 font-mono text-[10px] text-fg-dim not-italic">
                    {formatDateTime(m.createdAt)}
                  </span>
                </div>
              </li>
            );
          }
          const isMine = m.fromUserId === viewerId;
          const atts = parseAttachments(m.attachments);
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
              {atts.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {atts.map((a, i) => (
                    <AttachmentChip key={i} att={a} />
                  ))}
                </div>
              )}
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ul>

      {/* Form de resposta */}
      {!isClosed ? (
        <form
          ref={formRef}
          action={action}
          className="space-y-3"
          onSubmit={() => {
            // Garante que o estado de pendingAttachments seja serializado
            // antes do action ser disparado.
          }}
        >
          <input type="hidden" name="ticketId" value={ticketId} />
          <input
            type="hidden"
            name="attachments"
            value={JSON.stringify(pendingAttachments)}
          />
          {state && !state.ok && (
            <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
              {state.error}
            </div>
          )}
          {uploadError && (
            <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
              {uploadError}
            </div>
          )}
          <textarea
            name="body"
            rows={3}
            placeholder="Escreva sua mensagem..."
            className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-y"
          />
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pendingAttachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-card border border-border text-xs text-fg"
                >
                  <span>📎</span>
                  <span className="truncate max-w-[180px]">{a.name}</span>
                  <span className="text-fg-dim font-mono">
                    {formatBytes(a.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePendingAttachment(i)}
                    className="text-fg-dim hover:text-danger transition-colors"
                    aria-label="Remover anexo"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {uploadingCount > 0 && (
            <div className="text-xs text-fg-dim">
              Enviando {uploadingCount} arquivo
              {uploadingCount === 1 ? "" : "s"}...
            </div>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.txt,.zip"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pendingAttachments.length >= MAX_ATTACHMENTS}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-border text-fg-muted hover:text-fg hover:border-accent transition-colors text-sm disabled:opacity-50"
            >
              📎 Anexar
            </button>
            <button
              type="submit"
              disabled={pending || uploadingCount > 0}
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
          {canReopen && (
            <span className="ml-2">
              Veja o botão acima pra reabrir se precisar.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentChip({ att }: { att: ChatAttachment }) {
  if (isImage(att.type)) {
    return (
      <a
        href={att.url}
        target="_blank"
        rel="noopener"
        className="block rounded-xl overflow-hidden border border-border hover:border-accent transition-colors"
      >
        {/* Thumbnail: usa o próprio anexo via proxy autenticado */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={att.url}
          alt={att.name}
          className="block max-h-40 max-w-[240px] object-cover bg-bg-card"
        />
        <div className="px-2 py-1 text-[10px] text-fg-dim font-mono bg-bg-card border-t border-border truncate">
          {att.name} · {formatBytes(att.size)}
        </div>
      </a>
    );
  }
  const icon = att.type.includes("pdf") ? "📕" : "📄";
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-card border border-border hover:border-accent transition-colors text-xs text-fg"
    >
      <span className="text-base">{icon}</span>
      <span className="truncate max-w-[200px] font-semibold">{att.name}</span>
      <span className="text-fg-dim font-mono">{formatBytes(att.size)}</span>
    </a>
  );
}

type ConfirmFn = (opts: {
  title: string;
  message: string;
  confirmLabel: string;
  variant?: "default" | "error" | "danger" | "success" | "info";
}) => Promise<boolean>;
type AlertFn = (message: string, title?: string) => Promise<void>;

function ChatActionButtons({
  ticketId,
  canArchive,
  isArchived,
  canReopen,
  canNudge,
  busy,
  setBusy,
  onSuccess,
  confirm,
  alertSuccess,
  alertError,
}: {
  ticketId: string;
  canArchive: boolean;
  isArchived: boolean;
  canReopen: boolean;
  canNudge: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onSuccess: () => void;
  confirm: ConfirmFn;
  alertSuccess: AlertFn;
  alertError: AlertFn;
}) {
  async function run(fn: () => Promise<void>, successMsg: string) {
    setBusy(true);
    try {
      await fn();
      await alertSuccess(successMsg, "Pronto");
      onSuccess();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {canNudge && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await confirm({
              title: "Cutucar este chat?",
              message:
                "Vai mandar uma mensagem de sistema cutucando os participantes e notificar todo mundo. Use só se realmente precisa de uma resposta.",
              confirmLabel: "Cutucar",
            });
            if (!ok) return;
            await run(
              async () => {
                await nudgeChatAction(ticketId);
              },
              "Cutucão enviado.",
            );
          }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
          title="Mandar cutucão (≥12h sem resposta)"
        >
          👋 Cutucar
        </button>
      )}
      {canReopen && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const ok = await confirm({
              title: "Reabrir chat?",
              message:
                "O chat volta pro status 'aberto' e os participantes serão notificados.",
              confirmLabel: "Reabrir",
            });
            if (!ok) return;
            await run(
              async () => {
                await reopenChatAction(ticketId);
              },
              "Chat reaberto.",
            );
          }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-accent hover:border-accent transition-colors disabled:opacity-50"
        >
          🔄 Reabrir
        </button>
      )}
      {canArchive && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const target = !isArchived;
            const ok = await confirm({
              title: target ? "Arquivar chat?" : "Desarquivar chat?",
              message: target
                ? "O chat some da lista padrão. Aparece com filtro 'arquivados' e pode ser desarquivado depois."
                : "O chat volta pra lista padrão.",
              confirmLabel: target ? "Arquivar" : "Desarquivar",
            });
            if (!ok) return;
            await run(
              async () => {
                await setChatArquivado(ticketId, target);
              },
              target ? "Chat arquivado." : "Chat desarquivado.",
            );
          }}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-semibold text-fg-muted hover:text-fg hover:border-accent transition-colors disabled:opacity-50"
        >
          {isArchived ? "📂 Desarquivar" : "📦 Arquivar"}
        </button>
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
  // Só admin tem botão de finalizar inline (não-admin usa archive)
  if (viewerRole !== "admin") return null;
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Finalizar chat",
          message: "Finalizar este chat? Pode reabrir depois se precisar.",
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
