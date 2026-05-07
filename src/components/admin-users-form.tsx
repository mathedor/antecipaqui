"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  inviteAdminAction,
  updateAdminProfileAction,
  revokeAdminAction,
  toggleAdminActiveAction,
  type AdminUserState,
} from "@/lib/actions/admin-users";
import { useFeedback } from "@/components/feedback-provider";
import {
  ADMIN_PROFILE_LABEL,
  ADMIN_PROFILE_DESCRIPTION,
  type AdminProfile,
} from "@/lib/admin-permissions";

const PROFILES: AdminProfile[] = [
  "super",
  "financeiro",
  "operacoes",
  "suporte",
];

export function InviteAdminForm() {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<AdminUserState, FormData>(
    inviteAdminAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      alertSuccess(
        state.created
          ? "Admin promovido. O perfil já está ativo."
          : "Perfil atualizado.",
        "Pronto",
      );
      router.refresh();
    } else if (state && !state.ok) {
      alertError(state.error, "Erro");
    }
  }, [state, router, alertSuccess, alertError]);

  return (
    <form action={action} className="rounded-2xl border border-border bg-bg-elev p-6 space-y-4">
      <h3 className="font-bold">Promover admin existente</h3>
      <p className="text-xs text-fg-muted">
        Pra promover, a pessoa precisa ter feito login pelo menos 1 vez (ou
        seja, ter um cadastro inicial). Aí informa o email + perfil aqui.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Email da pessoa *">
          <input
            name="email"
            type="email"
            required
            placeholder="email@exemplo.com"
            className="form-input"
          />
        </Field>
        <Field label="Nome (opcional)">
          <input
            name="nome"
            placeholder="Como aparece no painel"
            className="form-input"
          />
        </Field>
      </div>

      <Field label="Perfil de acesso *">
        <ProfileRadioGroup name="adminProfile" />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="btn-primary !h-11 !px-5"
      >
        {pending ? "Salvando..." : "Promover / atualizar"}
      </button>
    </form>
  );
}

export function EditAdminProfileForm({
  userId,
  currentProfile,
  email,
}: {
  userId: string;
  currentProfile: string | null;
  email: string;
}) {
  const router = useRouter();
  const { alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<AdminUserState, FormData>(
    updateAdminProfileAction,
    null,
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      alertSuccess("Perfil atualizado.", "Pronto");
      setOpen(false);
      router.refresh();
    } else if (state && !state.ok) {
      alertError(state.error, "Erro");
    }
  }, [state, router, alertSuccess, alertError]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-accent text-xs font-semibold hover:underline"
      >
        editar perfil
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 mt-2">
      <input type="hidden" name="userId" value={userId} />
      <ProfileRadioGroup
        name="adminProfile"
        defaultValue={currentProfile ?? "super"}
        compact
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-dark"
        >
          {pending ? "..." : "salvar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-fg-muted text-xs hover:text-fg"
        >
          cancelar
        </button>
        <span className="text-[10px] text-fg-dim self-center font-mono truncate">
          {email}
        </span>
      </div>
    </form>
  );
}

export function RevokeAdminButton({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Revogar admin",
          message: `Remover privilégio de admin de ${email}? A pessoa vira corretor (default) — não perde a conta, só os acessos.`,
          confirmLabel: "Revogar",
          variant: "danger",
        });
        if (!ok) return;
        try {
          await revokeAdminAction(userId);
          await alertSuccess("Admin revogado.", "Pronto");
          router.refresh();
        } catch (e) {
          await alertError((e as Error).message);
        }
      }}
      className="text-danger text-xs font-semibold hover:underline"
    >
      revogar admin
    </button>
  );
}

export function ToggleAdminActiveButton({
  userId,
  email,
  isActive,
}: {
  userId: string;
  email: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: isActive ? "Bloquear admin" : "Reativar admin",
          message: `${isActive ? "Bloquear" : "Reativar"} ${email}?`,
          confirmLabel: isActive ? "Bloquear" : "Reativar",
          variant: isActive ? "danger" : "default",
        });
        if (!ok) return;
        try {
          await toggleAdminActiveAction(userId);
          await alertSuccess(
            isActive ? "Bloqueado." : "Reativado.",
            "Pronto",
          );
          router.refresh();
        } catch (e) {
          await alertError((e as Error).message);
        }
      }}
      className={`text-xs font-semibold hover:underline ${
        isActive ? "text-warn" : "text-success"
      }`}
    >
      {isActive ? "bloquear" : "reativar"}
    </button>
  );
}

function ProfileRadioGroup({
  name,
  defaultValue = "operacoes",
  compact = false,
}: {
  name: string;
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"}`}
    >
      {PROFILES.map((p) => (
        <label
          key={p}
          className={`cursor-pointer border-2 rounded-xl ${compact ? "p-2.5" : "p-4"} transition-colors hover:border-accent/40 has-[input:checked]:border-accent has-[input:checked]:bg-accent-soft`}
        >
          <input
            type="radio"
            name={name}
            value={p}
            defaultChecked={p === defaultValue}
            className="sr-only"
          />
          <div className={`font-bold ${compact ? "text-xs" : "text-sm"} mb-0.5`}>
            {ADMIN_PROFILE_LABEL[p]}
          </div>
          {!compact && (
            <p className="text-[11px] text-fg-muted leading-relaxed">
              {ADMIN_PROFILE_DESCRIPTION[p]}
            </p>
          )}
        </label>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
        {label}
      </label>
      {children}
    </div>
  );
}