"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  convidarMembroAction,
  removerMembroAction,
  alterarRoleInternaAction,
  type ConvidarMembroState,
} from "@/lib/actions/construtora-membros";
import { useFeedback } from "@/components/feedback-provider";

type Owner = {
  id: string;
  nome: string | null;
  email: string;
  telefone: string | null;
};

type Membro = {
  id: string;
  userId: string;
  roleInterna: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  addedAt: Date | string;
  aceitoEm: Date | string | null;
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono(a) da conta",
  financeiro: "Financeiro",
  comercial: "Comercial",
  juridico: "Jurídico",
  outro: "Outro",
};

function formatDateTime(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EquipeManager({
  owner,
  membros,
  canManage,
}: {
  owner: Owner | null;
  membros: Membro[];
  canManage: boolean;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [state, action, pending] = useActionState<
    ConvidarMembroState,
    FormData
  >(convidarMembroAction, null);

  if (state?.ok) {
    setTimeout(() => {
      alertSuccess(
        "Convite enviado. O colega vai receber um email da Clerk pra aceitar.",
        "Enviado",
      );
      router.refresh();
    }, 0);
  }

  return (
    <div className="space-y-6">
      {owner && (
        <section className="rounded-2xl border border-accent/40 bg-accent-soft p-5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
            dono(a) da conta
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-bold text-fg">
                {owner.nome ?? owner.email}
              </div>
              <div className="text-xs text-fg-muted mt-0.5">
                {owner.email}{" "}
                {owner.telefone && (
                  <>
                    · <span className="font-mono">{owner.telefone}</span>
                  </>
                )}
              </div>
            </div>
            <span className="text-xs text-fg-muted">acesso total</span>
          </div>
        </section>
      )}

      {canManage && (
        <section className="rounded-2xl border border-border bg-bg-elev p-5">
          <h3 className="font-bold mb-3">Convidar membro</h3>
          <form action={action} className="grid grid-cols-12 gap-3 items-end">
            <div className="col-span-12 md:col-span-6">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="colega@suaconstrutora.com.br"
                className="form-input"
                required
              />
            </div>
            <div className="col-span-8 md:col-span-4">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Função interna
              </label>
              <select name="roleInterna" defaultValue="outro" className="form-input">
                <option value="financeiro">Financeiro</option>
                <option value="comercial">Comercial</option>
                <option value="juridico">Jurídico</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="col-span-4 md:col-span-2">
              <button
                type="submit"
                disabled={pending}
                className="w-full h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-60"
              >
                {pending ? "..." : "Convidar"}
              </button>
            </div>
            {state && !state.ok && (
              <div className="col-span-12 text-xs text-danger">{state.error}</div>
            )}
          </form>
          <p className="text-xs text-fg-dim mt-3">
            ⚠ Permissões por função ainda não filtram conteúdo — todos veem o
            mesmo painel da construtora por enquanto. Em breve cada função vai
            ter acesso restrito ao que faz sentido.
          </p>
        </section>
      )}

      <section>
        <h3 className="font-bold mb-3">
          Membros ({membros.length})
        </h3>
        {membros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
            Nenhum membro convidado ainda.
            {canManage && " Use o form acima pra convidar."}
          </div>
        ) : (
          <ul className="space-y-2">
            {membros.map((m) => (
              <li
                key={m.id}
                className="grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl border border-border bg-bg-elev"
              >
                <div className="col-span-12 md:col-span-5">
                  <div className="font-semibold text-sm">
                    {m.nome ?? m.email ?? "—"}
                  </div>
                  <div className="text-xs text-fg-muted">{m.email ?? ""}</div>
                </div>
                <div className="col-span-6 md:col-span-3">
                  {canManage ? (
                    <select
                      defaultValue={m.roleInterna}
                      onChange={async (e) => {
                        try {
                          await alterarRoleInternaAction(m.id, e.target.value);
                          router.refresh();
                        } catch (err) {
                          await alertError((err as Error).message);
                        }
                      }}
                      className="form-input !h-8 !text-xs"
                    >
                      <option value="financeiro">Financeiro</option>
                      <option value="comercial">Comercial</option>
                      <option value="juridico">Jurídico</option>
                      <option value="outro">Outro</option>
                    </select>
                  ) : (
                    <span className="text-xs">
                      {ROLE_LABEL[m.roleInterna] ?? m.roleInterna}
                    </span>
                  )}
                </div>
                <div className="col-span-3 md:col-span-2 text-xs text-fg-muted font-mono">
                  {m.aceitoEm ? formatDateTime(m.aceitoEm) : "aguardando"}
                </div>
                <div className="col-span-3 md:col-span-2 flex justify-end">
                  {canManage && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Remover membro?",
                          message: `${m.nome ?? m.email} perde acesso à sua construtora. Você pode reconvidar depois.`,
                          confirmLabel: "Remover",
                          variant: "danger",
                        });
                        if (!ok) return;
                        try {
                          await removerMembroAction(m.id);
                          await alertSuccess("Membro removido.");
                          router.refresh();
                        } catch (e) {
                          await alertError((e as Error).message);
                        }
                      }}
                      className="text-xs text-danger hover:underline"
                    >
                      remover
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
