import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos, operacoes, parcelasComissao } from "@/db/schema";

export type ValorAtualizado = {
  valorOriginal: number;
  diasAtraso: number;
  multa: number;
  jurosMora: number;
  valorAtualizado: number;
  multaPct: number;
  jurosMoraMensalPct: number;
};

/** Calcula o valor atualizado de uma parcela aplicando multa única + juros
 *  mora pro rata die. Retorna o valor original se não estiver atrasada.
 *
 *  Fórmula:
 *    multa        = valor × multaAtrasoPct   (única, no primeiro dia de atraso)
 *    jurosDiario  = jurosMoraMensalPct / 30
 *    jurosMora    = valor × jurosDiario × diasAtraso
 *    atualizado   = valor + multa + jurosMora
 */
export function calcularValorAtualizado({
  valorOriginal,
  vencimento,
  multaAtrasoPct,
  jurosMoraMensalPct,
  hoje = new Date(),
}: {
  valorOriginal: number;
  vencimento: Date | string;
  multaAtrasoPct: number;
  jurosMoraMensalPct: number;
  hoje?: Date;
}): ValorAtualizado {
  const venc = typeof vencimento === "string"
    ? new Date(vencimento + "T00:00:00")
    : vencimento;
  const diffMs = hoje.getTime() - venc.getTime();
  const diasAtraso = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diasAtraso <= 0) {
    return {
      valorOriginal,
      diasAtraso: 0,
      multa: 0,
      jurosMora: 0,
      valorAtualizado: valorOriginal,
      multaPct: multaAtrasoPct,
      jurosMoraMensalPct,
    };
  }

  const multa = valorOriginal * multaAtrasoPct;
  const jurosDiario = jurosMoraMensalPct / 30;
  const jurosMora = valorOriginal * jurosDiario * diasAtraso;
  const valorAtualizado = valorOriginal + multa + jurosMora;

  return {
    valorOriginal,
    diasAtraso,
    multa,
    jurosMora,
    valorAtualizado,
    multaPct: multaAtrasoPct,
    jurosMoraMensalPct,
  };
}

/** Carrega parcela + config do fundo dela e calcula valor atualizado. */
export async function getValorAtualizadoParcela(
  parcelaId: string,
): Promise<ValorAtualizado | null> {
  const [row] = await db
    .select({
      valor: parcelasComissao.valor,
      vencimento: parcelasComissao.vencimento,
      multaAtrasoPct: fundos.multaAtrasoPct,
      jurosMoraMensalPct: fundos.jurosMoraMensalPct,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .innerJoin(fundos, eq(fundos.id, operacoes.fundoId))
    .where(eq(parcelasComissao.id, parcelaId))
    .limit(1);

  if (!row) return null;

  return calcularValorAtualizado({
    valorOriginal: parseFloat(row.valor),
    vencimento: row.vencimento,
    multaAtrasoPct: parseFloat(row.multaAtrasoPct),
    jurosMoraMensalPct: parseFloat(row.jurosMoraMensalPct),
  });
}

/** Atualiza o cache de valor_atualizado no banco (chame antes de exibir
 *  boleto ou gerar arquivo). */
export async function refreshValorAtualizadoParcela(parcelaId: string) {
  const v = await getValorAtualizadoParcela(parcelaId);
  if (!v) return null;
  await db
    .update(parcelasComissao)
    .set({
      valorAtualizado: v.valorAtualizado.toFixed(2),
      valorAtualizadoEm: new Date(),
    })
    .where(eq(parcelasComissao.id, parcelaId));
  return v;
}
