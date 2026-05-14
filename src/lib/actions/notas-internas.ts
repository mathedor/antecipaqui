"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { operacaoNotasInternas, users } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";

async function requireAdminOuComercial() {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  if (user.role !== "admin" && user.role !== "comercial")
    throw new Error("Apenas admin ou comercial");
  return user;
}

export async function listNotasOperacao(operacaoId: string) {
  await requireAdminOuComercial();
  return db
    .select({
      id: operacaoNotasInternas.id,
      body: operacaoNotasInternas.body,
      flag: operacaoNotasInternas.flag,
      autorRole: operacaoNotasInternas.autorRole,
      createdAt: operacaoNotasInternas.createdAt,
      updatedAt: operacaoNotasInternas.updatedAt,
      autorNome: users.nome,
      autorEmail: users.email,
      autorId: operacaoNotasInternas.userId,
    })
    .from(operacaoNotasInternas)
    .leftJoin(users, eq(users.id, operacaoNotasInternas.userId))
    .where(eq(operacaoNotasInternas.operacaoId, operacaoId))
    .orderBy(desc(operacaoNotasInternas.createdAt));
}

export type AddNotaState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

export async function addNotaInternaAction(
  _prev: AddNotaState,
  formData: FormData,
): Promise<AddNotaState> {
  const user = await requireAdminOuComercial();
  const operacaoId = String(formData.get("operacaoId") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const flag = String(formData.get("flag") || "").trim() || null;

  if (!operacaoId) return { ok: false, error: "operacaoId obrigatório" };
  if (!body) return { ok: false, error: "Escreva uma nota" };
  if (flag && !["alerta", "recusa", "observacao"].includes(flag))
    return { ok: false, error: "Flag inválida" };

  const [created] = await db
    .insert(operacaoNotasInternas)
    .values({
      operacaoId,
      userId: user.id,
      autorRole: user.role,
      body: body.slice(0, 5000),
      flag,
    })
    .returning();

  revalidatePath(`/admin/operacoes/${operacaoId}`);
  revalidatePath(`/painel/operacoes/${operacaoId}`);
  return { ok: true, id: created.id };
}

export async function deleteNotaInternaAction(id: string, operacaoId: string) {
  const user = await requireAdminOuComercial();
  // Só admin ou o próprio autor pode deletar
  const [nota] = await db
    .select()
    .from(operacaoNotasInternas)
    .where(eq(operacaoNotasInternas.id, id))
    .limit(1);
  if (!nota) throw new Error("Nota não encontrada");
  if (user.role !== "admin" && nota.userId !== user.id)
    throw new Error("Sem permissão pra remover");

  await db
    .delete(operacaoNotasInternas)
    .where(eq(operacaoNotasInternas.id, id));

  revalidatePath(`/admin/operacoes/${operacaoId}`);
  revalidatePath(`/painel/operacoes/${operacaoId}`);
}
