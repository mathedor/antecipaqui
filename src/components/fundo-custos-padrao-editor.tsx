"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  upsertCustoPadraoAction,
  deleteCustoPadraoAction,
  type UpsertCustoPadraoState,
} from "@/lib/actions/fundo-custos-padrao";
import { useFeedback } from "@/components/feedback-provider";

type CustoPadrao = {
  id: string;
  fundoId: string;
  titulo: string;
  valor: string;
  ordem: number;
};

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FundoCustosPadraoEditor({
  fundoId,
  custos,
}: {
  fundoId: string;
  custos: CustoPadrao[];
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    UpsertCustoPadraoState,
    FormData
  >(upsertCustoPadraoAction, null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = editingId
    ? custos.find((c) => c.id === editingId)
    : null;

  if (state?.ok && editingId) {
    // Sai do modo edição após sucesso
    setEditingId(null);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-border bg-bg-elev p-6 md:p-7">
      <h3 className="font-bold mb-1">Custos padrão do fundo</h3>
      <p className="text-xs text-fg-muted mb-5">
        Estes custos são clonados automaticamente toda vez que admin vincular
        esse fundo a uma operação. Na operação podem ser ajustados e
        complementados sem afetar este cadastro.
      </p>

      {custos.length > 0 && (
        <ul className="space-y-2 mb-5">
          {custos.map((c) => (
            <li
              key={c.id}
              className="grid grid-cols-12 gap-3 items-center px-4 py-2.5 rounded-xl border border-border bg-bg"
            >
              <span className="col-span-6 truncate font-semibold text-sm">
                {c.titulo}
              </span>
              <span className="col-span-3 font-mono text-sm">
                {fmtBRL(parseFloat(c.valor))}
              </span>
              <span className="col-span-1 font-mono text-xs text-fg-dim">
                #{c.ordem}
              </span>
              <div className="col-span-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingId(c.id)}
                  className="text-xs text-accent hover:underline"
                >
                  editar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: "Remover custo padrão?",
                      message: `Remove "${c.titulo}". Não afeta operações já criadas.`,
                      confirmLabel: "Remover",
                      variant: "danger",
                    });
                    if (!ok) return;
                    try {
                      await deleteCustoPadraoAction(c.id, fundoId);
                      await alertSuccess("Custo removido.", "Pronto");
                      router.refresh();
                    } catch (e) {
                      await alertError((e as Error).message);
                    }
                  }}
                  className="text-xs text-danger hover:underline"
                >
                  remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={action} className="grid grid-cols-12 gap-3 items-end">
        <input type="hidden" name="fundoId" value={fundoId} />
        {editing && <input type="hidden" name="id" value={editing.id} />}
        <div className="col-span-12 md:col-span-5">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Título
          </label>
          <input
            name="titulo"
            defaultValue={editing?.titulo ?? ""}
            placeholder="Ex: Análise jurídica"
            className="form-input"
            required
          />
        </div>
        <div className="col-span-6 md:col-span-3">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Valor (R$)
          </label>
          <input
            name="valor"
            defaultValue={
              editing ? parseFloat(editing.valor).toFixed(2) : ""
            }
            placeholder="150,00"
            className="form-input"
            inputMode="decimal"
            required
          />
        </div>
        <div className="col-span-3 md:col-span-2">
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Ordem
          </label>
          <input
            name="ordem"
            type="number"
            defaultValue={editing?.ordem ?? 0}
            className="form-input"
            min={0}
          />
        </div>
        <div className="col-span-3 md:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="flex-1 h-10 px-4 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent-dark disabled:opacity-60"
          >
            {pending ? "..." : editing ? "Salvar" : "Adicionar"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="h-10 px-3 rounded-lg border border-border text-fg-muted hover:text-fg text-xs"
            >
              cancelar
            </button>
          )}
        </div>
        {state && !state.ok && (
          <div className="col-span-12 text-xs text-danger">{state.error}</div>
        )}
      </form>

      {custos.length === 0 && (
        <p className="mt-4 text-xs text-fg-dim italic">
          Nenhum custo padrão cadastrado ainda. Os custos adicionados aqui
          aparecerão automaticamente nas operações novas que usarem esse fundo.
        </p>
      )}
    </section>
  );
}
