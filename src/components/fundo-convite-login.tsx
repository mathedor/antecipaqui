"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { gerarConviteFundoAction } from "@/lib/actions/fundo-invite";
import { useFeedback } from "@/components/feedback-provider";

type Props = {
  fundoId: string;
  fundoNome: string;
  emailComercial: string | null;
};

export function FundoConviteLogin({
  fundoId,
  fundoNome,
  emailComercial,
}: Props) {
  const router = useRouter();
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState(emailComercial ?? "");

  async function handleClick() {
    if (!email || !email.includes("@")) {
      await alertError("Informe um email válido pra criar o login.", "Email inválido");
      return;
    }
    const ok = await confirm({
      title: "Gerar convite de login",
      message: `Será criada uma conta no Clerk pro email "${email}" vinculada ao fundo "${fundoNome}". Um email com link de definição de senha será enviado pelo Clerk. Continuar?`,
      confirmLabel: "Gerar convite",
    });
    if (!ok) return;

    start(async () => {
      try {
        await gerarConviteFundoAction(fundoId, email);
        await alertSuccess(
          `Convite enviado pra ${email}. O fundo deve seguir o link no email pra definir a senha e acessar o painel.`,
          "Convite criado",
        );
        router.refresh();
      } catch (e) {
        await alertError((e as Error).message, "Erro ao gerar convite");
      }
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-fg-muted">
        Fundo ainda não tem login criado. Gere um convite pra que ele possa
        acessar o painel próprio.
      </p>
      <div>
        <label className="block text-[11px] uppercase tracking-[0.18em] text-fg-dim mb-1.5 font-mono">
          Email pro login
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="financeiro@fundo.com.br"
          className="form-input !h-10"
        />
      </div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="btn-primary !h-10 !px-5 !w-full justify-center"
      >
        {pending ? "Gerando..." : "✉ Gerar convite de login"}
      </button>
      <p className="text-[10px] text-fg-dim leading-relaxed">
        O Clerk envia um email com link mágico. O fundo define a própria senha
        e a partir daí acessa o painel pra ver suas operações, construtoras e
        imobiliárias parceiras.
      </p>
    </div>
  );
}
