"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comerciais, comercialLeads } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import type { LeadStatus } from "@/lib/comercial-leads-types";

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

export async function listMyLeads() {
  const comercialId = await getCurrentComercialId();
  return db
    .select()
    .from(comercialLeads)
    .where(eq(comercialLeads.comercialId, comercialId))
    .orderBy(desc(comercialLeads.updatedAt));
}

export async function createLead(input: {
  nome: string;
  empresa?: string;
  cnpjCpf?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
  origem?: string;
  valorEstimado?: number;
  notas?: string;
  status?: LeadStatus;
}) {
  const comercialId = await getCurrentComercialId();
  if (!input.nome.trim()) throw new Error("Nome do contato obrigatório");

  await db.insert(comercialLeads).values({
    comercialId,
    nome: input.nome.trim(),
    empresa: input.empresa?.trim() || null,
    cnpjCpf: input.cnpjCpf?.trim() || null,
    email: input.email?.trim() || null,
    telefone: input.telefone?.trim() || null,
    cidade: input.cidade?.trim() || null,
    uf: input.uf?.trim() || null,
    origem: input.origem?.trim() || null,
    notas: input.notas?.trim() || null,
    valorEstimado:
      input.valorEstimado && input.valorEstimado > 0
        ? String(input.valorEstimado.toFixed(2))
        : null,
    status: input.status ?? "prospect",
  });

  revalidatePath("/painel/prospeccao");
  revalidatePath("/painel");
  return { ok: true };
}

export async function updateLeadStatus(input: {
  id: string;
  status: LeadStatus;
  motivoPerda?: string;
}) {
  const comercialId = await getCurrentComercialId();
  const isClosing = input.status === "fechado" || input.status === "perdido";
  await db
    .update(comercialLeads)
    .set({
      status: input.status,
      motivoPerda:
        input.status === "perdido" ? input.motivoPerda?.trim() || null : null,
      closedAt: isClosing ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(comercialLeads.id, input.id),
        eq(comercialLeads.comercialId, comercialId),
      ),
    );
  revalidatePath("/painel/prospeccao");
  revalidatePath("/painel");
  return { ok: true };
}

export async function updateLead(input: {
  id: string;
  nome?: string;
  empresa?: string;
  cnpjCpf?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
  origem?: string;
  valorEstimado?: number | null;
  notas?: string;
}) {
  const comercialId = await getCurrentComercialId();
  const updates: Partial<typeof comercialLeads.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.nome != null) updates.nome = input.nome.trim();
  if (input.empresa != null) updates.empresa = input.empresa.trim() || null;
  if (input.cnpjCpf != null) updates.cnpjCpf = input.cnpjCpf.trim() || null;
  if (input.email != null) updates.email = input.email.trim() || null;
  if (input.telefone != null) updates.telefone = input.telefone.trim() || null;
  if (input.cidade != null) updates.cidade = input.cidade.trim() || null;
  if (input.uf != null) updates.uf = input.uf.trim() || null;
  if (input.origem != null) updates.origem = input.origem.trim() || null;
  if (input.notas != null) updates.notas = input.notas.trim() || null;
  if (input.valorEstimado !== undefined) {
    updates.valorEstimado =
      input.valorEstimado && input.valorEstimado > 0
        ? String(input.valorEstimado.toFixed(2))
        : null;
  }

  await db
    .update(comercialLeads)
    .set(updates)
    .where(
      and(
        eq(comercialLeads.id, input.id),
        eq(comercialLeads.comercialId, comercialId),
      ),
    );

  revalidatePath("/painel/prospeccao");
  return { ok: true };
}

export async function deleteLead(id: string) {
  const comercialId = await getCurrentComercialId();
  await db
    .delete(comercialLeads)
    .where(
      and(
        eq(comercialLeads.id, id),
        eq(comercialLeads.comercialId, comercialId),
      ),
    );
  revalidatePath("/painel/prospeccao");
  return { ok: true };
}
