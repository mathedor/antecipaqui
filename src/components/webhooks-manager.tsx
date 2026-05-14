"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createWebhookAction,
  deleteWebhookAction,
  toggleWebhookAction,
  type CreateWebhookState,
} from "@/lib/actions/webhooks";
import { EVENTOS_DISPONIVEIS } from "@/lib/webhooks-eventos";
import { useFeedback } from "@/components/feedback-provider";

type Webhook = {
  id: string;
  nome: string;
  targetUrl: string;
  eventos: string[];
  isActive: boolean;
  createdAt: Date | string;
  lastDeliveryAt: Date | string | null;
  lastDeliveryStatus: string | null;
  ownerRole: string;
};

const EVENTO_LABEL: Record<string, string> = {
  op_status_change: "Status da operação muda",
  op_aprovada: "Operação aprovada",
  op_recusada: "Operação recusada",
  fundo_decisao: "Decisão do fundo",
  parcela_paga: "Parcela paga",
  antecipacao_decisao: "Decisão de antecipação",
  renegociacao_decisao: "Decisão de renegociação",
};

function fmtDT(d: Date | string | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function WebhooksManager({
  webhooks,
}: {
  webhooks: Webhook[];
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<CreateWebhookState, FormData>(
    createWebhookAction,
    null,
  );
  const [secretRevelado, setSecretRevelado] = useState<string | null>(null);

  if (state?.ok && state.secret && !secretRevelado) {
    setSecretRevelado(state.secret);
    setTimeout(() => router.refresh(), 100);
  }

  async function copiar(text: string) {
    await navigator.clipboard.writeText(text);
    await alertSuccess("Copiado.", "Pronto");
  }

  async function toggle(id: string, ativo: boolean) {
    try {
      await toggleWebhookAction(id, ativo);
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    }
  }

  async function remover(id: string, nome: string) {
    const ok = await confirm({
      title: "Remover webhook?",
      message: `Remove "${nome}" — eventos pendentes em fila são apagados também.`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteWebhookAction(id);
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-bg-elev p-5">
        <h3 className="font-bold mb-3">Criar webhook</h3>
        <form action={action} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Nome
              </label>
              <input
                name="nome"
                placeholder="Ex: CRM da empresa"
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                URL alvo
              </label>
              <input
                name="targetUrl"
                type="url"
                placeholder="https://api.suaempresa.com/webhooks/antecipaqui"
                className="form-input font-mono text-xs"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Eventos a receber
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EVENTOS_DISPONIVEIS.map((ev) => (
                <label
                  key={ev}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg cursor-pointer hover:border-accent text-xs"
                >
                  <input type="checkbox" name="eventos" value={ev} />
                  <span>{EVENTO_LABEL[ev] ?? ev}</span>
                </label>
              ))}
            </div>
          </div>
          {state && !state.ok && (
            <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-xs">
              {state.error}
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="h-10 px-4 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "Criando..." : "Criar webhook"}
          </button>
        </form>
      </section>

      {secretRevelado && (
        <section className="rounded-2xl border border-accent/40 bg-accent-soft p-5">
          <h3 className="font-bold mb-2">⚠ Segredo do webhook</h3>
          <p className="text-xs mb-3">
            Copie agora. Esse segredo só aparece <strong>uma vez</strong>.
            Use pra validar a assinatura HMAC-SHA256 que vem no header{" "}
            <code className="font-mono">x-antecipaqui-signature</code>.
          </p>
          <div className="flex items-center gap-2 bg-bg p-3 rounded-lg border border-border">
            <code className="font-mono text-xs flex-1 break-all">
              {secretRevelado}
            </code>
            <button
              type="button"
              onClick={() => copiar(secretRevelado)}
              className="h-8 px-3 rounded-lg border border-border text-xs hover:border-accent"
            >
              📋 Copiar
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSecretRevelado(null)}
            className="mt-3 text-xs text-fg-muted hover:text-fg"
          >
            Já copiei, ocultar
          </button>
        </section>
      )}

      <section>
        <h3 className="font-bold mb-3">
          Webhooks ativos ({webhooks.length})
        </h3>
        {webhooks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
            Nenhum webhook configurado ainda.
          </div>
        ) : (
          <ul className="space-y-2">
            {webhooks.map((w) => (
              <li
                key={w.id}
                className={`rounded-xl border p-4 ${
                  w.isActive
                    ? "border-border bg-bg-elev"
                    : "border-border bg-bg-card opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <div className="font-bold">{w.nome}</div>
                    <code className="font-mono text-[10px] text-fg-muted block break-all">
                      {w.targetUrl}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(w.id, !w.isActive)}
                      className="text-xs text-accent hover:underline"
                    >
                      {w.isActive ? "desativar" : "reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remover(w.id, w.nome)}
                      className="text-xs text-danger hover:underline"
                    >
                      remover
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(w.eventos as string[]).map((ev) => (
                    <span
                      key={ev}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent-soft text-accent text-[10px] font-mono"
                    >
                      {EVENTO_LABEL[ev] ?? ev}
                    </span>
                  ))}
                </div>
                <div className="text-[10px] text-fg-dim font-mono">
                  Criado em {fmtDT(w.createdAt)}
                  {w.lastDeliveryAt && (
                    <>
                      {" · "}última entrega {fmtDT(w.lastDeliveryAt)}
                      {w.lastDeliveryStatus && ` · ${w.lastDeliveryStatus}`}
                    </>
                  )}
                  {" · "}
                  {w.ownerRole}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
