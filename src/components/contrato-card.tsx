"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateContractAction } from "@/lib/actions/admin";
import { useFeedback } from "@/components/feedback-provider";
import type { ContratoSigner } from "@/db/schema";

type Props = {
  pdfUrl: string | null;
  createdAt: Date | string;
  status: string;
  operacaoId: string;
  adminMode?: boolean;
  signers?: ContratoSigner[] | null;
  zapsignDocumentToken?: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  cedente: "Cedente (corretor/imobiliária)",
  construtora: "Construtora",
  antecipaqui: "Antecipaqui",
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  gerado: { label: "Gerado · aguardando envio", tone: "warn" },
  enviado_assinatura: { label: "Enviado p/ assinatura", tone: "accent" },
  parcialmente_assinado: {
    label: "Parcialmente assinado",
    tone: "accent",
  },
  totalmente_assinado: { label: "Totalmente assinado", tone: "success" },
  cancelado: { label: "Cancelado", tone: "danger" },
};

function formatDateTime(d: string | Date) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ContratoCard({
  pdfUrl,
  createdAt,
  status,
  operacaoId,
  adminMode = false,
  signers,
  zapsignDocumentToken,
}: Props) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [pending, startTransition] = useTransition();
  const [regenerated, setRegenerated] = useState<string | null>(null);

  const dt =
    typeof createdAt === "string" ? new Date(createdAt) : createdAt;

  async function handleRegen() {
    const ok = await confirm({
      title: "Regenerar contrato",
      message:
        "Regenerar o contrato substitui o anterior. Os signatários precisarão assinar novamente. Continuar?",
      confirmLabel: "Regenerar",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const result = await regenerateContractAction(operacaoId);
        setRegenerated(result.url);
        await alertSuccess(
          "Novo contrato gerado e enviado pra ZapSign.",
          "Contrato regenerado",
        );
        router.refresh();
      } catch (e) {
        await alertError((e as Error).message, "Erro ao regenerar contrato");
      }
    });
  }

  const url = regenerated ?? pdfUrl;
  const statusInfo = STATUS_LABEL[status] ?? {
    label: status,
    tone: "default",
  };
  const isCompleted = status === "totalmente_assinado";
  const cardBorder = isCompleted
    ? "border-success/30 bg-green-50"
    : status === "cancelado"
      ? "border-danger/30 bg-red-50"
      : "border-accent/30 bg-accent-soft";

  return (
    <div className={`rounded-2xl border p-5 md:p-6 ${cardBorder}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div
            className={`font-mono text-[10px] uppercase tracking-wider mb-2 ${
              statusInfo.tone === "success"
                ? "text-success"
                : statusInfo.tone === "danger"
                  ? "text-danger"
                  : "text-accent"
            }`}
          >
            contrato · {statusInfo.label}
          </div>
          <h3 className="text-lg font-bold">
            Termo de Cessão de Comissão
          </h3>
          <p className="mt-1 text-sm text-fg-muted">
            Gerado em {formatDateTime(dt)}
            {zapsignDocumentToken && (
              <>
                {" · "}
                <span className="font-mono text-[10px]">
                  ZapSign {zapsignDocumentToken.slice(0, 8)}…
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-fg text-bg text-sm font-semibold hover:bg-fg/90 transition-colors"
            >
              📄 Baixar PDF
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

      {signers && signers.length > 0 && (
        <div className="mt-5 pt-5 border-t border-border-strong/50">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-3">
            assinaturas ({signers.filter((s) => s.signedAt).length}/
            {signers.length})
          </div>
          <ul className="space-y-2">
            {signers.map((s) => {
              const signed = !!s.signedAt;
              return (
                <li
                  key={s.zapsignToken}
                  className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${
                    signed
                      ? "border-success/40 bg-white"
                      : "border-border bg-white"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${
                          signed ? "bg-success" : "bg-fg-dim"
                        }`}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
                        {ROLE_LABEL[s.role] ?? s.role}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm font-semibold truncate">
                      {s.name}
                    </div>
                    <div className="text-xs text-fg-muted truncate">
                      {s.email}
                    </div>
                    {signed && (
                      <div className="mt-0.5 text-[11px] font-mono text-success">
                        ✓ assinado em {formatDateTime(s.signedAt!)}
                      </div>
                    )}
                  </div>
                  {!signed && s.signUrl && (
                    <a
                      href={s.signUrl}
                      target="_blank"
                      rel="noopener"
                      className="text-accent text-sm font-semibold whitespace-nowrap shrink-0 hover:underline"
                    >
                      assinar ↗
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
          {!isCompleted && status !== "cancelado" && (
            <p className="mt-3 text-xs text-fg-muted">
              Cada signatário também recebe o link por email automaticamente
              pela ZapSign.
            </p>
          )}
        </div>
      )}

      {!signers && status === "gerado" && (
        <p className="mt-4 text-xs text-fg-muted">
          Contrato gerado mas ainda não enviado pra ZapSign. Use "Regenerar" pra
          tentar novamente.
        </p>
      )}
    </div>
  );
}
