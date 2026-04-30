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

const STYLES: Record<Status, { label: string; className: string }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-bg-soft text-fg-dim border-border",
  },
  aguardando_aprovacao: {
    label: "Aguardando aprovação",
    className: "bg-yellow-50 text-warn border-yellow-200",
  },
  documentos_incompletos: {
    label: "Documentos incompletos",
    className: "bg-orange-50 text-warn border-orange-200",
  },
  pre_aprovada: {
    label: "Pré-aprovada",
    className: "bg-blue-50 text-accent border-blue-200",
  },
  analise_final: {
    label: "Análise final",
    className: "bg-blue-50 text-accent border-blue-200",
  },
  recusada: {
    label: "Recusada",
    className: "bg-red-50 text-danger border-red-200",
  },
  enviada_para_assinatura: {
    label: "Enviada p/ assinatura",
    className: "bg-violet-50 text-violet-700 border-violet-200",
  },
  enviada_para_pagamento: {
    label: "Enviada p/ pagamento",
    className: "bg-emerald-50 text-success border-emerald-200",
  },
  realizada: {
    label: "Realizada",
    className: "bg-green-100 text-success border-green-300",
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

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STYLES).map(([k, v]) => [k, v.label]),
);
