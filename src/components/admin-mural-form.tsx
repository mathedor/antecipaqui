"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  createMuralMessageAction,
  updateMuralMessageAction,
  type MuralFormState,
} from "@/lib/actions/mural";
import type { MuralMessage } from "@/db/schema";

type Props =
  | { mode: "create"; message?: undefined; onDone?: () => void }
  | { mode: "edit"; message: MuralMessage; onDone?: () => void };

function toLocalDateTime(d: Date | string | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  // YYYY-MM-DDTHH:MM (formato datetime-local)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function AdminMuralForm(props: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const action = props.mode === "create"
    ? createMuralMessageAction
    : updateMuralMessageAction;
  const [state, formAction, pending] = useActionState<MuralFormState, FormData>(
    action,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      if (props.mode === "create") formRef.current?.reset();
      props.onDone?.();
      router.refresh();
    }
  }, [state, props, router]);

  const m = props.mode === "edit" ? props.message : null;

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {m && <input type="hidden" name="id" value={m.id} />}
      {state?.ok === false && (
        <div className="rounded-xl border border-danger/40 bg-red-50 text-danger p-3 text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Título (opcional)
        </label>
        <input
          name="titulo"
          defaultValue={m?.titulo ?? ""}
          maxLength={120}
          placeholder="Nova taxa do dia"
          className="form-input"
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
          Mensagem<span className="ml-1 text-accent">*</span>
        </label>
        <textarea
          name="body"
          required
          defaultValue={m?.body ?? ""}
          rows={4}
          maxLength={1000}
          placeholder="Escreva o recado..."
          className="w-full rounded-xl bg-bg border border-border-strong px-4 py-3 text-fg placeholder:text-fg-dim focus:border-accent outline-none transition-colors resize-y"
        />
        <p className="mt-1 text-[11px] text-fg-dim">Máx 1000 caracteres.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Destinatário<span className="ml-1 text-accent">*</span>
          </label>
          <select
            name="audience"
            defaultValue={m?.audience ?? "both"}
            className="form-input appearance-none"
          >
            <option value="both">Imobiliária + construtora</option>
            <option value="imobiliaria">Só imobiliária / corretor</option>
            <option value="construtora">Só construtora</option>
            <option value="comercial">Só comercial</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
            Expira em (opcional)
          </label>
          <input
            type="datetime-local"
            name="expiresAt"
            defaultValue={toLocalDateTime(m?.expiresAt ?? null)}
            className="form-input"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={m?.active ?? true}
            className="size-4 accent-current text-accent"
          />
          <span className="text-fg-muted">Recado ativo</span>
        </label>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="btn-primary !h-11 !px-5"
        >
          {pending
            ? "Salvando..."
            : props.mode === "create"
              ? "Publicar recado"
              : "Salvar alterações"}
        </button>
        {props.mode === "edit" && (
          <button
            type="button"
            onClick={() => props.onDone?.()}
            disabled={pending}
            className="text-sm text-fg-muted hover:text-fg transition-colors px-3 h-11 rounded-lg"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
