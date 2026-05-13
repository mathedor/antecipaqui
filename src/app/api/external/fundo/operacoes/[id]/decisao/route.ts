import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, operacoes, users } from "@/db/schema";
import {
  authenticate,
  badRequestResponse,
  notFoundResponse,
  requireScope,
  unauthorizedResponse,
} from "@/lib/external-api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/external/fundo/operacoes/:id/decisao
 *
 * Body JSON: { decisao: "aprovada" | "recusada", motivo?: string }
 *
 * Requer escopo `read_write` na API key.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await authenticate(req);
  if (!ctx) return unauthorizedResponse();
  const scopeErr = requireScope(ctx, "read_write");
  if (scopeErr) return scopeErr;

  const { id } = await params;

  let body: { decisao?: string; motivo?: string };
  try {
    body = await req.json();
  } catch {
    return badRequestResponse("Body JSON inválido");
  }

  const decisao = String(body.decisao ?? "").trim();
  const motivo = String(body.motivo ?? "").trim().slice(0, 500);
  if (decisao !== "aprovada" && decisao !== "recusada") {
    return badRequestResponse("decisao deve ser 'aprovada' ou 'recusada'");
  }
  if (decisao === "recusada" && !motivo) {
    return badRequestResponse("motivo obrigatório pra recusa");
  }

  const [op] = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      fundoId: operacoes.fundoId,
      fundoAprovacao: operacoes.fundoAprovacao,
    })
    .from(operacoes)
    .where(and(eq(operacoes.id, id), eq(operacoes.fundoId, ctx.fundo.id)))
    .limit(1);
  if (!op) return notFoundResponse("Operação não encontrada ou não pertence ao fundo");

  if (op.fundoAprovacao === decisao) {
    return Response.json({
      ok: true,
      action: decisao,
      message: "Operação já estava nesse estado, nada alterado.",
      operacaoId: op.id,
      numero: op.numero,
    });
  }

  await db
    .update(operacoes)
    .set({
      fundoAprovacao: decisao,
      fundoAprovadoEm: new Date(),
      fundoAprovadoPorUserId: ctx.apiKey.createdByUserId,
      fundoRecusaMotivo: decisao === "recusada" ? motivo : null,
      updatedAt: new Date(),
    })
    .where(eq(operacoes.id, id));

  // Audit (insert direto pq não há getCurrentDbUser em request externa).
  // Tenta vincular o user criador da key, mas só se ainda existir.
  let userId = ctx.apiKey.createdByUserId;
  let userEmail: string | null = null;
  let userRole: string | null = null;
  if (userId) {
    const [u] = await db
      .select({ email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (u) {
      userEmail = u.email;
      userRole = u.role;
    } else {
      userId = null;
    }
  }
  await db.insert(auditLogs).values({
    userId,
    userRole,
    userEmail,
    action: `fundo_decisao_${decisao}_api`,
    targetType: "operacao",
    targetId: id,
    targetLabel: op.numero,
    metadata: {
      fundoId: ctx.fundo.id,
      apiKeyId: ctx.apiKey.id,
      apiKeyPrefix: ctx.apiKey.prefix,
      motivo: motivo || null,
      via: "external_api",
    },
  });

  return Response.json({
    ok: true,
    action: decisao,
    operacaoId: op.id,
    numero: op.numero,
  });
}
