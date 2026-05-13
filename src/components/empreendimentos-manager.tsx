"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  upsertEmpreendimentoAction,
  toggleEmpreendimentoActiveAction,
  type UpsertEmpreendimentoState,
} from "@/lib/actions/construtora-operacional";
import { useFeedback } from "@/components/feedback-provider";

type Empreendimento = {
  id: string;
  nome: string;
  descricao: string | null;
  cidade: string | null;
  uf: string | null;
  isActive: boolean;
};

export function EmpreendimentosManager({
  empreendimentos,
}: {
  empreendimentos: Empreendimento[];
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    UpsertEmpreendimentoState,
    FormData
  >(upsertEmpreendimentoAction, null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (state?.ok && editingId !== null) {
    setEditingId(null);
    router.refresh();
  }

  const editing = editingId
    ? empreendimentos.find((e) => e.id === editingId)
    : null;

  const ativos = empreendimentos.filter((e) => e.isActive);
  const inativos = empreendimentos.filter((e) => !e.isActive);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-bg-elev p-6">
        <h3 className="font-bold mb-4">
          {editing ? "Editar empreendimento" : "Novo empreendimento"}
        </h3>
        <form action={action} className="grid grid-cols-12 gap-3">
          {editing && (
            <input type="hidden" name="id" value={editing.id} />
          )}
          <div className="col-span-12 md:col-span-6">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Nome
            </label>
            <input
              name="nome"
              defaultValue={editing?.nome ?? ""}
              placeholder="Ex: Torre Aurora"
              className="form-input"
              required
            />
          </div>
          <div className="col-span-8 md:col-span-4">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Cidade
            </label>
            <input
              name="cidade"
              defaultValue={editing?.cidade ?? ""}
              className="form-input"
            />
          </div>
          <div className="col-span-4 md:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              UF
            </label>
            <input
              name="uf"
              defaultValue={editing?.uf ?? ""}
              maxLength={2}
              className="form-input font-mono uppercase"
            />
          </div>
          <div className="col-span-12">
            <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
              Descrição (opcional)
            </label>
            <textarea
              name="descricao"
              defaultValue={editing?.descricao ?? ""}
              rows={2}
              placeholder="Detalhes do empreendimento, número de unidades, fase..."
              className="form-input"
            />
          </div>
          <div className="col-span-12 flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="h-10 px-5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
            >
              {pending ? "..." : editing ? "Salvar" : "Adicionar"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="h-10 px-4 rounded-lg border border-border text-fg-muted hover:text-fg text-sm"
              >
                cancelar
              </button>
            )}
            {state && !state.ok && (
              <span className="self-center text-xs text-danger">
                {state.error}
              </span>
            )}
          </div>
        </form>
      </section>

      {ativos.length > 0 && (
        <section>
          <h3 className="font-bold mb-3">Ativos ({ativos.length})</h3>
          <ul className="space-y-2">
            {ativos.map((e) => (
              <EmpreendimentoRow
                key={e.id}
                e={e}
                onEdit={() => setEditingId(e.id)}
                onToggle={async () => {
                  const ok = await confirm({
                    title: "Desativar empreendimento?",
                    message: `${e.nome} fica oculto nas listagens mas as operações vinculadas continuam intactas.`,
                    confirmLabel: "Desativar",
                  });
                  if (!ok) return;
                  try {
                    await toggleEmpreendimentoActiveAction(e.id, false);
                    await alertSuccess("Desativado.");
                    router.refresh();
                  } catch (er) {
                    await alertError((er as Error).message);
                  }
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {inativos.length > 0 && (
        <section>
          <h3 className="font-bold mb-3 text-fg-muted">
            Inativos ({inativos.length})
          </h3>
          <ul className="space-y-2 opacity-70">
            {inativos.map((e) => (
              <EmpreendimentoRow
                key={e.id}
                e={e}
                onEdit={() => setEditingId(e.id)}
                onToggle={async () => {
                  await toggleEmpreendimentoActiveAction(e.id, true);
                  await alertSuccess("Reativado.");
                  router.refresh();
                }}
              />
            ))}
          </ul>
        </section>
      )}

      {empreendimentos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center">
          <div className="text-4xl mb-3">🏗️</div>
          <p className="text-fg-muted">
            Nenhum empreendimento cadastrado ainda. Adicione o primeiro acima.
          </p>
        </div>
      )}
    </div>
  );
}

function EmpreendimentoRow({
  e,
  onEdit,
  onToggle,
}: {
  e: Empreendimento;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <li className="grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl border border-border bg-bg-elev">
      <div className="col-span-12 md:col-span-7">
        <div className="font-bold text-sm">{e.nome}</div>
        {e.descricao && (
          <div className="text-xs text-fg-muted mt-0.5">{e.descricao}</div>
        )}
      </div>
      <div className="col-span-6 md:col-span-3 text-xs text-fg-muted">
        {e.cidade ?? "—"}{e.uf ? ` / ${e.uf}` : ""}
      </div>
      <div className="col-span-6 md:col-span-2 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-accent hover:underline"
        >
          editar
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="text-xs text-fg-muted hover:text-fg"
        >
          {e.isActive ? "desativar" : "reativar"}
        </button>
      </div>
    </li>
  );
}
