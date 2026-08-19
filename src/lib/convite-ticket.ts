/**
 * Diagnóstico server-side do __clerk_ticket de convite.
 *
 * O <SignUp> do Clerk renderiza EM BRANCO quando o ticket é inválido
 * (revogado, expirado, já usado) — a pessoa fica numa tela vazia sem saber o
 * que houve. Aqui decodificamos o ticket (só o payload, sem verificar
 * assinatura — a decisão final é sempre da API do Clerk), descobrimos o
 * convite e devolvemos um veredito pra página agir: seguir, redirecionar pro
 * convite pendente mais novo do mesmo e-mail, ou explicar o que aconteceu.
 */
import { clerkClient } from "@clerk/nextjs/server";

type Invitation = {
  id: string;
  emailAddress: string;
  status: string;
  url?: string | null;
  createdAt: number;
};

export type VereditoTicket =
  | { acao: "seguir" }
  | { acao: "redirecionar"; url: string }
  | { acao: "ja_aceito" }
  | { acao: "morto" };

/** Extrai o id do convite (sid) do payload do ticket, sem verificar. */
export function invitationIdDoTicket(ticket: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(ticket.split(".")[1], "base64url").toString("utf8"),
    ) as { sid?: string; st?: string };
    return payload.st === "invitation" && payload.sid ? payload.sid : null;
  } catch {
    return null;
  }
}

async function listarConvites(status: string): Promise<Invitation[]> {
  const clerk = await clerkClient();
  const out: Invitation[] = [];
  const limit = 100;
  for (let pagina = 0; pagina < 10; pagina++) {
    const resp = await clerk.invitations.getInvitationList({
      status: status as never,
      limit,
      offset: pagina * limit,
    });
    const itens = ((Array.isArray(resp) ? resp : resp?.data) ?? []) as Invitation[];
    out.push(...itens);
    if (itens.length < limit) break;
  }
  return out;
}

export async function avaliarTicketDeConvite(
  ticket: string,
): Promise<VereditoTicket> {
  const sid = invitationIdDoTicket(ticket);
  if (!sid) return { acao: "seguir" }; // ticket de outro tipo: deixa o Clerk decidir

  try {
    const pendentes = await listarConvites("pending");
    if (pendentes.some((i) => i.id === sid)) return { acao: "seguir" };

    // Não está pendente: descobre o que houve e se há substituto.
    const [revogados, aceitos] = await Promise.all([
      listarConvites("revoked"),
      listarConvites("accepted"),
    ]);
    const original =
      revogados.find((i) => i.id === sid) ?? aceitos.find((i) => i.id === sid);

    if (original) {
      if (original.status === "accepted") return { acao: "ja_aceito" };
      // Revogado (convite recriado depois): se existe um pendente mais novo
      // pro MESMO e-mail, mandamos a pessoa direto pra ele — o link antigo
      // do e-mail volta a funcionar sem reenviar nada.
      const email = original.emailAddress?.trim().toLowerCase();
      const substituto = pendentes
        .filter((i) => i.emailAddress?.trim().toLowerCase() === email && i.url)
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      if (substituto?.url) return { acao: "redirecionar", url: substituto.url };
      return { acao: "morto" };
    }

    // Não achamos o convite (expirado saiu da janela, id de outra instância…):
    return { acao: "morto" };
  } catch {
    return { acao: "seguir" }; // fail-open: API fora → deixa o Clerk tentar
  }
}
