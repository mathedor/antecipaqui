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

const STYLES: Record<Status, { label: string; className: string; tooltip: string }> = {
  rascunho: {
    label: "Rascunho",
    className: "bg-bg-soft text-fg-dim border-border",
    tooltip:
      "Operação ainda sendo montada pelo cedente; nenhum pagamento ou prazo definido.",
  },
  aguardando_aprovacao: {
    label: "Aguardando aprovação",
    className: "bg-yellow-50 text-warn border-yellow-200",
    tooltip:
      "Cedente enviou pra análise. Admin/fundo vão revisar documentos e taxas antes de aprovar.",
  },
  documentos_incompletos: {
    label: "Documentos incompletos",
    className: "bg-orange-50 text-warn border-orange-200",
    tooltip:
      "Admin pediu mais documentos pra prosseguir. Cedente precisa anexar antes de avançar.",
  },
  pre_aprovada: {
    label: "Pré-aprovada",
    className: "bg-blue-50 text-accent border-blue-200",
    tooltip:
      "Admin pré-aprovou. Aguardando análise do fundo e assinatura da construtora.",
  },
  analise_final: {
    label: "Análise final",
    className: "bg-blue-50 text-accent border-blue-200",
    tooltip:
      "Última checagem antes de enviar pra assinatura. Construtora pode (e deve) assinar.",
  },
  recusada: {
    label: "Recusada",
    className: "bg-red-50 text-danger border-red-200",
    tooltip:
      "Operação rejeitada pelo admin ou fundo. Veja motivo no detalhe da op.",
  },
  enviada_para_assinatura: {
    label: "Enviada p/ assinatura",
    className: "bg-violet-50 text-violet-700 border-violet-200",
    tooltip:
      "Contrato enviado pra assinatura digital. Construtora precisa assinar pra liberar pagamento ao cedente.",
  },
  enviada_para_pagamento: {
    label: "Enviada p/ pagamento",
    className: "bg-emerald-50 text-success border-emerald-200",
    tooltip:
      "Fundo libera o valor presente pro cedente. Construtora começa a dever as parcelas mensais à Antecipaqui.",
  },
  realizada: {
    label: "Realizada",
    className: "bg-green-100 text-success border-green-300",
    tooltip:
      "Todas as parcelas pagas e operação encerrada. Histórico positivo no score.",
  },
  cancelada: {
    label: "Cancelada",
    className: "bg-bg-soft text-fg-dim border-border",
    tooltip: "Operação foi cancelada antes de ser executada.",
  },
};

export function OperacaoStatusBadge({ status }: { status: string }) {
  const s = STYLES[status as Status] ?? STYLES.rascunho;
  return (
    <span
      title={s.tooltip}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider font-mono font-semibold cursor-help ${s.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(STYLES).map(([k, v]) => [k, v.label]),
);
