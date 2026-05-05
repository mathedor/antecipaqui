"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteUserAction,
  deleteConstrutoraAction,
} from "@/lib/actions/admin-delete";
import { useFeedback } from "@/components/feedback-provider";

type Props = {
  target: "user" | "construtora";
  id: string;
  /** Nome pra mostrar no modal de confirmação. */
  nome: string;
};

export function AdminDeleteButton({ target, id, nome }: Props) {
  const [pending, start] = useTransition();
  const { confirm, alertError } = useFeedback();
  const router = useRouter();

  async function handleClick() {
    const tipo = target === "user" ? "este usuário" : "esta construtora";
    const ok = await confirm({
      title: `Excluir ${target === "user" ? "usuário" : "construtora"}`,
      message: `Excluir ${tipo} (${nome}) e TODOS os dados relacionados (operações, parcelas, contratos, documentos, repositório, notificações, tickets) é uma ação irreversível. Continuar?`,
      confirmLabel: "Excluir tudo",
      variant: "danger",
    });
    if (!ok) return;
    const ok2 = await confirm({
      title: "Você tem CERTEZA?",
      message: `Última chance. Não dá pra desfazer. Digite mentalmente "${nome}" e confirme.`,
      confirmLabel: "Sim, deletar",
      cancelLabel: "Cancelar",
      variant: "danger",
    });
    if (!ok2) return;

    start(async () => {
      try {
        const res =
          target === "user"
            ? await deleteUserAction(id)
            : await deleteConstrutoraAction(id);
        if (!res.ok) {
          await alertError(
            res.error,
            target === "user"
              ? "Erro ao deletar usuário"
              : "Erro ao deletar construtora",
          );
          return;
        }
        router.push(
          target === "user" ? "/admin/usuarios" : "/admin/construtoras",
        );
      } catch (e) {
        await alertError(
          (e as Error).message,
          target === "user"
            ? "Erro ao deletar usuário"
            : "Erro ao deletar construtora",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-danger/40 text-danger hover:bg-red-50 font-medium text-sm transition-colors disabled:opacity-60"
    >
      {pending ? "Excluindo..." : "🗑 Excluir tudo"}
    </button>
  );
}
