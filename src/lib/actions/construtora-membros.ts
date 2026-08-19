"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { criarConviteResiliente } from "@/lib/clerk-convite";
import { db } from "@/db";
import { construtoraMembros, construtoras, users } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

const ROLES_INTERNAS = [
  "financeiro",
  "comercial",
  "juridico",
  "outro",
] as const;

async function requireOwnerOuMembro() {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  if (user.role !== "construtora")
    throw new Error("Apenas construtora");

  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) throw new Error("Construtora não vinculada");

  return { user, construtora: c };
}

export async function listMembrosConstrutora() {
  const { construtora } = await requireOwnerOuMembro();

  // Owner (sempre como item)
  const [owner] = construtora.ownerUserId
    ? await db
        .select({
          id: users.id,
          nome: users.nome,
          email: users.email,
          telefone: users.telefone,
        })
        .from(users)
        .where(eq(users.id, construtora.ownerUserId))
        .limit(1)
    : [];

  const membros = await db
    .select({
      id: construtoraMembros.id,
      userId: construtoraMembros.userId,
      roleInterna: construtoraMembros.roleInterna,
      addedAt: construtoraMembros.addedAt,
      aceitoEm: construtoraMembros.aceitoEm,
      nome: users.nome,
      email: users.email,
      telefone: users.telefone,
    })
    .from(construtoraMembros)
    .leftJoin(users, eq(users.id, construtoraMembros.userId))
    .where(eq(construtoraMembros.construtoraId, construtora.id))
    .orderBy(desc(construtoraMembros.addedAt));

  return {
    owner: owner
      ? {
          ...owner,
          roleInterna: "owner",
          aceitoEm: new Date(),
        }
      : null,
    membros,
  };
}

export type ConvidarMembroState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function convidarMembroAction(
  _prev: ConvidarMembroState,
  formData: FormData,
): Promise<ConvidarMembroState> {
  const { user, construtora } = await requireOwnerOuMembro();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const roleInterna = String(formData.get("roleInterna") || "outro").trim();

  if (!email) return { ok: false, error: "Email obrigatório" };
  if (!ROLES_INTERNAS.includes(roleInterna as never))
    return { ok: false, error: "Role interna inválida" };

  // Cria invitation no Clerk
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://www.antecipaqui.digital";

  try {
    const clerk = await clerkClient();
    await criarConviteResiliente(clerk, {
      emailAddress: email,
      publicMetadata: {
        role: "construtora",
        construtoraId: construtora.id,
        construtoraMembroRole: roleInterna,
        convidadoPor: user.id,
      },
      // Rota pública: o <SignUp> consome o __clerk_ticket do convite.
      redirectUrl: `${siteUrl}/cadastre-se`,
    });
  } catch (e) {
    return {
      ok: false,
      error: "Erro ao criar convite Clerk: " + (e as Error).message,
    };
  }

  audit({
    action: "construtora_membro_invite_sent",
    targetType: "construtora",
    targetId: construtora.id,
    targetLabel: construtora.razaoSocial,
    metadata: { email, roleInterna },
  }).catch(() => undefined);

  revalidatePath("/painel/equipe");
  return { ok: true };
}

export async function removerMembroAction(membroId: string) {
  const { user, construtora } = await requireOwnerOuMembro();

  const [m] = await db
    .select()
    .from(construtoraMembros)
    .where(eq(construtoraMembros.id, membroId))
    .limit(1);
  if (!m) throw new Error("Membro não encontrado");
  if (m.construtoraId !== construtora.id)
    throw new Error("Membro não pertence à sua construtora");

  await db
    .delete(construtoraMembros)
    .where(eq(construtoraMembros.id, membroId));

  audit({
    action: "construtora_membro_removed",
    targetType: "construtora",
    targetId: construtora.id,
    targetLabel: construtora.razaoSocial,
    metadata: { membroUserId: m.userId, removidoPor: user.id },
  }).catch(() => undefined);

  revalidatePath("/painel/equipe");
}

export async function alterarRoleInternaAction(
  membroId: string,
  roleInterna: string,
) {
  const { construtora } = await requireOwnerOuMembro();
  if (!ROLES_INTERNAS.includes(roleInterna as never))
    throw new Error("Role inválida");
  const [m] = await db
    .select()
    .from(construtoraMembros)
    .where(eq(construtoraMembros.id, membroId))
    .limit(1);
  if (!m || m.construtoraId !== construtora.id)
    throw new Error("Membro não pertence à sua construtora");
  await db
    .update(construtoraMembros)
    .set({ roleInterna })
    .where(eq(construtoraMembros.id, membroId));
  revalidatePath("/painel/equipe");
}
