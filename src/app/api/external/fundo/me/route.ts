import { sql } from "drizzle-orm";
import { db } from "@/db";
import { authenticate, unauthorizedResponse } from "@/lib/external-api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/external/fundo/me
 * Retorna dados do fundo autenticado + estatísticas resumidas.
 *
 * Header: Authorization: Bearer aq_xxxxxxxx
 */
export async function GET(req: Request) {
  const ctx = await authenticate(req);
  if (!ctx) return unauthorizedResponse();

  const stats = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE o.status NOT IN ('rascunho','recusada','cancelada'))::int AS ops_total,
      COUNT(*) FILTER (WHERE o.status = 'enviada_para_pagamento')::int AS ops_ativas,
      COUNT(*) FILTER (WHERE o.fundo_aprovacao = 'pendente')::int AS ops_pendentes,
      COALESCE(SUM(o.valor_presente) FILTER (
        WHERE o.status = 'enviada_para_pagamento'
      )::float, 0) AS capital_exposto
    FROM operacoes o
    WHERE o.fundo_id = ${ctx.fundo.id}::uuid
  `);
  const s = (stats as unknown as {
    rows: {
      ops_total: number;
      ops_ativas: number;
      ops_pendentes: number;
      capital_exposto: number;
    }[];
  }).rows[0] ?? {
    ops_total: 0,
    ops_ativas: 0,
    ops_pendentes: 0,
    capital_exposto: 0,
  };

  return Response.json({
    fundo: {
      id: ctx.fundo.id,
      cnpj: ctx.fundo.cnpj,
      razaoSocial: ctx.fundo.razaoSocial,
      nomeFantasia: ctx.fundo.nomeFantasia,
      taxaMensalBase: parseFloat(ctx.fundo.taxaMensalBase),
    },
    apiKey: {
      nome: ctx.apiKey.nome,
      escopo: ctx.apiKey.escopo,
      prefix: ctx.apiKey.prefix,
    },
    stats: {
      opsTotal: s.ops_total,
      opsAtivas: s.ops_ativas,
      opsPendentes: s.ops_pendentes,
      capitalExposto: s.capital_exposto,
    },
  });
}
