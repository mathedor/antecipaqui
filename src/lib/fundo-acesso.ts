/**
 * Resolvedor CANÔNICO do fundo de um usuário.
 *
 * Um fundo tem um dono (fundos.ownerUserId) e pode ter membros no MESMO nível
 * (tabela fundo_membros). Todo acesso ao painel do fundo resolve o fundo por
 * aqui, pra que dono e membros enxerguem exatamente o mesmo fundo.
 *
 * Helper puro (sem "use server") de propósito: é importado por várias server
 * actions e evita import circular entre elas.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos, fundoMembros, type Fundo } from "@/db/schema";

export async function getFundoDoUsuario(userId: string): Promise<Fundo | null> {
  const [dono] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.ownerUserId, userId))
    .limit(1);
  if (dono) return dono;

  const [membro] = await db
    .select({ f: fundos })
    .from(fundoMembros)
    .innerJoin(fundos, eq(fundos.id, fundoMembros.fundoId))
    .where(eq(fundoMembros.userId, userId))
    .limit(1);
  return membro?.f ?? null;
}

/** Só o id — atalho pros lugares que só precisam escopar por fundoId. */
export async function getFundoIdDoUsuario(userId: string): Promise<string | null> {
  return (await getFundoDoUsuario(userId))?.id ?? null;
}
