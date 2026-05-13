"use client";

import { useActionState } from "react";
import {
  revogarApiKeyAction,
  type RevogarKeyState,
} from "@/lib/actions/fundo-api-keys";

export function RevogarApiKeyButton({ keyId }: { keyId: string }) {
  const [state, action, pending] = useActionState<RevogarKeyState, FormData>(
    revogarApiKeyAction,
    null,
  );

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Revogar essa key? Integrações que usam ela vão parar de funcionar imediatamente.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="keyId" value={keyId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg border border-danger/30 text-danger hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        {pending ? "revogando..." : "revogar"}
      </button>
      {state?.ok === false && (
        <span className="text-xs text-danger ml-2">{state.error}</span>
      )}
    </form>
  );
}
