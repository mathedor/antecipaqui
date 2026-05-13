"use client";

import { useEffect } from "react";

/** Error boundary local pra capturar erro server-side na renderização do
 *  /admin/decidir. Mostra detalhes pra debug rápido — remover (ou simplificar)
 *  depois de validar que a página tá saudável. */
export default function DecidirError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/admin/decidir] erro:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg p-6">
      <div className="max-w-3xl mx-auto rounded-2xl border border-danger/40 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-danger mb-2">
          Erro na página /admin/decidir
        </h1>
        <pre className="text-xs text-fg bg-white p-3 rounded mt-3 overflow-auto whitespace-pre-wrap">
          {error.message}
        </pre>
        {error.digest && (
          <p className="text-xs text-fg-muted mt-2 font-mono">
            digest: {error.digest}
          </p>
        )}
        {error.stack && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-semibold">
              stack trace
            </summary>
            <pre className="text-[10px] text-fg-muted bg-white p-3 rounded mt-2 overflow-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={reset}
          className="mt-4 btn-primary !h-10 !px-4"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
