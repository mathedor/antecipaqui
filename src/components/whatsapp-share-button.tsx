"use client";

import { useState } from "react";

type Props = {
  operacaoNumero: string;
  valorComissao: number;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  aguardando_aprovacao: "em análise",
  documentos_incompletos: "aguardando docs",
  pre_aprovada: "pré-aprovada",
  analise_final: "análise final",
  enviada_para_assinatura: "em assinatura",
  enviada_para_pagamento: "em pagamento",
  realizada: "realizada · paga",
  recusada: "recusada",
  cancelada: "cancelada",
};

export function WhatsappShareButton({
  operacaoNumero,
  valorComissao,
  status,
}: Props) {
  const [open, setOpen] = useState(false);

  function fmt() {
    const valor = valorComissao.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    return `Status da operação ${operacaoNumero} · Antecipaqui

Comissão: ${valor}
Status: ${STATUS_LABEL[status] ?? status}

Acompanhe em www.antecipaqui.digital`;
  }

  const href = `https://wa.me/?text=${encodeURIComponent(fmt())}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-sm transition-colors print:hidden"
      >
        📲 WhatsApp
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fg/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-elev border border-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold mb-1">Compartilhar via WhatsApp</h3>
            <p className="text-xs text-fg-muted mb-4">
              Pré-visualização da mensagem. Você escolhe pra quem mandar.
            </p>
            <pre className="text-xs bg-bg-card p-3 rounded-lg whitespace-pre-wrap font-mono mb-4">
              {fmt()}
            </pre>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 px-4 rounded-lg border border-border text-fg-muted hover:text-fg text-sm"
              >
                Cancelar
              </button>
              <a
                href={href}
                target="_blank"
                rel="noopener"
                className="h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-accent-dark"
              >
                Abrir WhatsApp →
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
