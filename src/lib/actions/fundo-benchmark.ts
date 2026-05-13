"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentFundo } from "@/lib/actions/fundos";

/** CDI estimado ao mês — hardcoded por enquanto. Em produção, viraria
 *  configuração via system_settings ou fetch de API externa (BCB).
 *  Aproximação: SELIC 11.25% a.a. → CDI ~10.65% a.a. → ~0.85%/m */
const CDI_AO_MES = 0.0085;

export type BenchmarkPayload = {
  /** Rentabilidade média ponderada do fundo no período (decimal /mês).
   *  Calculada como parteFundoRecebida / capital_aplicado_recebido. */
  rentabilidadeAoMes: number;
  cdiAoMes: number;
  /** Diferença em pontos percentuais (rent - CDI). Positivo = bate o CDI. */
  spreadPp: number;
  /** Janela considerada (últimos 90 dias) */
  parcelasPagas: number;
  capitalRecebido: number;
  parteFundoRecebida: number;
  /** prazo médio (em meses) das parcelas pagas — usado pra anualizar */
  prazoMedio: number;
};

/** Calcula rentabilidade efetiva do fundo nos últimos 90 dias.
 *  parte_fundo / capital_aplicado dá o retorno total da operação;
 *  divide pelo prazo médio em meses pra ter taxa ao mês comparável com CDI.
 */
export async function getFundoBenchmark(): Promise<BenchmarkPayload | null> {
  const fundo = await getCurrentFundo();
  if (!fundo) return null;

  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS parcelas_pagas,
      COALESCE(
        SUM(o.valor_presente * COALESCE(p.pago_valor, p.valor) / NULLIF(o.valor_comissao, 0))::float,
        0
      ) AS capital_recebido,
      COALESCE(
        SUM(
          (
            o.desagio * LEAST(1, COALESCE(o.taxa_fundo_snapshot, ${fundo.taxaMensalBase}, 0) / NULLIF(o.taxa_mensal, 0))
            + GREATEST(
                0,
                o.desagio * (1 - LEAST(1, COALESCE(o.taxa_fundo_snapshot, ${fundo.taxaMensalBase}, 0) / NULLIF(o.taxa_mensal, 0)))
              ) / 2
          ) * COALESCE(p.pago_valor, p.valor) / NULLIF(o.valor_comissao, 0)
        )::float,
        0
      ) AS parte_fundo,
      COALESCE(AVG(o.numero_parcelas)::float, 1) AS prazo_medio
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND p.status = 'paga'
      AND p.pago_em >= CURRENT_DATE - INTERVAL '90 days'
  `);

  const r = (
    result as unknown as {
      rows: {
        parcelas_pagas: number;
        capital_recebido: number;
        parte_fundo: number;
        prazo_medio: number;
      }[];
    }
  ).rows[0] ?? {
    parcelas_pagas: 0,
    capital_recebido: 0,
    parte_fundo: 0,
    prazo_medio: 1,
  };

  // Retorno absoluto na vida das ops: parte_fundo / capital
  // Pra anualizar/normalizar: divide pelo prazo médio em meses
  const retornoAbsoluto =
    r.capital_recebido > 0 ? r.parte_fundo / r.capital_recebido : 0;
  const prazoMedio = r.prazo_medio > 0 ? r.prazo_medio : 1;
  const rentabilidadeAoMes = retornoAbsoluto / prazoMedio;

  return {
    rentabilidadeAoMes,
    cdiAoMes: CDI_AO_MES,
    spreadPp: rentabilidadeAoMes - CDI_AO_MES,
    parcelasPagas: r.parcelas_pagas,
    capitalRecebido: r.capital_recebido,
    parteFundoRecebida: r.parte_fundo,
    prazoMedio,
  };
}
