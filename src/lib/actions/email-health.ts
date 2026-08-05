"use server";

/**
 * Saúde da entrega de e-mail — camada de ação (auth + escrita).
 * A checagem em si mora em `@/lib/email-saude`, compartilhada com o cron.
 */

import { desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { emailFalhas } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import {
  acharDominioNoResend,
  checarSaudeEmail,
  dominioDoRemetente,
  lerUltimoCheck,
  pedirVerificacaoDominio,
  remetentePadrao,
  type SaudeEmail,
  type UltimoCheck,
} from "@/lib/email-saude";

export type EmailHealth = SaudeEmail & {
  ultimoCheck: UltimoCheck | null;
  ultimasFalhas: Array<{
    id: string;
    destinatario: string;
    assunto: string;
    erro: string;
    contexto: string | null;
    createdAt: string;
  }>;
};

export async function getEmailHealth(): Promise<EmailHealth> {
  await requireAdmin();

  const [saude, ultimoCheck, ultimas] = await Promise.all([
    checarSaudeEmail(),
    lerUltimoCheck(),
    db
      .select()
      .from(emailFalhas)
      .where(isNull(emailFalhas.resolvidoEm))
      .orderBy(desc(emailFalhas.createdAt))
      .limit(30),
  ]);

  return {
    ...saude,
    ultimoCheck,
    ultimasFalhas: ultimas.map((f) => ({
      id: f.id,
      destinatario: f.destinatario,
      assunto: f.assunto,
      erro: f.erro,
      contexto: f.contexto,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

/** Pede ao provedor pra revalidar o DNS do domínio. A verificação é
 *  assíncrona: passa por `pending` e leva ~1 min pra virar `verified`. */
export async function revalidarDominioEmail(): Promise<{
  ok: boolean;
  status?: string;
  error?: string;
}> {
  await requireAdmin();
  const dominio = dominioDoRemetente(remetentePadrao());
  if (!dominio) return { ok: false, error: "Domínio do remetente inválido" };
  try {
    const d = await acharDominioNoResend(dominio);
    if (!d) return { ok: false, error: `${dominio} não está no provedor` };
    const det = await pedirVerificacaoDominio(d.id);
    revalidatePath("/admin/entregabilidade");
    return { ok: true, status: det.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function marcarFalhaResolvida(id: string) {
  await requireAdmin();
  await db
    .update(emailFalhas)
    .set({ resolvidoEm: new Date() })
    .where(eq(emailFalhas.id, id));
  revalidatePath("/admin/entregabilidade");
  return { ok: true };
}

export async function limparFalhasResolvidas() {
  await requireAdmin();
  const r = await db
    .update(emailFalhas)
    .set({ resolvidoEm: new Date() })
    .where(isNull(emailFalhas.resolvidoEm))
    .returning({ id: emailFalhas.id });
  revalidatePath("/admin/entregabilidade");
  return { ok: true, total: r.length };
}
