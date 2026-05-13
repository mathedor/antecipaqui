"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importarRetornoCnab } from "@/lib/actions/cobranca-boletos";
import { useFeedback } from "@/components/feedback-provider";

export function CnabRetornoUpload({ fundoId }: { fundoId: string }) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    total: number;
    baixadas: number;
    naoEncontradas: string[];
  } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setResult(null);
    try {
      const conteudo = await file.text();
      const r = await importarRetornoCnab(fundoId, conteudo);
      if (!r) throw new Error("Sem resposta");
      if (!r.ok) {
        await alertError(r.error);
        return;
      }
      setResult({
        total: r.total,
        baixadas: r.baixadas,
        naoEncontradas: r.naoEncontradas,
      });
      await alertSuccess(
        `${r.baixadas} parcela(s) baixada(s) de ${r.total} registros.`,
        "Importação concluída",
      );
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept=".ret,.txt,.cnab,application/octet-stream,text/plain"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
        className="block w-full text-sm text-fg file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-white hover:file:bg-accent-dark"
      />
      {busy && (
        <div className="text-xs text-fg-dim">Parseando e atualizando...</div>
      )}
      {result && (
        <div className="rounded-xl border border-success/40 bg-green-50 p-3 text-xs text-success space-y-1">
          <div>
            Total de liquidações no arquivo:{" "}
            <strong className="font-mono">{result.total}</strong>
          </div>
          <div>
            Baixadas no sistema:{" "}
            <strong className="font-mono">{result.baixadas}</strong>
          </div>
          {result.naoEncontradas.length > 0 && (
            <div>
              <span className="text-warn">
                Não encontradas ({result.naoEncontradas.length}):
              </span>{" "}
              <span className="font-mono text-[10px]">
                {result.naoEncontradas.slice(0, 5).join(", ")}
                {result.naoEncontradas.length > 5
                  ? `, +${result.naoEncontradas.length - 5} mais`
                  : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
