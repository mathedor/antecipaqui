"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  alterarNivelMembroFundoAction,
  convidarMembroFundoAction,
  removerMembroFundoAction,
  type ConvidarMembroFundoState,
} from "@/lib/actions/fundo-membros";
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
  nivel: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  createdAt: Date | string;
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

function NivelBadge({ nivel }: { nivel: string }) {
  const admin = nivel === "admin";
  return (
    <span
      className={
        "inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider " +
        (admin
          ? "bg-accent-soft text-accent border border-accent/40"
          : "bg-bg-card text-fg-muted border border-border")
      }
    >
      {admin ? "administrador" : "membro"}
    </span>
  );
}

const NIVEL_DESCRICAO: Record<string, string> = {
  admin:
    "Administrador: mesmos poderes que o dono da conta, incluindo convidar, remover e alterar o nível de outros membros.",
  membro:
    "Membro: vê e opera o painel inteiro do fundo, mas não gerencia a equipe.",
};

export function EquipeFundoManager({
  owner,
  membros,
  canManage,
  currentUserId,
}: {
  owner: Owner | null;
  membros: Membro[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [nivelConvite, setNivelConvite] = useState<"membro" | "admin">("membro");
  const [state, action, pending] = useActionState<
    ConvidarMembroFundoState,
    FormData
  >(convidarMembroFundoAction, null);

  if (state?.ok) {
    setTimeout(() => {
      alertSuccess(
        "Convite enviado. A pessoa recebe um email pra criar o login e entra na lista assim que aceitar.",
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
                placeholder="colega@seufundo.com.br"
                className="form-input"
                required
              />
            </div>
            <div className="col-span-7 md:col-span-3">
              <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-2 font-mono">
                Nível de acesso
              </label>
              <select
                name="nivel"
                value={nivelConvite}
                onChange={(e) =>
                  setNivelConvite(e.target.value === "admin" ? "admin" : "membro")
                }
                className="form-input"
              >
                <option value="membro">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="col-span-5 md:col-span-3">
              <button
                type="submit"
                disabled={pending}
                className="w-full h-10 px-4 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-dark disabled:opacity-60"
              >
                {pending ? "..." : "Convidar"}
              </button>
            </div>
            <p className="col-span-12 text-xs text-fg-dim -mt-1">
              {NIVEL_DESCRICAO[nivelConvite]}
            </p>
            {state && !state.ok && (
              <div className="col-span-12 text-xs text-danger">{state.error}</div>
            )}
          </form>
          <p className="text-xs text-fg-dim mt-3">
            A pessoa aparece na lista depois de aceitar o convite e fazer o
            primeiro login. Dá pra mudar o nível de alguém a qualquer momento
            aqui na lista.
          </p>
        </section>
      )}

      <section>
        <h3 className="font-bold mb-3">Membros ({membros.length})</h3>
        {membros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-10 text-center text-sm text-fg-muted">
            Nenhum membro ainda.
            {canManage && " Use o form acima pra convidar."}
          </div>
        ) : (
          <ul className="space-y-2">
            {membros.map((m) => {
              const isSelf = m.userId === currentUserId;
              const isAdmin = m.nivel === "admin";
              return (
                <li
                  key={m.id}
                  className="grid grid-cols-12 gap-3 items-center px-4 py-3 rounded-xl border border-border bg-bg-elev"
                >
                  <div className="col-span-12 md:col-span-5">
                    <div className="font-semibold text-sm flex items-center gap-2 flex-wrap">
                      {m.nome ?? m.email ?? "—"}
                      {isSelf && (
                        <span className="text-[10px] text-fg-dim font-normal">
                          (você)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-fg-muted">{m.email ?? ""}</div>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <NivelBadge nivel={m.nivel} />
                  </div>
                  <div className="col-span-6 md:col-span-2 text-xs text-fg-muted font-mono">
                    desde {formatDateTime(m.createdAt)}
                  </div>
                  <div className="col-span-12 md:col-span-3 flex justify-end gap-4">
                    {canManage && !isSelf && (
                      <button
                        type="button"
                        onClick={async () => {
                          const novoNivel = isAdmin ? "membro" : "admin";
                          const ok = await confirm({
                            title: isAdmin
                              ? "Rebaixar pra membro?"
                              : "Tornar administrador?",
                            message: isAdmin
                              ? `${m.nome ?? m.email} continua operando o painel, mas deixa de gerenciar a equipe.`
                              : `${m.nome ?? m.email} passa a ter os mesmos poderes que o dono da conta, incluindo convidar e remover membros.`,
                            confirmLabel: isAdmin
                              ? "Rebaixar"
                              : "Tornar admin",
                          });
                          if (!ok) return;
                          try {
                            await alterarNivelMembroFundoAction(m.id, novoNivel);
                            await alertSuccess("Nível atualizado.");
                            router.refresh();
                          } catch (e) {
                            await alertError((e as Error).message);
                          }
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        {isAdmin ? "tornar membro" : "tornar admin"}
                      </button>
                    )}
                    {canManage && !isSelf && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Remover membro?",
                            message: `${m.nome ?? m.email} perde acesso ao painel do fundo. Você pode reconvidar depois.`,
                            confirmLabel: "Remover",
                            variant: "danger",
                          });
                          if (!ok) return;
                          try {
                            await removerMembroFundoAction(m.id);
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
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
