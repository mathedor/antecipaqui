import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  authenticate,
  notFoundResponse,
  unauthorizedResponse,
} from "@/lib/external-api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/external/fundo/operacoes/:id
 * Detalhe completo da operação + parcelas + custos.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await authenticate(req);
  if (!ctx) return unauthorizedResponse();

  const { id } = await params;

  const opRes = await db.execute(sql`
    SELECT
      o.id::text AS id,
      o.numero,
      o.status::text AS status,
      o.fundo_aprovacao,
      o.fundo_recusa_motivo,
      o.valor_comissao::float AS valor_comissao,
      o.valor_presente::float AS valor_presente,
      o.desagio::float AS juros,
      o.taxa_mensal::float AS taxa_op,
      COALESCE(o.taxa_fundo_snapshot::float, ${parseFloat(ctx.fundo.taxaMensalBase)}) AS taxa_fundo,
      o.numero_parcelas,
      o.data_venda::text AS data_venda,
      o.aprovado_em,
      o.created_at,
      jsonb_build_object(
        'id', c.id::text,
        'cnpj', c.cnpj,
        'razaoSocial', c.razao_social,
        'nomeFantasia', c.nome_fantasia
      ) AS construtora,
      jsonb_build_object(
        'id', im.id::text,
        'cnpj', im.cnpj,
        'razaoSocial', im.razao_social,
        'nomeFantasia', im.nome_fantasia
      ) AS imobiliaria,
      jsonb_build_object(
        'id', u.id,
        'nome', u.nome,
        'email', u.email
      ) AS corretor
    FROM operacoes o
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN users u ON u.id = o.corretor_user_id
    WHERE o.id = ${id}::uuid
      AND o.fundo_id = ${ctx.fundo.id}::uuid
    LIMIT 1
  `);
  const op = (opRes as unknown as { rows: Record<string, unknown>[] }).rows[0];
  if (!op) return notFoundResponse("Operação não encontrada ou não pertence ao fundo");

  const parcelasRes = await db.execute(sql`
    SELECT
      p.id::text AS id,
      p.numero,
      p.valor::float AS valor,
      p.vencimento::text AS vencimento,
      p.status::text AS status,
      p.pago_em,
      p.pago_valor::float AS pago_valor
    FROM parcelas_comissao p
    WHERE p.operacao_id = ${id}::uuid
    ORDER BY p.numero ASC
  `);
  const parcelas =
    (parcelasRes as unknown as { rows: Record<string, unknown>[] }).rows ?? [];

  const custosRes = await db.execute(sql`
    SELECT id::text AS id, titulo, valor::float AS valor
    FROM custos_operacao
    WHERE operacao_id = ${id}::uuid
    ORDER BY created_at ASC
  `);
  const custos =
    (custosRes as unknown as { rows: Record<string, unknown>[] }).rows ?? [];

  return Response.json({ operacao: op, parcelas, custos });
}
