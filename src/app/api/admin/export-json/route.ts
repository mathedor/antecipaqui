/** Export JSON consolidado de operações pra backup/contabilidade externa.
 *  Admin-only. Aceita filtros: from, to (data da venda).
 *  Retorna arquivo com:
 *    { exportedAt, count, operacoes: [...] }
 */
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  comerciais,
  construtoras,
  custosOperacao,
  fundos,
  imobiliarias,
  operacaoCompradores,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") || undefined;
  const to = sp.get("to") || undefined;

  const conds = [];
  if (from) conds.push(gte(operacoes.dataVenda, from));
  if (to) conds.push(lte(operacoes.dataVenda, to));

  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      dataVenda: operacoes.dataVenda,
      valorVenda: operacoes.valorVenda,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      taxaMensal: operacoes.taxaMensal,
      taxaFundoSnapshot: operacoes.taxaFundoSnapshot,
      cashbackPercent: operacoes.cashbackPercent,
      cashbackValor: operacoes.cashbackValor,
      createdAt: operacoes.createdAt,
      aprovadoEm: operacoes.aprovadoEm,
      liquidadoEm: operacoes.liquidadoEm,
      construtoraNome: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
      fundoNome: fundos.razaoSocial,
      imobNome: imobiliarias.razaoSocial,
      corretorNome: users.nome,
      corretorEmail: users.email,
      comercialNome: comerciais.nomeCompleto,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
    .leftJoin(imobiliarias, eq(operacoes.imobiliariaId, imobiliarias.id))
    .leftJoin(users, eq(users.id, operacoes.corretorUserId))
    .leftJoin(comerciais, eq(operacoes.comercialId, comerciais.id))
    .where(conds.length > 0 ? and(...conds) : undefined);

  const opsIds = ops.map((o) => o.id);

  const allParcelas = opsIds.length
    ? await db
        .select({
          operacaoId: parcelasComissao.operacaoId,
          numero: parcelasComissao.numero,
          valor: parcelasComissao.valor,
          vencimento: parcelasComissao.vencimento,
          status: parcelasComissao.status,
          pagoEm: parcelasComissao.pagoEm,
          pagoValor: parcelasComissao.pagoValor,
        })
        .from(parcelasComissao)
        .where(inArray(parcelasComissao.operacaoId, opsIds))
    : [];

  const allCustos = opsIds.length
    ? await db
        .select()
        .from(custosOperacao)
        .where(inArray(custosOperacao.operacaoId, opsIds))
    : [];

  const allCompradores = opsIds.length
    ? await db
        .select()
        .from(operacaoCompradores)
        .where(inArray(operacaoCompradores.operacaoId, opsIds))
    : [];

  const parcelasPorOp = new Map<string, typeof allParcelas>();
  for (const p of allParcelas) {
    const arr = parcelasPorOp.get(p.operacaoId) ?? [];
    arr.push(p);
    parcelasPorOp.set(p.operacaoId, arr);
  }
  const custosPorOp = new Map<string, typeof allCustos>();
  for (const c of allCustos) {
    const arr = custosPorOp.get(c.operacaoId) ?? [];
    arr.push(c);
    custosPorOp.set(c.operacaoId, arr);
  }
  const compradoresPorOp = new Map<string, typeof allCompradores>();
  for (const c of allCompradores) {
    const arr = compradoresPorOp.get(c.operacaoId) ?? [];
    arr.push(c);
    compradoresPorOp.set(c.operacaoId, arr);
  }

  const result = {
    exportedAt: new Date().toISOString(),
    filtros: { from, to },
    count: ops.length,
    operacoes: ops.map((o) => ({
      ...o,
      parcelas: parcelasPorOp.get(o.id) ?? [],
      custos: custosPorOp.get(o.id) ?? [],
      compradores: compradoresPorOp.get(o.id) ?? [],
    })),
  };

  const json = JSON.stringify(result, null, 2);
  const ts = new Date().toISOString().slice(0, 10);
  const filename = `antecipaqui_export_${ts}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
