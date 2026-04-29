"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateContractAction } from "@/lib/actions/admin";

type Props = {
  pdfUrl: string | null;
  createdAt: Date | string;
  status: string;
  operacaoId: string;
  adminMode?: boolean;
};

export function ContratoCard({
  pdfUrl,
  createdAt,
  status,
  operacaoId,
  adminMode = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [regenerated, setRegenerated] = useState<string | null>(null);

  const dt =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;

  function handleRegen() {
    if (!confirm("Regenerar o contrato substitui o anterior. Continuar?")) return;
    startTransition(async () => {
      try {
        const result = await regenerateContractAction(operacaoId);
        setRegenerated(result.url);
        router.refresh();
      } catch (e) {
        alert("Erro ao regenerar: " + (e as Error).message);
      }
    });
  }

  const url = regenerated ?? pdfUrl;

  return (
    <div className="rounded-2xl border border-success/30 bg-green-50 p-5 md:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-success mb-2">
            ✓ contrato gerado
          </div>
          <h3 className="text-lg font-bold">
            Termo de Cessão pronto pra assinatura
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            Status:{" "}
            <span className="font-mono text-xs uppercase">{status}</span> ·
            Gerado em{" "}
            {dt.toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-success text-white text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              📄 Baixar contrato
            </a>
          )}
          {adminMode && (
            <button
              type="button"
              onClick={handleRegen}
              disabled={pending}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-white text-fg-muted hover:text-fg hover:border-accent text-sm font-medium transition-colors disabled:opacity-60"
            >
              {pending ? "Regenerando..." : "↻ Regenerar"}
            </button>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-fg-muted">
        O contrato inclui o borderô completo da operação como anexo. Próxima
        etapa: enviar pra assinatura digital (3 partes — corretor, construtora,
        Antecipaqui).
      </p>
    </div>
  );
}
