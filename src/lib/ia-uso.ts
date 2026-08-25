/**
 * Consumo de IA do mês — a régua única que a Ana e o relatório de custos leem.
 *
 * Duas fontes somadas:
 *  - cicero_mensagens: o Cícero grava modelo + tokens em toda resposta
 *    (sem colunas de cache nem lote — entram zeradas, lote = false);
 *  - ia_usos: medidor genérico pra qualquer chamada de IA fora do Cícero
 *    (leitura de documento, robô, processamento em lote...).
 *
 * A janela do mês é America/Sao_Paulo — mesma régua do resto do relatório —
 * e a agregação é por (modelo, lote), que é como a fatura da Anthropic separa.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";

export type LinhaIaUso = {
  modelo: string | null;
  lote: boolean;
  chamadas: number;
  tokens_in: number;
  tokens_out: number;
  tokens_cache_leitura: number;
  tokens_cache_criacao: number;
};

/** Mês corrente (YYYY-MM) no fuso de São Paulo. */
export function mesCorrenteSP(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  });
  return fmt.format(new Date()).slice(0, 7);
}

/** Consumo do mês agregado por (modelo, lote), unindo Cícero + ia_usos. */
export async function linhasIaUso(mes: string): Promise<LinhaIaUso[]> {
  // COUNT/SUM de bigint chegam como string no driver — o Number() do map
  // abaixo normaliza tudo de uma vez
  const res = await db.execute(sql`
    WITH janela AS (
      SELECT ((${mes} || '-01')::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AS ini,
             (((${mes} || '-01')::date + interval '1 month') AT TIME ZONE 'America/Sao_Paulo') AS fim
    ),
    fontes AS (
      SELECT m.modelo, false AS lote, COUNT(*) AS chamadas,
             COALESCE(SUM(m.input_tokens), 0)  AS tokens_in,
             COALESCE(SUM(m.output_tokens), 0) AS tokens_out,
             0 AS tokens_cache_leitura, 0 AS tokens_cache_criacao
        FROM cicero_mensagens m, janela j
       WHERE m.modelo IS NOT NULL AND m.created_at >= j.ini AND m.created_at < j.fim
       GROUP BY m.modelo
      UNION ALL
      SELECT u.modelo, u.lote, COUNT(*),
             COALESCE(SUM(u.tokens_in), 0), COALESCE(SUM(u.tokens_out), 0),
             COALESCE(SUM(u.tokens_cache_leitura), 0), COALESCE(SUM(u.tokens_cache_criacao), 0)
        FROM ia_usos u, janela j
       WHERE u.criado_em >= j.ini AND u.criado_em < j.fim
       GROUP BY u.modelo, u.lote
    )
    SELECT modelo, lote, SUM(chamadas) AS chamadas,
           SUM(tokens_in) AS tokens_in, SUM(tokens_out) AS tokens_out,
           SUM(tokens_cache_leitura) AS tokens_cache_leitura,
           SUM(tokens_cache_criacao) AS tokens_cache_criacao
      FROM fontes
     GROUP BY modelo, lote
     ORDER BY modelo, lote
  `);

  const rows = (res as unknown as { rows: Record<string, unknown>[] }).rows ?? [];
  return rows.map((r) => ({
    modelo: (r.modelo as string | null) ?? null,
    lote: Boolean(r.lote),
    chamadas: Number(r.chamadas ?? 0),
    tokens_in: Number(r.tokens_in ?? 0),
    tokens_out: Number(r.tokens_out ?? 0),
    tokens_cache_leitura: Number(r.tokens_cache_leitura ?? 0),
    tokens_cache_criacao: Number(r.tokens_cache_criacao ?? 0),
  }));
}

/* ── linha "I.A." do relatório de custos, quando a Ana não responde ──
   A conta certa vem da Ana (id "ia" no contasDaAna — consumo real cobrado).
   Fora do ar, estimamos aqui mesmo com o que este banco já mediu:
   tokens do mês × R$ 30 o milhão, marcado como estimativa. */

export const REAIS_POR_MILHAO_IA = 30;

export async function estimativaIaMes(
  mes: string,
): Promise<{ valor: number; tokens: number } | null> {
  try {
    const linhas = await linhasIaUso(mes);
    const tokens = linhas.reduce(
      (s, l) =>
        s + l.tokens_in + l.tokens_out + l.tokens_cache_leitura + l.tokens_cache_criacao,
      0,
    );
    const valor = Math.round((tokens / 1_000_000) * REAIS_POR_MILHAO_IA * 100) / 100;
    return { valor, tokens };
  } catch {
    return null; // banco indisponível não pode derrubar o relatório
  }
}
