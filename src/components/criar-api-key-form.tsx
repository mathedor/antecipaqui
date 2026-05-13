"use client";

import { useActionState, useState } from "react";
import {
  criarApiKeyAction,
  type CriarKeyState,
} from "@/lib/actions/fundo-api-keys";

export function CriarApiKeyForm() {
  const [state, action, pending] = useActionState<CriarKeyState, FormData>(
    criarApiKeyAction,
    null,
  );
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (state?.ok) {
      await navigator.clipboard.writeText(state.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-5">
      {state?.ok === true && (
        <div className="rounded-xl border border-success/40 bg-green-50 p-4 space-y-3">
          <div className="font-bold text-success text-sm flex items-center gap-2">
            ✓ Key criada — copie agora, não vamos mostrar de novo
          </div>
          <div className="flex items-stretch rounded-lg border border-border-strong overflow-hidden bg-bg">
            <code className="flex-1 min-w-0 font-mono text-xs px-3 py-2 break-all">
              {state.token}
            </code>
            <button
              type="button"
              onClick={copy}
              className="bg-bg-soft hover:bg-bg-soft/70 px-4 text-xs font-mono uppercase tracking-wider border-l border-border-strong shrink-0"
            >
              {copied ? "copiado!" : "copiar"}
            </button>
          </div>
          <p className="text-xs text-fg-muted">
            Guarde em variável de ambiente (ex:{" "}
            <code className="font-mono">ANTECIPAQUI_API_KEY</code>) ou no cofre
            de secrets do seu sistema. Se perder, gere uma nova e revogue
            esta.
          </p>
        </div>
      )}
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Nome / descrição
          </label>
          <input
            name="nome"
            placeholder="Ex: integração ERP produção"
            required
            maxLength={80}
            className="w-full bg-bg h-11 px-4 rounded-xl border border-border-strong text-fg placeholder:text-fg-dim outline-none focus:border-accent transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Escopo
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Radio
              name="escopo"
              value="read_only"
              defaultChecked
              label="Somente leitura"
              desc="Lê operações + parcelas. Não pode aprovar/recusar."
            />
            <Radio
              name="escopo"
              value="read_write"
              label="Leitura + escrita"
              desc="Pode aprovar/recusar ops via POST."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary !h-11 !px-6"
        >
          {pending ? "Gerando..." : "Gerar API key"}
        </button>
      </form>
    </div>
  );
}

function Radio({
  name,
  value,
  label,
  desc,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  desc: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex gap-3 rounded-xl border border-border bg-bg p-3 cursor-pointer hover:border-accent transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 accent-accent"
      />
      <div className="min-w-0">
        <div className="font-semibold text-sm text-fg">{label}</div>
        <div className="text-xs text-fg-muted mt-0.5">{desc}</div>
      </div>
    </label>
  );
}
