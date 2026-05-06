import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { NovoChatForm } from "@/components/novo-chat-form";
import { listOperacoesParaChat } from "@/lib/actions/chat";
import {
  getCategoriasForRole,
  categoriaPrecisaOperacao,
  chatCategoriaLabel,
  type ChatCategoria,
} from "@/lib/chat-helpers";

export const metadata = {
  title: "Novo chat",
};

const HELPERS: Record<ChatCategoria, string> = {
  suporte:
    "Tira dúvidas, reporta bugs, pede ajuda — fala direto com o time da Antecipaqui.",
  operacoes:
    "Trata de uma operação específica: prazos, parcelas, valores, status. Conversa com o fundo da operação.",
  negociacoes:
    "Negociação de taxa, custos, contraproposta. Conversa com o fundo da operação.",
  confirmacao:
    "Confirmação de uma operação que envolve sua construtora — fundo confirma com você.",
  documentos:
    "Pedido de documentação ou esclarecimento sobre o cedente — fundo conversa com a imobiliária / corretor.",
};

export default async function NovoChatPage() {
  const user = await requireActiveUser();
  if (user.role === "admin") redirect("/admin/tickets");

  const cats = getCategoriasForRole(user.role).map((c) => ({
    value: c,
    label: chatCategoriaLabel(c),
    helper: HELPERS[c],
    precisaOperacao: categoriaPrecisaOperacao(c),
  }));
  if (cats.length === 0) redirect("/painel");

  const ops = await listOperacoesParaChat();

  const role = (
    user.role === "fundo"
      ? "fundo"
      : user.role === "construtora"
        ? "construtora"
        : user.role === "imobiliaria"
          ? "imobiliaria"
          : user.role === "comercial"
            ? "comercial"
            : "corretor"
  ) as
    | "construtora"
    | "corretor"
    | "imobiliaria"
    | "fundo"
    | "comercial";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/suporte">
      <Link
        href="/painel/suporte"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← chats
      </Link>
      <h1 className="text-display-md mb-2">
        Novo <span className="text-gradient-blue">chat</span>
      </h1>
      <p className="text-fg-muted mb-8">
        Escolha o setor, vincule a operação se for o caso, e mande sua
        mensagem. A pessoa certa do outro lado entra automaticamente.
      </p>

      <NovoChatForm
        categorias={cats}
        operacoes={ops.map((o) => ({
          id: o.id,
          numero: o.numero,
          construtoraNome: o.construtoraNome,
          fundoId: o.fundoId,
        }))}
      />
    </PainelShell>
  );
}