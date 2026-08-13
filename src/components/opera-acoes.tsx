"use client";

import { useState, useTransition } from "react";
import {
  destravarJobAction,
  enviarOperacaoParaFundoAction,
  reenviarOperacaoAction,
  reprocessarEventoAction,
} from "@/lib/actions/opera";

type Retorno = { ok: boolean; detalhe: string };

const base =
  "inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-bg-elev text-fg hover:border-accent hover:text-accent font-medium text-xs disabled:opacity-50 transition-colors";

function useAcao() {
  const [pendente, startTransition] = useTransition();
  const [r, setR] = useState<Retorno | null>(null);

  function executar(fn: () => Promise<Retorno>) {
    setR(null);
    startTransition(async () => {
      try {
        setR(await fn());
      } catch (e) {
        setR({ ok: false, detalhe: (e as Error).message });
      }
    });
  }

  return { pendente, r, executar };
}

function Resultado({ r }: { r: Retorno | null }) {
  if (!r) return null;
  return (
    <span className={`text-xs ${r.ok ? "text-success" : "text-danger"}`}>
      {r.detalhe}
    </span>
  );
}

/** Botão que coloca a operação na esteira do fundo pela primeira vez. */
export function BotaoEnviarParaFundo({ operacaoId }: { operacaoId: string }) {
  const { pendente, r, executar } = useAcao();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pendente}
        onClick={() => executar(() => enviarOperacaoParaFundoAction(operacaoId))}
        className={base}
      >
        {pendente ? "Enviando…" : "Enviar para o fundo"}
      </button>
      <Resultado r={r} />
    </div>
  );
}

export function BotaoReenviarOperacao({ operacaoId }: { operacaoId: string }) {
  const { pendente, r, executar } = useAcao();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pendente}
        onClick={() => executar(() => reenviarOperacaoAction(operacaoId))}
        className={base}
      >
        {pendente ? "Reenviando…" : "Reenviar operação"}
      </button>
      <Resultado r={r} />
    </div>
  );
}

export function BotaoDestravarJob({ jobId }: { jobId: string }) {
  const { pendente, r, executar } = useAcao();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pendente}
        onClick={() => executar(() => destravarJobAction(jobId))}
        className={base}
      >
        {pendente ? "Liberando…" : "Tentar de novo"}
      </button>
      <Resultado r={r} />
    </div>
  );
}

export function BotaoReprocessarEvento({ eventoId }: { eventoId: string }) {
  const { pendente, r, executar } = useAcao();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pendente}
        onClick={() => executar(() => reprocessarEventoAction(eventoId))}
        className={base}
      >
        {pendente ? "Reprocessando…" : "Reprocessar"}
      </button>
      <Resultado r={r} />
    </div>
  );
}
