"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { fundos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

/**
 * Gera convite Clerk pro fundo.
 * - Cria invitation com publicMetadata { role: 'fundo', fundoId }
 * - Quando o fundo aceita o convite e faz primeiro login, getCurrentDbUser
 *   detecta a metadata e cria o user com role=fundo + vincula ao fundo.
 *
 * Nada é gravado em users até o aceite — evita placeholder com ID inválido.
 */
export async function gerarConviteFundoAction(
  fundoId: string,
  email: string,
) {
  await requireAdmin();

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  if (!fundo) throw new Error("Fundo não encontrado");
  if (fundo.ownerUserId) {
    throw new Error("Fundo já tem login criado.");
  }

  // Cria invitation no Clerk com metadata pro flow de criação do user
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://www.antecipaqui.digital";
  try {
    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { fundoId, role: "fundo" },
      redirectUrl: `${siteUrl}/painel`,
    });
  } catch (e) {
    throw new Error(
      "Erro ao criar convite no Clerk: " + (e as Error).message,
    );
  }

  // Marca o email do convite no fundo pra UX (campo simbólico no painel admin).
  // ownerUserId fica null até o fundo aceitar e logar pela primeira vez.
  audit({
    action: "fundo_invite_sent",
    targetType: "fundo",
    targetId: fundoId,
    targetLabel: fundo.razaoSocial,
    metadata: { email },
  }).catch(() => undefined);

  revalidatePath(`/admin/fundos/${fundoId}`);
  return { ok: true };
}
