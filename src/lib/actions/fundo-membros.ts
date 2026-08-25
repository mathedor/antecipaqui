"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { criarConviteResiliente } from "@/lib/clerk-convite";
import { db } from "@/db";
import { fundoMembros, users } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getFundoDoUsuario } from "@/lib/fundo-acesso";
import { audit } from "@/lib/audit";

export type NivelMembroFundo = "admin" | "membro";

/**
 * Equipe do fundo — quem gerencia (dono OU membro nível admin) convida
 * colegas escolhendo o nível de acesso: `admin` tem os mesmos poderes do
 * dono (inclusive gerenciar a equipe); `membro` opera o painel sem gestão
 * de equipe. O convite vai pelo Clerk com metadata { role: 'fundo',
 * fundoId, fundoMembro: true, fundoMembroNivel }; no primeiro login o
 * auth-user cria o vínculo — por isso a pessoa só aparece na lista depois
 * de aceitar.
 */
async function requireUsuarioDoFundo() {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  if (user.role !== "fundo") throw new Error("Apenas usuários de fundo");

  const fundo = await getFundoDoUsuario(user.id);
  if (!fundo) throw new Error("Fundo não vinculado");

  const isDono = fundo.ownerUserId === user.id;
  let canManage = isDono;
  if (!canManage) {
    const [meu] = await db
      .select({ nivel: fundoMembros.nivel })
      .from(fundoMembros)
      .where(
        and(eq(fundoMembros.fundoId, fundo.id), eq(fundoMembros.userId, user.id)),
      )
      .limit(1);
    canManage = meu?.nivel === "admin";
  }

  return { user, fundo, isDono, canManage };
}

function parseNivel(raw: unknown): NivelMembroFundo {
  return raw === "admin" ? "admin" : "membro";
}

export async function listMembrosDoFundo() {
  const { fundo, canManage } = await requireUsuarioDoFundo();

  const [owner] = fundo.ownerUserId
    ? await db
        .select({
          id: users.id,
          nome: users.nome,
          email: users.email,
          telefone: users.telefone,
        })
        .from(users)
        .where(eq(users.id, fundo.ownerUserId))
        .limit(1)
    : [];

  const membros = await db
    .select({
      id: fundoMembros.id,
      userId: fundoMembros.userId,
      nivel: fundoMembros.nivel,
      createdAt: fundoMembros.createdAt,
      nome: users.nome,
      email: users.email,
      telefone: users.telefone,
    })
    .from(fundoMembros)
    .leftJoin(users, eq(users.id, fundoMembros.userId))
    .where(eq(fundoMembros.fundoId, fundo.id))
    .orderBy(desc(fundoMembros.createdAt));

  return {
    fundoNome: fundo.razaoSocial,
    owner: owner ?? null,
    membros,
    canManage,
  };
}

export type ConvidarMembroFundoState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function convidarMembroFundoAction(
  _prev: ConvidarMembroFundoState,
  formData: FormData,
): Promise<ConvidarMembroFundoState> {
  const { user, fundo, canManage } = await requireUsuarioDoFundo();
  if (!canManage)
    return {
      ok: false,
      error: "Só administradores da conta podem convidar membros.",
    };

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) return { ok: false, error: "Email obrigatório" };

  const nivel = parseNivel(formData.get("nivel"));

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
    "https://www.antecipaqui.digital";

  try {
    const clerk = await clerkClient();
    await criarConviteResiliente(clerk, {
      emailAddress: email,
      publicMetadata: {
        role: "fundo",
        fundoId: fundo.id,
        fundoMembro: true,
        fundoMembroNivel: nivel,
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
    action: "fundo_membro_invite_sent",
    targetType: "fundo",
    targetId: fundo.id,
    targetLabel: fundo.razaoSocial,
    metadata: { email, nivel, convidadoPor: user.id },
  }).catch(() => undefined);

  revalidatePath("/painel/equipe");
  return { ok: true };
}

export async function alterarNivelMembroFundoAction(
  membroId: string,
  nivelRaw: string,
) {
  const { user, fundo, canManage } = await requireUsuarioDoFundo();
  if (!canManage)
    throw new Error("Só administradores da conta podem alterar níveis.");

  const nivel = parseNivel(nivelRaw);

  const [m] = await db
    .select()
    .from(fundoMembros)
    .where(eq(fundoMembros.id, membroId))
    .limit(1);
  if (!m) throw new Error("Membro não encontrado");
  if (m.fundoId !== fundo.id)
    throw new Error("Membro não pertence ao seu fundo");

  await db
    .update(fundoMembros)
    .set({ nivel })
    .where(eq(fundoMembros.id, membroId));

  audit({
    action: "fundo_membro_nivel_changed",
    targetType: "fundo",
    targetId: fundo.id,
    targetLabel: fundo.razaoSocial,
    metadata: {
      membroUserId: m.userId,
      de: m.nivel,
      para: nivel,
      alteradoPor: user.id,
    },
  }).catch(() => undefined);

  revalidatePath("/painel/equipe");
}

export async function removerMembroFundoAction(membroId: string) {
  const { user, fundo, canManage } = await requireUsuarioDoFundo();
  if (!canManage)
    throw new Error("Só administradores da conta podem remover membros.");

  const [m] = await db
    .select()
    .from(fundoMembros)
    .where(eq(fundoMembros.id, membroId))
    .limit(1);
  if (!m) throw new Error("Membro não encontrado");
  if (m.fundoId !== fundo.id)
    throw new Error("Membro não pertence ao seu fundo");

  await db.delete(fundoMembros).where(eq(fundoMembros.id, membroId));

  audit({
    action: "fundo_membro_removed",
    targetType: "fundo",
    targetId: fundo.id,
    targetLabel: fundo.razaoSocial,
    metadata: { membroUserId: m.userId, removidoPor: user.id },
  }).catch(() => undefined);

  revalidatePath("/painel/equipe");
}
