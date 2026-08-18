/**
 * Criação de convite no Clerk resiliente a duplicata.
 *
 * Uma tentativa de cadastro que criou o convite no Clerk mas não terminou no
 * nosso banco (falha no meio, admin fechou a aba) deixa um convite PENDENTE
 * órfão. A próxima tentativa com o mesmo e-mail batia em
 * `duplicate_record: duplicate invitation` → "Bad Request", travando o
 * cadastro. Aqui, ao ver o duplicado, revogamos o(s) pendente(s) daquele
 * e-mail e recriamos um convite fresco — o cadastro deixa de emperrar.
 */
import type { clerkClient } from "@clerk/nextjs/server";

type ClerkApi = Awaited<ReturnType<typeof clerkClient>>;

export type ConviteParams = {
  emailAddress: string;
  publicMetadata?: Record<string, unknown>;
  redirectUrl?: string;
};

function ehConviteDuplicado(e: unknown): boolean {
  const errors = (e as { errors?: Array<{ code?: string }> })?.errors;
  return Array.isArray(errors) && errors.some((x) => x.code === "duplicate_record");
}

/** Revoga todos os convites PENDENTES de um e-mail. Devolve quantos revogou. */
export async function revogarConvitesPendentes(
  clerk: ClerkApi,
  email: string,
): Promise<number> {
  const alvo = email.trim().toLowerCase();
  let revogados = 0;
  const limit = 100;
  for (let pagina = 0; pagina < 20; pagina++) {
    const resp = await clerk.invitations.getInvitationList({
      status: "pending",
      limit,
      offset: pagina * limit,
    });
    const itens = (Array.isArray(resp) ? resp : resp?.data) ?? [];
    for (const inv of itens) {
      if (inv.emailAddress?.trim().toLowerCase() === alvo) {
        await clerk.invitations.revokeInvitation(inv.id).catch(() => {});
        revogados++;
      }
    }
    if (itens.length < limit) break;
  }
  return revogados;
}

/** Cria o convite; se já houver pendente pro e-mail, revoga e recria. */
export async function criarConviteResiliente(
  clerk: ClerkApi,
  params: ConviteParams,
) {
  try {
    return await clerk.invitations.createInvitation(params);
  } catch (e) {
    if (!ehConviteDuplicado(e)) throw e;
    await revogarConvitesPendentes(clerk, params.emailAddress);
    return await clerk.invitations.createInvitation(params);
  }
}
