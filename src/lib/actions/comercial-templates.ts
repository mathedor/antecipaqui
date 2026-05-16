"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comerciais, comercialTemplates } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import type { TemplateTipo } from "@/lib/comercial-templates-types";

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

export async function listMyTemplates() {
  const comercialId = await getCurrentComercialId();
  return db
    .select()
    .from(comercialTemplates)
    .where(eq(comercialTemplates.comercialId, comercialId))
    .orderBy(asc(comercialTemplates.tipo), asc(comercialTemplates.nome));
}

export async function createTemplate(input: {
  nome: string;
  tipo: TemplateTipo;
  conteudo: string;
  isDefault?: boolean;
}) {
  const comercialId = await getCurrentComercialId();
  if (!input.nome.trim()) throw new Error("Nome obrigatório");
  if (!input.conteudo.trim()) throw new Error("Conteúdo obrigatório");

  // Se vai marcar como default, desmarca os outros do mesmo tipo
  if (input.isDefault && input.tipo !== "livre") {
    await db
      .update(comercialTemplates)
      .set({ isDefault: false })
      .where(
        and(
          eq(comercialTemplates.comercialId, comercialId),
          eq(comercialTemplates.tipo, input.tipo),
        ),
      );
  }

  await db.insert(comercialTemplates).values({
    comercialId,
    nome: input.nome.trim(),
    tipo: input.tipo,
    conteudo: input.conteudo.trim(),
    isDefault: input.tipo !== "livre" && (input.isDefault ?? false),
  });

  revalidatePath("/painel/templates");
  revalidatePath("/painel");
  return { ok: true };
}

export async function updateTemplate(input: {
  id: string;
  nome: string;
  tipo: TemplateTipo;
  conteudo: string;
  isDefault?: boolean;
}) {
  const comercialId = await getCurrentComercialId();

  if (input.isDefault && input.tipo !== "livre") {
    await db
      .update(comercialTemplates)
      .set({ isDefault: false })
      .where(
        and(
          eq(comercialTemplates.comercialId, comercialId),
          eq(comercialTemplates.tipo, input.tipo),
        ),
      );
  }

  await db
    .update(comercialTemplates)
    .set({
      nome: input.nome.trim(),
      tipo: input.tipo,
      conteudo: input.conteudo.trim(),
      isDefault: input.tipo !== "livre" && (input.isDefault ?? false),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(comercialTemplates.id, input.id),
        eq(comercialTemplates.comercialId, comercialId),
      ),
    );

  revalidatePath("/painel/templates");
  revalidatePath("/painel");
  return { ok: true };
}

export async function deleteTemplate(id: string) {
  const comercialId = await getCurrentComercialId();
  await db
    .delete(comercialTemplates)
    .where(
      and(
        eq(comercialTemplates.id, id),
        eq(comercialTemplates.comercialId, comercialId),
      ),
    );
  revalidatePath("/painel/templates");
  revalidatePath("/painel");
  return { ok: true };
}

export async function incrementarUso(id: string) {
  const comercialId = await getCurrentComercialId();
  await db
    .update(comercialTemplates)
    .set({ usadoCount: sql`${comercialTemplates.usadoCount} + 1` })
    .where(
      and(
        eq(comercialTemplates.id, id),
        eq(comercialTemplates.comercialId, comercialId),
      ),
    );
  return { ok: true };
}

/** Helper interno (sem requireActiveUser) — usado pelo FocoDoDia pra
 *  buscar todos os defaults de um comercial de uma vez. */
export async function getDefaultsByComercial(comercialId: string) {
  const rows = await db
    .select({
      tipo: comercialTemplates.tipo,
      conteudo: comercialTemplates.conteudo,
    })
    .from(comercialTemplates)
    .where(
      and(
        eq(comercialTemplates.comercialId, comercialId),
        eq(comercialTemplates.isDefault, true),
      ),
    );
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.tipo, r.conteudo);
  return map;
}

