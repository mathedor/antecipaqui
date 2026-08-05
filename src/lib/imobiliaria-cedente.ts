/**
 * Resolve QUAL imobiliária entra como cedente no contrato de cessão de uma
 * operação — importante desde que imobiliária virou grupo econômico.
 *
 * Regras, em ordem:
 *  1. `operacoes.imobiliaria_id` manda. É a unidade que originou a operação
 *     (matriz ou filial), escolhida no formulário.
 *  2. Se essa unidade é uma filial marcada como `opera_em_nome_da_matriz`,
 *     o cedente do contrato passa a ser a MATRIZ (CNPJ, endereço e conta
 *     bancária dela) — a filial continua registrada como originadora.
 *  3. Sem `imobiliaria_id` (operações antigas), cai no comportamento legado:
 *     a imobiliária da qual o cedente é dono.
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { imobiliarias, type Imobiliaria } from "@/db/schema";

export type CedenteResolvido = {
  /** Entra no contrato como cedente (razão social, CNPJ, banco). */
  cedente: Imobiliaria | null;
  /** Unidade que originou a operação — igual a `cedente`, exceto quando a
   *  filial opera em nome da matriz. */
  unidade: Imobiliaria | null;
  /** True quando o contrato saiu no CNPJ da matriz por conta da filial. */
  viaMatriz: boolean;
};

async function byId(id: string): Promise<Imobiliaria | null> {
  const [row] = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.id, id))
    .limit(1);
  return row ?? null;
}

export async function resolveImobCedente(op: {
  imobiliariaId: string | null;
  corretorUserId: string;
}): Promise<CedenteResolvido> {
  if (op.imobiliariaId) {
    const unidade = await byId(op.imobiliariaId);
    if (unidade) {
      if (unidade.matrizId && unidade.operaEmNomeDaMatriz) {
        const matriz = await byId(unidade.matrizId);
        if (matriz) return { cedente: matriz, unidade, viaMatriz: true };
      }
      return { cedente: unidade, unidade, viaMatriz: false };
    }
  }

  // Legado: imobiliária da qual o cedente é dono. Num grupo, prioriza a
  // matriz (o owner é dono da matriz E das filiais).
  const rows = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.ownerUserId, op.corretorUserId));
  const matriz = rows.find((r) => r.matrizId === null) ?? rows[0] ?? null;
  return { cedente: matriz, unidade: matriz, viaMatriz: false };
}
