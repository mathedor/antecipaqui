"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listMeusTemplates,
  salvarTemplateAction,
  deleteTemplateAction,
  type OperacaoTemplateConfig,
  type SaveTemplateState,
} from "@/lib/actions/corretor-velocidade";
import { useFeedback } from "@/components/feedback-provider";

type Template = {
  id: string;
  nome: string;
  config: OperacaoTemplateConfig;
  construtoraNome: string | null;
};

/** Painel inline pra aplicar/salvar templates de operação por construtora.
 *  Mostra dropdown de templates existentes (filtrados pela construtora
 *  selecionada no form) + botão "Salvar atual". */
export function TemplatesOperacaoPanel({
  construtoraId,
  configAtual,
  onAplicar,
}: {
  construtoraId: string;
  configAtual: OperacaoTemplateConfig;
  /** Callback chamado quando user aplica um template. */
  onAplicar: (config: OperacaoTemplateConfig) => void;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [carregando, startTransition] = useTransition();
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [nomeInput, setNomeInput] = useState("");

  const [saveState, saveAction, savePending] = useActionState<
    SaveTemplateState,
    FormData
  >(salvarTemplateAction, null);

  useEffect(() => {
    if (!construtoraId) {
      setTemplates([]);
      return;
    }
    startTransition(async () => {
      try {
        const list = await listMeusTemplates(construtoraId);
        setTemplates(
          list.map((t) => ({
            id: t.id,
            nome: t.nome,
            config: t.config as OperacaoTemplateConfig,
            construtoraNome: t.construtoraNome,
          })),
        );
      } catch {
        setTemplates([]);
      }
    });
  }, [construtoraId]);

  useEffect(() => {
    if (saveState?.ok) {
      alertSuccess("Template salvo.", "Pronto");
      setShowSaveForm(false);
      setNomeInput("");
      // recarrega lista
      startTransition(async () => {
        const list = await listMeusTemplates(construtoraId);
        setTemplates(
          list.map((t) => ({
            id: t.id,
            nome: t.nome,
            config: t.config as OperacaoTemplateConfig,
            construtoraNome: t.construtoraNome,
          })),
        );
      });
    } else if (saveState && !saveState.ok) {
      alertError(saveState.error);
    }
  }, [saveState, construtoraId, alertError, alertSuccess]);

  if (!construtoraId) return null;

  async function handleDelete(id: string, nome: string) {
    const ok = await confirm({
      title: "Remover template?",
      message: `Remove "${nome}". Operações já criadas não são afetadas.`,
      confirmLabel: "Remover",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteTemplateAction(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      await alertSuccess("Template removido.");
      router.refresh();
    } catch (e) {
      await alertError((e as Error).message);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-bg-elev p-4 mb-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            templates desta construtora
          </div>
          <div className="text-xs text-fg-muted mt-0.5">
            Reaproveite configurações comuns (nº parcelas, % comissão).
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSaveForm((v) => !v)}
          className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:border-accent hover:text-accent"
        >
          {showSaveForm ? "Cancelar" : "+ Salvar atual"}
        </button>
      </div>

      {showSaveForm && (
        <form action={saveAction} className="mt-3 flex gap-2 flex-wrap">
          <input type="hidden" name="construtoraId" value={construtoraId} />
          <input
            type="hidden"
            name="config"
            value={JSON.stringify(configAtual)}
          />
          <input
            name="nome"
            value={nomeInput}
            onChange={(e) => setNomeInput(e.target.value)}
            placeholder="Ex: Lote 24 unidades"
            className="flex-1 h-9 px-3 rounded-lg border border-border bg-bg text-sm focus:border-accent outline-none"
            required
          />
          <button
            type="submit"
            disabled={savePending || !nomeInput.trim()}
            className="h-9 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-60"
          >
            {savePending ? "..." : "Salvar"}
          </button>
        </form>
      )}

      {templates.length > 0 ? (
        <ul className="space-y-1.5 mt-3">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            >
              <span className="flex-1 truncate">
                <span className="font-semibold">{t.nome}</span>
                <span className="ml-2 text-xs text-fg-dim font-mono">
                  {t.config.numeroParcelas
                    ? `${t.config.numeroParcelas}x`
                    : ""}
                  {t.config.percentualComissao
                    ? ` · ${(t.config.percentualComissao * 100).toFixed(2)}%`
                    : ""}
                  {t.config.pagadorTipo
                    ? ` · ${t.config.pagadorTipo}`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onAplicar(t.config)}
                className="text-xs text-accent hover:underline whitespace-nowrap"
              >
                aplicar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(t.id, t.nome)}
                className="text-xs text-danger hover:underline whitespace-nowrap"
              >
                remover
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !carregando && (
          <p className="text-xs text-fg-dim mt-3 italic">
            Nenhum template ainda. Clique em &ldquo;Salvar atual&rdquo; pra
            criar o primeiro.
          </p>
        )
      )}
    </div>
  );
}
