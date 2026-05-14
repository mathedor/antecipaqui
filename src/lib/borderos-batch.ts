import "server-only";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  comerciais,
  construtoras,
  custosOperacao,
  fundos,
  imobiliarias,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";

export type BorderosBatchFilters = {
  /** dataVenda >= from (YYYY-MM-DD) */
  from?: string;
  /** dataVenda <= to (YYYY-MM-DD) */
  to?: string;
  fundoId?: string;
  construtoraId?: string;
  imobiliariaId?: string;
  comercialId?: string;
  status?: string;
};

export type BorderoBatchRow = {
  id: string;
  numero: string;
  dataVenda: string;
  taxaMensal: number;
  valorVenda: number;
  valorComissao: number;
  status: string;
  fundoNome: string | null;
  construtoraNome: string;
  cedenteNome: string;
  comercialNome: string | null;
  totaisBruto: number;
  totaisDesagio: number;
  totaisLiquido: number;
  custosTotal: number;
  valorLiquidoCedente: number;
};

export type BorderosBatchResult = {
  rows: BorderoBatchRow[];
  agregados: {
    qtdOperacoes: number;
    valorVendaTotal: number;
    valorComissaoTotal: number;
    bruto: number;
    desagio: number;
    liquido: number;
    custos: number;
    liquidoCedente: number;
  };
  filtros: BorderosBatchFilters;
};

function monthsBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.4375);
}

/** Carrega operações elegíveis pra borderô consolidado.
 *  Aplica filtros e calcula totais (bruto/deságio/líquido/custos) para cada
 *  op + agregados gerais. Admin-only. */
export async function getBorderosBatch(
  filters: BorderosBatchFilters,
): Promise<BorderosBatchResult> {
  await requireAdmin();

  const conds = [] as ReturnType<typeof eq>[];
  if (filters.from) conds.push(gte(operacoes.dataVenda, filters.from));
  if (filters.to) conds.push(lte(operacoes.dataVenda, filters.to));
  if (filters.fundoId) conds.push(eq(operacoes.fundoId, filters.fundoId));
  if (filters.construtoraId)
    conds.push(eq(operacoes.construtoraId, filters.construtoraId));
  if (filters.imobiliariaId)
    conds.push(eq(operacoes.imobiliariaId, filters.imobiliariaId));
  if (filters.comercialId)
    conds.push(eq(operacoes.comercialId, filters.comercialId));
  if (filters.status) conds.push(eq(operacoes.status, filters.status as never));

  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      dataVenda: operacoes.dataVenda,
      taxaMensal: operacoes.taxaMensal,
      valorVenda: operacoes.valorVenda,
      valorComissao: operacoes.valorComissao,
      status: operacoes.status,
      construtoraNome: construtoras.razaoSocial,
      fundoNome: fundos.razaoSocial,
      imobNome: imobiliarias.razaoSocial,
      corretorNome: users.nome,
      comercialNome: comerciais.nomeCompleto,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
    .leftJoin(imobiliarias, eq(operacoes.imobiliariaId, imobiliarias.id))
    .leftJoin(users, eq(users.id, operacoes.corretorUserId))
    .leftJoin(comerciais, eq(operacoes.comercialId, comerciais.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(desc(operacoes.dataVenda), asc(operacoes.numero));

  // Carrega parcelas e custos por op (em paralelo, mas com limite simples
  // pra não estourar). Usa Promise.all sem chunking — admin gera relatório,
  // não rota pública.
  const opsIds = ops.map((o) => o.id);
  const allParcelas =
    opsIds.length > 0
      ? await db
          .select({
            operacaoId: parcelasComissao.operacaoId,
            numero: parcelasComissao.numero,
            valor: parcelasComissao.valor,
            vencimento: parcelasComissao.vencimento,
          })
          .from(parcelasComissao)
          .where(inArray(parcelasComissao.operacaoId, opsIds))
          .orderBy(parcelasComissao.numero)
      : [];
  const parcelasPorOp = new Map<
    string,
    Array<{ numero: number; valor: string; vencimento: string }>
  >();
  for (const p of allParcelas) {
    const arr = parcelasPorOp.get(p.operacaoId) ?? [];
    arr.push({ numero: p.numero, valor: p.valor, vencimento: p.vencimento });
    parcelasPorOp.set(p.operacaoId, arr);
  }

  const allCustos =
    opsIds.length > 0
      ? await db
          .select({
            operacaoId: custosOperacao.operacaoId,
            valor: custosOperacao.valor,
          })
          .from(custosOperacao)
          .where(inArray(custosOperacao.operacaoId, opsIds))
      : [];
  const custosPorOp = new Map<string, number>();
  for (const c of allCustos) {
    const prev = custosPorOp.get(c.operacaoId) ?? 0;
    custosPorOp.set(c.operacaoId, prev + parseFloat(c.valor));
  }

  const rows: BorderoBatchRow[] = ops.map((o) => {
    const taxa = parseFloat(o.taxaMensal);
    const dataVenda = new Date(o.dataVenda + "T00:00:00");
    const parcelas = parcelasPorOp.get(o.id) ?? [];
    let bruto = 0;
    let liquido = 0;
    for (const p of parcelas) {
      const venc = new Date(p.vencimento + "T00:00:00");
      const meses = Math.max(monthsBetween(dataVenda, venc), 0);
      const valorBruto = parseFloat(p.valor);
      const valorLiquido = valorBruto / Math.pow(1 + taxa, meses);
      bruto += valorBruto;
      liquido += valorLiquido;
    }
    const desagio = bruto - liquido;
    const custosTotal = custosPorOp.get(o.id) ?? 0;
    return {
      id: o.id,
      numero: o.numero,
      dataVenda: o.dataVenda,
      taxaMensal: taxa,
      valorVenda: parseFloat(o.valorVenda),
      valorComissao: parseFloat(o.valorComissao),
      status: o.status,
      fundoNome: o.fundoNome ?? null,
      construtoraNome: o.construtoraNome ?? "—",
      cedenteNome: o.imobNome ?? o.corretorNome ?? "—",
      comercialNome: o.comercialNome ?? null,
      totaisBruto: bruto,
      totaisDesagio: desagio,
      totaisLiquido: liquido,
      custosTotal,
      valorLiquidoCedente: Math.max(liquido - custosTotal, 0),
    };
  });

  const agregados = rows.reduce(
    (acc, r) => ({
      qtdOperacoes: acc.qtdOperacoes + 1,
      valorVendaTotal: acc.valorVendaTotal + r.valorVenda,
      valorComissaoTotal: acc.valorComissaoTotal + r.valorComissao,
      bruto: acc.bruto + r.totaisBruto,
      desagio: acc.desagio + r.totaisDesagio,
      liquido: acc.liquido + r.totaisLiquido,
      custos: acc.custos + r.custosTotal,
      liquidoCedente: acc.liquidoCedente + r.valorLiquidoCedente,
    }),
    {
      qtdOperacoes: 0,
      valorVendaTotal: 0,
      valorComissaoTotal: 0,
      bruto: 0,
      desagio: 0,
      liquido: 0,
      custos: 0,
      liquidoCedente: 0,
    },
  );

  return { rows, agregados, filtros: filters };
}
