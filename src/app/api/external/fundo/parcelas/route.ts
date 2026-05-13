import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  authenticate,
  badRequestResponse,
  unauthorizedResponse,
} from "@/lib/external-api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_VALIDOS = ["a_vencer", "paga", "vencida"];

/**
 * GET /api/external/fundo/parcelas
 * Lista parcelas de operações do fundo.
 *
 * Query params:
 *  - status: a_vencer|paga|vencida
 *  - vencimentoDe: ISO date (YYYY-MM-DD)
 *  - vencimentoAte: ISO date
 *  - operacaoId: filtro por op
 *  - limit (1-500, default 100), offset
 */
export async function GET(req: Request) {
  const ctx = await authenticate(req);
  if (!ctx) return unauthorizedResponse();

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const vencDe = url.searchParams.get("vencimentoDe");
  const vencAte = url.searchParams.get("vencimentoAte");
  const operacaoId = url.searchParams.get("operacaoId");
  const limit = Math.min(
    500,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "100", 10) || 100),
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
  );

  if (status && !STATUS_VALIDOS.includes(status)) {
    return badRequestResponse("status inválido");
  }
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (vencDe && !dateRe.test(vencDe))
    return badRequestResponse("vencimentoDe deve estar em YYYY-MM-DD");
  if (vencAte && !dateRe.test(vencAte))
    return badRequestResponse("vencimentoAte deve estar em YYYY-MM-DD");
  if (operacaoId && !/^[0-9a-f-]{36}$/i.test(operacaoId))
    return badRequestResponse("operacaoId inválido");

  const filters = [
    sql`o.fundo_id = ${ctx.fundo.id}::uuid`,
    status ? sql`p.status = ${status}` : null,
    vencDe ? sql`p.vencimento >= ${vencDe}::date` : null,
    vencAte ? sql`p.vencimento <= ${vencAte}::date` : null,
    operacaoId ? sql`p.operacao_id = ${operacaoId}::uuid` : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

  const whereClause = sql.join(filters, sql` AND `);

  const result = await db.execute(sql`
    SELECT
      p.id::text AS id,
      p.operacao_id::text AS operacao_id,
      o.numero AS operacao_numero,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      p.numero AS numero,
      p.valor::float AS valor,
      p.vencimento::text AS vencimento,
      p.status::text AS status,
      p.pago_em,
      p.pago_valor::float AS pago_valor
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    WHERE ${whereClause}
    ORDER BY p.vencimento ASC, p.numero ASC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const rows =
    (result as unknown as {
      rows: {
        id: string;
        operacao_id: string;
        operacao_numero: string;
        construtora_nome: string | null;
        numero: number;
        valor: number;
        vencimento: string;
        status: string;
        pago_em: Date | null;
        pago_valor: number | null;
      }[];
    }).rows ?? [];

  return Response.json({
    parcelas: rows.map((r) => ({
      id: r.id,
      operacaoId: r.operacao_id,
      operacaoNumero: r.operacao_numero,
      construtoraNome: r.construtora_nome,
      numero: r.numero,
      valor: r.valor,
      vencimento: r.vencimento,
      status: r.status,
      pagoEm: r.pago_em,
      pagoValor: r.pago_valor,
    })),
    pagination: { limit, offset, count: rows.length },
  });
}
