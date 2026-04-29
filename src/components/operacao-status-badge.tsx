type Status =
  | "rascunho"
  | "em_analise"
  | "aprovada"
  | "recusada"
  | "em_assinatura"
  | "ativa"
  | "liquidada"
  | "cancelada";

const STYLES: Record<
  Status,
  { label: string; className: string }
> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-bg-soft text-fg-dim border-border",
  },
  em_analise: {
    label: "Em análise",
    className: "bg-yellow-50 text-warn border-yellow-200",
  },
  aprovada: {
    label: "Aprovada",
    className: "bg-blue-50 text-accent border-blue-200",
  },
  recusada: {
    label: "Recusada",
    className: "bg-red-50 text-danger border-red-200",
  },
  em_assinatura: {
    label: "Em assinatura",
    className: "bg-blue-50 text-accent border-blue-200",
  },
  ativa: {
    label: "Ativa",
    className: "bg-green-50 text-success border-green-200",
  },
  liquidada: {
    label: "Liquidada",
    className: "bg-bg-soft text-fg-muted border-border",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-bg-soft text-fg-dim border-border",
  },
};

export function OperacaoStatusBadge({ status }: { status: string }) {
  const s = STYLES[status as Status] ?? STYLES.rascunho;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider font-mono font-semibold ${s.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}
