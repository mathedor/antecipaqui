/** Timeline visual do status da operação — útil pro corretor saber onde
 *  está sua op e o que vem depois. Server component (sem interatividade). */

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

type Etapa = {
  key: Status;
  label: string;
  descricao: string;
};

const FLUXO_NORMAL: Etapa[] = [
  {
    key: "aguardando_aprovacao",
    label: "Aguardando análise",
    descricao: "Admin vai validar os documentos.",
  },
  {
    key: "pre_aprovada",
    label: "Pré-aprovada",
    descricao: "Admin escolheu o fundo investidor.",
  },
  {
    key: "analise_final",
    label: "Análise final",
    descricao: "Fundo analisando a operação.",
  },
  {
    key: "enviada_para_assinatura",
    label: "Aguardando assinatura",
    descricao: "Você precisa assinar o contrato.",
  },
  {
    key: "enviada_para_pagamento",
    label: "Pagamento programado",
    descricao: "Fundo vai depositar o valor antecipado.",
  },
  {
    key: "realizada",
    label: "Realizada",
    descricao: "Valor creditado. 🎉",
  },
];

const ORDEM: Record<Status, number> = {
  rascunho: -1,
  aguardando_aprovacao: 0,
  documentos_incompletos: 0, // mesma fase de "aguardando análise" (volta)
  pre_aprovada: 1,
  analise_final: 2,
  enviada_para_assinatura: 3,
  enviada_para_pagamento: 4,
  realizada: 5,
  recusada: -2,
  cancelada: -2,
};

type Props = {
  status: Status;
  /** Quando admin pediu documentos extras — destacar no passo correspondente. */
  motivoPendencia?: string | null;
  /** Decisão do fundo (se já chegou nele) */
  fundoAprovacao?: string | null;
  fundoRecusaMotivo?: string | null;
};

export function OperacaoTimeline({
  status,
  motivoPendencia,
  fundoAprovacao,
  fundoRecusaMotivo,
}: Props) {
  const isRascunho = status === "rascunho";
  const isRecusada = status === "recusada" || status === "cancelada";
  const isDocsIncompletos = status === "documentos_incompletos";
  const stepAtual = ORDEM[status];

  if (isRascunho) {
    return (
      <div className="rounded-2xl border border-warn/40 bg-yellow-50 p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-1">
          rascunho
        </div>
        <p className="text-sm text-fg">
          Operação ainda não foi submetida. Complete o cadastro e envie pra
          análise.
        </p>
      </div>
    );
  }

  if (isRecusada) {
    return (
      <div className="rounded-2xl border border-danger/40 bg-red-50 p-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-danger mb-1">
          operação {status === "recusada" ? "recusada" : "cancelada"}
        </div>
        <p className="text-sm text-fg">
          {fundoRecusaMotivo
            ? `Fundo: ${fundoRecusaMotivo}`
            : "Veja os detalhes acima."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-bg-elev p-5 md:p-6">
      <div className="mb-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fg-dim mb-1">
          status da operação
        </div>
        <h2 className="text-lg font-bold tracking-tight">
          {isDocsIncompletos
            ? "Pendência de documentos"
            : "Acompanhe sua operação"}
        </h2>
      </div>

      {isDocsIncompletos && motivoPendencia && (
        <div className="rounded-xl border border-warn/40 bg-yellow-50 px-4 py-3 mb-5 text-sm">
          <div className="font-mono text-[10px] uppercase tracking-wider text-warn mb-1">
            ação necessária
          </div>
          <p className="text-fg">{motivoPendencia}</p>
        </div>
      )}

      <ol className="space-y-3">
        {FLUXO_NORMAL.map((etapa, idx) => {
          const isFeita = idx < stepAtual;
          const isAtual = idx === stepAtual;
          const isPendente = idx > stepAtual;
          const dotClass = isFeita
            ? "bg-success border-success"
            : isAtual
              ? "bg-accent border-accent ring-4 ring-accent/20"
              : "bg-bg-card border-border";
          const dotIcon = isFeita ? "✓" : isAtual ? "•" : "";

          // Sub-mensagem se houver decisão do fundo nesta etapa
          let subMsg: string | null = null;
          if (etapa.key === "analise_final" && fundoAprovacao === "aprovada") {
            subMsg = "✓ Fundo aprovou a operação";
          } else if (
            etapa.key === "analise_final" &&
            fundoAprovacao === "pendente" &&
            isAtual
          ) {
            subMsg = "Aguardando decisão do fundo";
          }

          return (
            <li
              key={etapa.key}
              className={`flex gap-3 items-start ${isPendente ? "opacity-50" : ""}`}
            >
              <div className="relative shrink-0">
                <div
                  className={`size-7 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white ${dotClass}`}
                >
                  {dotIcon}
                </div>
                {idx < FLUXO_NORMAL.length - 1 && (
                  <div
                    className={`absolute left-1/2 top-7 -translate-x-1/2 w-0.5 h-9 ${
                      isFeita ? "bg-success/40" : "bg-border"
                    }`}
                  />
                )}
              </div>
              <div className="pb-2 flex-1">
                <div
                  className={`text-sm font-bold ${
                    isAtual
                      ? "text-accent"
                      : isFeita
                        ? "text-fg"
                        : "text-fg-muted"
                  }`}
                >
                  {etapa.label}
                  {isAtual && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono font-semibold bg-accent text-white">
                      agora
                    </span>
                  )}
                </div>
                <div className="text-xs text-fg-muted mt-0.5">
                  {etapa.descricao}
                </div>
                {subMsg && (
                  <div className="text-xs text-success font-mono mt-1">
                    {subMsg}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
