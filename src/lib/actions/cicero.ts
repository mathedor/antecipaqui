"use server";

/**
 * Server action do Cícero (atendente IA).
 * Persiste TODA a conversa em cicero_conversas/cicero_mensagens
 * (incl. tools usadas, tokens e erros) + audit_logs por pergunta.
 */

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, ciceroConversas, ciceroMensagens } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { buildCiceroCtx, ciceroResponde, type CiceroResposta } from "@/lib/cicero";

export type PerguntarCiceroResult = CiceroResposta & { conversaId: string };

export async function perguntarCicero(
  conversaId: string | null,
  pergunta: string,
): Promise<PerguntarCiceroResult> {
  const user = await getCurrentDbUser();
  if (!user || !user.isActive) {
    return {
      conversaId: conversaId ?? "",
      texto: "Sua sessão expirou — entra de novo que eu te atendo. 👔",
    };
  }

  const p = String(pergunta ?? "").trim().slice(0, 600);
  if (!p) {
    return { conversaId: conversaId ?? "", texto: "Manda a pergunta que eu resolvo. 👔" };
  }

  // Conversa: reusa a do usuário ou cria nova
  let conversa = conversaId
    ? (
        await db
          .select()
          .from(ciceroConversas)
          .where(and(eq(ciceroConversas.id, conversaId), eq(ciceroConversas.userId, user.id)))
          .limit(1)
      )[0]
    : undefined;
  if (!conversa) {
    [conversa] = await db
      .insert(ciceroConversas)
      .values({ userId: user.id, userRole: user.role })
      .returning();
  }

  // Histórico vem do banco (não confiamos no client)
  const historico = await db
    .select({ autor: ciceroMensagens.autor, texto: ciceroMensagens.texto })
    .from(ciceroMensagens)
    .where(eq(ciceroMensagens.conversaId, conversa.id))
    .orderBy(asc(ciceroMensagens.createdAt))
    .then((rows) => rows.slice(-12));

  await db.insert(ciceroMensagens).values({
    conversaId: conversa.id,
    autor: "user",
    texto: p,
  });

  let resposta: CiceroResposta;
  let erro: string | null = null;
  let meta = {
    toolsUsadas: [] as { tool: string; args: Record<string, unknown> }[],
    modelo: "",
    inputTokens: 0,
    outputTokens: 0,
  };

  try {
    const ctx = await buildCiceroCtx(user);
    const r = await ciceroResponde(ctx, p, historico);
    resposta = r.resposta;
    meta = r.meta;
  } catch (e) {
    console.error("[cicero] erro:", e);
    erro = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
    resposta = {
      texto: "Deu um nó aqui na minha calculadora. 🤕 Tenta de novo em instantes.",
    };
  }

  await db.insert(ciceroMensagens).values({
    conversaId: conversa.id,
    autor: "cicero",
    texto: resposta.texto,
    toolsUsadas: meta.toolsUsadas.length > 0 ? meta.toolsUsadas : null,
    modelo: meta.modelo || null,
    inputTokens: meta.inputTokens || null,
    outputTokens: meta.outputTokens || null,
    erro,
  });
  await db
    .update(ciceroConversas)
    .set({ updatedAt: new Date() })
    .where(eq(ciceroConversas.id, conversa.id));

  await db.insert(auditLogs).values({
    userId: user.id,
    userRole: user.role,
    userEmail: user.email,
    action: "cicero_chat",
    targetType: "cicero_conversa",
    targetId: conversa.id,
    targetLabel: p.slice(0, 120),
    metadata: {
      tools: meta.toolsUsadas.map((t) => t.tool),
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      erro,
    },
  });

  return { conversaId: conversa.id, ...resposta };
}
