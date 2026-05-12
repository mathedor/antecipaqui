"use client";

import { useActionState, useState } from "react";
import {
  toggleBlacklistAction,
  type BlacklistState,
} from "@/lib/actions/fundo-risco";

type Props = {
  construtoraId: string;
  construtoraNome: string;
  blacklisted: boolean;
};

export function BlacklistToggleButton({
  construtoraId,
  construtoraNome,
  blacklisted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [state, action, pending] = useActionState<BlacklistState, FormData>(
    toggleBlacklistAction,
    null,
  );

  // Remoção: confirmação inline rápida, sem motivo
  if (blacklisted) {
    return (
      <form action={action} className="inline-flex">
        <input type="hidden" name="construtoraId" value={construtoraId} />
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-mono text-accent hover:underline disabled:opacity-50"
          title="Remover bloqueio"
        >
          {pending ? "..." : "desbloquear"}
        </button>
      </form>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-mono text-danger hover:underline"
      >
        bloquear →
      </button>
    );
  }

  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="construtoraId" value={construtoraId} />
      <input
        name="motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder={`Por que bloquear ${construtoraNome.slice(0, 20)}?`}
        className="h-8 px-2 rounded border border-border-strong bg-bg text-xs w-48"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-8 px-2 rounded bg-danger text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {pending ? "..." : "OK"}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-8 px-1.5 rounded border border-border-strong text-fg-muted text-xs"
      >
        ✕
      </button>
      {state?.ok === false && (
        <span className="text-xs text-danger">{state.error}</span>
      )}
    </form>
  );
}
