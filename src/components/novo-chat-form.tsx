"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  openChatAction,
  type OpenChatState,
} from "@/lib/actions/chat";
import { type ChatCategoria } from "@/lib/chat-helpers";
import { useFeedback } from "@/components/feedback-provider";

type CategoriaOption = {
  value: ChatCategoria;
  label: string;
  helper: string;
  precisaOperacao: boolean;
};

type OperacaoOption = {
  id: string;
  numero: string;
  construtoraNome: string | null;
  fundoId: string | null;
};

export function NovoChatForm({
  categorias,
  operacoes,
}: {
  categorias: CategoriaOption[];
  operacoes: OperacaoOption[];
}) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<OpenChatState, FormData>(
    openChatAction,
    null,
  );

  const [categoria, setCategoria] = useState<ChatCategoria>(
    categorias[0]?.value ?? "suporte",
  );
  const [operacaoId, setOperacaoId] = useState<string>("");

  const categoriaInfo = useMemo(
    () => categorias.find((c) => c.value === categoria),
    [categorias, categoria],
  );

  useEffect(() => {
    if (state?.ok) {
      const title =
        state.warnings.length > 0 ? "Chat aberto · atenção" : "Pronto";
      const message =
        state.warnings.length > 0
          ? "Chat aberto.\n\n" + state.warnings.join("\n")
          : "Chat aberto.";
      alertSuccess(message, title).then(() =>
        router.push(`/painel/suporte/${state.ticketId}`),
      );
    } else if (state && !state.ok) {
      alertError(state.error, "Erro ao abrir chat");
    }
  }, [state, router, alertSuccess, alertError]);

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
        <h3 className="font-bold mb-1">Categoria</h3>
        <p className="text-xs text-fg-muted mb-5">
          Escolha o setor que vai te atender — cada categoria conecta com a
          pessoa certa automaticamente.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categorias.map((c) => {
            const isActive = c.value === categoria;
            return (
              <label
                key={c.value}
                className={`cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                  isActive
                    ? "border-accent bg-accent-soft"
                    : "border-border bg-bg hover:border-accent/40"
                }`}
              >
                <input
                  type="radio"
                  name="categoria"
                  value={c.value}
                  checked={isActive}
                  onChange={() => {
                    setCategoria(c.value);
                    if (!c.precisaOperacao) setOperacaoId("");
                  }}
                  className="sr-only"
                />
                <div
                  className={`font-bold mb-1 ${
                    isActive ? "text-accent" : "text-fg"
                  }`}
                >
                  {c.label}
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  {c.helper}
                </p>
              </label>
            );
          })}
        </div>
      </section>

      {categoriaInfo?.precisaOperacao && (
        <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
          <h3 className="font-bold mb-1">Operação relacionada *</h3>
          <p className="text-xs text-fg-muted mb-5">
            O chat fica vinculado a essa operação — a pessoa do outro lado já
            entra no contexto.
          </p>
          {operacoes.length === 0 ? (
            <div className="rounded-xl border border-warn/40 bg-yellow-50 text-warn p-4 text-sm">
              Você ainda não tem operações disponíveis pra usar como contexto.
            </div>
          ) : (
            <select
              name="operacaoId"
              required
              value={operacaoId}
              onChange={(e) => setOperacaoId(e.target.value)}
              className="form-input"
            >
              <option value="">Selecione...</option>
              {operacoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.numero}
                  {o.construtoraNome ? ` · ${o.construtoraNome}` : ""}
                  {o.fundoId ? "" : " · sem fundo"}
                </option>
              ))}
            </select>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
        <h3 className="font-bold mb-1">Mensagem</h3>
        <p className="text-xs text-fg-muted mb-5">
          Comece a conversa. Pode adicionar detalhes ou pedidos específicos.
        </p>
        <div className="space-y-3">
          <input
            name="assunto"
            required
            maxLength={200}
            placeholder="Assunto curto (ex: Confirmação operação OP-2026-0123)"
            className="form-input"
          />
          <textarea
            name="body"
            rows={5}
            required
            placeholder="Escreva aqui..."
            className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-y"
          />
        </div>
      </section>

      <button
        type="submit"
        disabled={
          pending ||
          (categoriaInfo?.precisaOperacao && !operacaoId) ||
          !categoria
        }
        className="btn-primary !h-12 !px-6"
      >
        {pending ? "Abrindo..." : "Abrir chat"}
      </button>
    </form>
  );
}