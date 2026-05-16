"use server";

import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  comerciais,
  comercialConviteLinks,
  imobiliarias,
} from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";

async function getCurrentComercialId(): Promise<string> {
  const user = await requireActiveUser();
  if (user.role !== "comercial") throw new Error("Apenas comercial");
  const [c] = await db
    .select({ id: comerciais.id })
    .from(comerciais)
    .where(eq(comerciais.ownerUserId, user.id))
    .limit(1);
  if (!c) throw new Error("Comercial não vinculado");
  return c.id;
}

function genToken(): string {
  // 8 chars alfanum (sem ambíguos como 0/O/1/l)
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 8; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function listMyConviteLinks() {
  const comercialId = await getCurrentComercialId();
  return db
    .select()
    .from(comercialConviteLinks)
    .where(eq(comercialConviteLinks.comercialId, comercialId))
    .orderBy(desc(comercialConviteLinks.createdAt));
}

export async function createConviteLink(input: { label?: string }) {
  const comercialId = await getCurrentComercialId();

  // Tenta gerar token único — até 5 tentativas
  let token = "";
  for (let i = 0; i < 5; i++) {
    const candidate = genToken();
    const existing = await db
      .select({ id: comercialConviteLinks.id })
      .from(comercialConviteLinks)
      .where(eq(comercialConviteLinks.token, candidate))
      .limit(1);
    if (existing.length === 0) {
      token = candidate;
      break;
    }
  }
  if (!token) throw new Error("Falha ao gerar token único");

  const [row] = await db
    .insert(comercialConviteLinks)
    .values({
      comercialId,
      token,
      label: input.label?.trim() || null,
    })
    .returning();

  revalidatePath("/painel/convidar");
  return row;
}

export async function toggleConviteLink(id: string) {
  const comercialId = await getCurrentComercialId();
  const [cur] = await db
    .select({ isActive: comercialConviteLinks.isActive })
    .from(comercialConviteLinks)
    .where(
      and(
        eq(comercialConviteLinks.id, id),
        eq(comercialConviteLinks.comercialId, comercialId),
      ),
    )
    .limit(1);
  if (!cur) throw new Error("Link não encontrado");
  await db
    .update(comercialConviteLinks)
    .set({ isActive: !cur.isActive })
    .where(eq(comercialConviteLinks.id, id));
  revalidatePath("/painel/convidar");
  return { ok: true };
}

export async function deleteConviteLink(id: string) {
  const comercialId = await getCurrentComercialId();
  await db
    .delete(comercialConviteLinks)
    .where(
      and(
        eq(comercialConviteLinks.id, id),
        eq(comercialConviteLinks.comercialId, comercialId),
      ),
    );
  revalidatePath("/painel/convidar");
  return { ok: true };
}

/* ============================================================
   PÚBLICO — chamado pela rota /c/[token]
   ============================================================ */

/** Incrementa cliques no link e retorna o comercialId se ativo. */
export async function registerClick(token: string): Promise<{
  ok: boolean;
  comercialId?: string;
}> {
  const [link] = await db
    .select({
      id: comercialConviteLinks.id,
      comercialId: comercialConviteLinks.comercialId,
      isActive: comercialConviteLinks.isActive,
    })
    .from(comercialConviteLinks)
    .where(eq(comercialConviteLinks.token, token))
    .limit(1);
  if (!link || !link.isActive) return { ok: false };

  await db
    .update(comercialConviteLinks)
    .set({ cliques: sql`${comercialConviteLinks.cliques} + 1` })
    .where(eq(comercialConviteLinks.id, link.id));

  return { ok: true, comercialId: link.comercialId };
}

/* ============================================================
   ATRIBUIÇÃO — chamado durante onboarding da imobiliária
   Lê o cookie de ref, vincula imob ao comercial e conta conversão.
   ============================================================ */

/**
 * Se houver token de referência válido, vincula a imobiliária ao
 * comercial correspondente e incrementa conversão. Idempotente — se a
 * imob já tem comercial, não faz nada.
 */
export async function applyRefToImobiliaria(input: {
  imobiliariaId: string;
  token: string;
}) {
  if (!input.token) return { ok: false };
  const [link] = await db
    .select({
      id: comercialConviteLinks.id,
      comercialId: comercialConviteLinks.comercialId,
      isActive: comercialConviteLinks.isActive,
    })
    .from(comercialConviteLinks)
    .where(eq(comercialConviteLinks.token, input.token))
    .limit(1);
  if (!link || !link.isActive) return { ok: false };

  const [imob] = await db
    .select({ comercialId: imobiliarias.comercialId })
    .from(imobiliarias)
    .where(eq(imobiliarias.id, input.imobiliariaId))
    .limit(1);
  if (!imob) return { ok: false };
  if (imob.comercialId) return { ok: false }; // já tem comercial, não sobrescreve

  await db
    .update(imobiliarias)
    .set({ comercialId: link.comercialId, updatedAt: new Date() })
    .where(eq(imobiliarias.id, input.imobiliariaId));

  await db
    .update(comercialConviteLinks)
    .set({ conversoes: sql`${comercialConviteLinks.conversoes} + 1` })
    .where(eq(comercialConviteLinks.id, link.id));

  return { ok: true, comercialId: link.comercialId };
}
