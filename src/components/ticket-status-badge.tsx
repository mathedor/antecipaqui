const STYLES: Record<string, { label: string; className: string }> = {
  aberto: {
    label: "Aberto",
    className: "bg-yellow-50 text-warn border-yellow-200",
  },
  aguardando_resposta: {
    label: "Aguardando sua resposta",
    className: "bg-blue-50 text-accent border-blue-200",
  },
  finalizado: {
    label: "Finalizado",
    className: "bg-bg-soft text-fg-dim border-border",
  },
};

export function TicketStatusBadge({
  status,
  forAdmin = false,
}: {
  status: string;
  /** Se for admin vendo, "aguardando_resposta" significa "esperando user
   *  responder" — vou só trocar o label. */
  forAdmin?: boolean;
}) {
  const s = STYLES[status] ?? STYLES.aberto;
  const label =
    forAdmin && status === "aguardando_resposta"
      ? "Aguardando o cliente"
      : s.label;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider font-mono font-semibold ${s.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
