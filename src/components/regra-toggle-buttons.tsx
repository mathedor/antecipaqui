"use client";

import { useActionState } from "react";
import {
  toggleRegraAction,
  deletarRegraAction,
  type ToggleRegraState,
} from "@/lib/actions/fundo-mesa";

type Props = {
  regraId: string;
  ativa: boolean;
};

export function RegraToggleButtons({ regraId, ativa }: Props) {
  const [toggleState, toggleAction, togglePending] = useActionState<
    ToggleRegraState,
    FormData
  >(toggleRegraAction, null);
  const [deleteState, deleteAction, deletePending] = useActionState<
    ToggleRegraState,
    FormData
  >(deletarRegraAction, null);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <form action={toggleAction} className="inline-flex">
        <input type="hidden" name="id" value={regraId} />
        <button
          type="submit"
          disabled={togglePending || deletePending}
          className={`h-8 px-3 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-50 ${
            ativa
              ? "border border-warn/40 text-warn hover:bg-yellow-50"
              : "border border-success/40 text-success hover:bg-green-50"
          }`}
        >
          {togglePending ? "..." : ativa ? "desativar" : "ativar"}
        </button>
      </form>
      <form
        action={deleteAction}
        className="inline-flex"
        onSubmit={(e) => {
          if (!confirm("Apagar essa regra? Esta ação não pode ser desfeita.")) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={regraId} />
        <button
          type="submit"
          disabled={togglePending || deletePending}
          className="h-8 px-2 rounded text-xs text-fg-dim hover:text-danger disabled:opacity-50"
        >
          {deletePending ? "..." : "apagar"}
        </button>
      </form>
      {(toggleState?.ok === false || deleteState?.ok === false) && (
        <span className="text-xs text-danger">
          {toggleState?.ok === false
            ? toggleState.error
            : deleteState?.ok === false
              ? deleteState.error
              : ""}
        </span>
      )}
    </div>
  );
}
