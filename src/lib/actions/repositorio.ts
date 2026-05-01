"use server";

import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { repositorioFiles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

export async function listRepositorioFiles(args: {
  userId?: string | null;
  construtoraId?: string | null;
}) {
  if (args.userId) {
    return db
      .select()
      .from(repositorioFiles)
      .where(eq(repositorioFiles.targetUserId, args.userId))
      .orderBy(desc(repositorioFiles.createdAt));
  }
  if (args.construtoraId) {
    return db
      .select()
      .from(repositorioFiles)
      .where(eq(repositorioFiles.targetConstrutoraId, args.construtoraId))
      .orderBy(desc(repositorioFiles.createdAt));
  }
  return [];
}

export async function uploadRepositorioFileAction(args: {
  targetUserId?: string | null;
  targetConstrutoraId?: string | null;
  url: string;
  nomeOriginal: string;
  descricao?: string | null;
  sizeBytes?: number;
  mimeType?: string;
}) {
  const admin = await requireAdmin();

  if (!args.targetUserId && !args.targetConstrutoraId) {
    throw new Error("targetUserId ou targetConstrutoraId obrigatório");
  }
  if (!args.url || !args.nomeOriginal) {
    throw new Error("Arquivo inválido");
  }

  const [created] = await db
    .insert(repositorioFiles)
    .values({
      targetUserId: args.targetUserId ?? null,
      targetConstrutoraId: args.targetConstrutoraId ?? null,
      uploadedByUserId: admin.id,
      nomeOriginal: args.nomeOriginal,
      descricao: args.descricao ?? null,
      url: args.url,
      sizeBytes: args.sizeBytes ?? null,
      mimeType: args.mimeType ?? null,
    })
    .returning({ id: repositorioFiles.id });

  audit({
    action: "upload_repositorio_file",
    targetType: args.targetUserId ? "user" : "construtora",
    targetId: args.targetUserId ?? args.targetConstrutoraId ?? "",
    targetLabel: args.nomeOriginal,
    metadata: { fileId: created.id },
  }).catch(() => undefined);

  if (args.targetUserId) {
    revalidatePath(`/admin/usuarios/${args.targetUserId}`);
    revalidatePath(`/admin/usuarios/${args.targetUserId}/editar`);
  }
  if (args.targetConstrutoraId) {
    revalidatePath(`/admin/construtoras/${args.targetConstrutoraId}`);
    revalidatePath(`/admin/construtoras/${args.targetConstrutoraId}/editar`);
  }

  return { ok: true as const, id: created.id };
}

export async function deleteRepositorioFileAction(fileId: string) {
  await requireAdmin();

  const [file] = await db
    .select()
    .from(repositorioFiles)
    .where(eq(repositorioFiles.id, fileId))
    .limit(1);
  if (!file) throw new Error("Arquivo não encontrado");

  await db.delete(repositorioFiles).where(eq(repositorioFiles.id, fileId));

  audit({
    action: "delete_repositorio_file",
    targetType: file.targetUserId ? "user" : "construtora",
    targetId: file.targetUserId ?? file.targetConstrutoraId ?? "",
    targetLabel: file.nomeOriginal,
  }).catch(() => undefined);

  if (file.targetUserId) {
    revalidatePath(`/admin/usuarios/${file.targetUserId}`);
    revalidatePath(`/admin/usuarios/${file.targetUserId}/editar`);
  }
  if (file.targetConstrutoraId) {
    revalidatePath(`/admin/construtoras/${file.targetConstrutoraId}`);
    revalidatePath(`/admin/construtoras/${file.targetConstrutoraId}/editar`);
  }
}
