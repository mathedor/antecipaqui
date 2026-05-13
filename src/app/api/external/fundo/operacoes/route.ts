import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  authenticate,
  badRequestResponse,
  unauthorizedResponse,
} from "@/lib/external-api-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_VALIDOS = [
  "rascunho",
  "aguardando_aprovacao",
  "documentos_incompletos",
  "pre_aprovada",
  "analise_final",
  "enviada_para_assinatura",
  "enviada_para_pagamento",
  "realizada",
  "recusada",
  "cancelada",
];

const FUNDO_APROVACAO_VALIDAS = ["pendente", "aprovada", "recusada"];

/**
 * GET /api/external/fundo/operacoes
 * Lista operações do fundo. Query params:
 *  - status: filtro por status (csv: ex "pre_aprovada,enviada_para_pagamento")
 *  - fundoAprovacao: pendente|aprovada|recusada
 *  - limit: 1-200 (default 50)
 *  - offset: paginação
 */
export async function GET(req: Request) {
  const ctx = await authenticate(req);
  if (!ctx) return unauthorizedResponse();

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status");
  const fundoAprovacao = url.searchParams.get("fundoAprovacao");
  const limit = Math.min(
    200,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50),
  );
  const offset = Math.max(
    0,
    parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
  );

  const statusList = statusParam
    ? statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => STATUS_VALIDOS.includes(s))
    : null;
  if (statusParam && statusList && statusList.length === 0) {
    return badRequestResponse("Status inválido");
  }
  if (fundoAprovacao && !FUNDO_APROVACAO_VALIDAS.includes(fundoAprovacao)) {
    return badRequestResponse("fundoAprovacao inválido");
  }

  const statusFilter = statusList
    ? sql`AND o.status::text IN (${sql.join(
        statusList.map((s) => sql`${s}`),
        sql`, `,
      )})`
    : sql``;
  const fundoAprovacaoFilter = fundoAprovacao
    ? sql`AND o.fundo_aprovacao = ${fundoAprovacao}`
    : sql``;

  const result = await db.execute(sql`
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
      o.numero_parcelas,
      o.data_venda::text AS data_venda,
      o.aprovado_em,
      o.created_at,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      c.cnpj AS construtora_cnpj
    FROM operacoes o
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    WHERE o.fundo_id = ${ctx.fundo.id}::uuid
      ${statusFilter}
      ${fundoAprovacaoFilter}
    ORDER BY o.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `);
  const rows =
    (result as unknown as {
      rows: {
        id: string;
        numero: string;
        status: string;
        fundo_aprovacao: string | null;
        fundo_recusa_motivo: string | null;
        valor_comissao: number;
        valor_presente: number;
        juros: number;
        taxa_op: number;
        numero_parcelas: number;
        data_venda: string;
        aprovado_em: Date | null;
        created_at: Date | null;
        construtora_nome: string | null;
        construtora_cnpj: string | null;
      }[];
    }).rows ?? [];

  return Response.json({
    operacoes: rows.map((r) => ({
      id: r.id,
      numero: r.numero,
      status: r.status,
      fundoAprovacao: r.fundo_aprovacao,
      fundoRecusaMotivo: r.fundo_recusa_motivo,
      valorComissao: r.valor_comissao,
      valorPresente: r.valor_presente,
      juros: r.juros,
      taxaOpMensal: r.taxa_op,
      numeroParcelas: r.numero_parcelas,
      dataVenda: r.data_venda,
      aprovadoEm: r.aprovado_em,
      createdAt: r.created_at,
      construtora: {
        nome: r.construtora_nome,
        cnpj: r.construtora_cnpj,
      },
    })),
    pagination: { limit, offset, count: rows.length },
  });
}
