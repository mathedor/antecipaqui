"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireActiveUser } from "@/lib/auth-user";

function extractRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows: unknown[] }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export type HoleriteItem = {
  comissaoId: string;
  operacaoId: string;
  operacaoNumero: string;
  construtoraNome: string | null;
  corretorNome: string | null;
  valorDevido: number;
  valorPago: number;
  saldo: number;
  status: string; // pendente | paga | cancelada
  pagaEm: string | null;
  geradaEm: string;
};

export type HoleriteMes = {
  ym: string; // YYYY-MM
  label: string; // "maio/2026"
  itens: HoleriteItem[];
  totalBruto: number;
  totalPago: number;
  totalAberto: number;
  qtdOps: number;
};

const LABELS_MES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Holerite por mês. Critério: comissões geradas/pagas no mês escolhido.
 *  Por default mostra comissões pagas no mês (faz mais sentido pro recibo);
 *  se period="geradas" mostra comissões cuja op foi aprovada no mês. */
export async function getHoleriteMes(
  comercialId: string,
  ym: string, // YYYY-MM
  period: "pagas" | "geradas" = "pagas",
): Promise<HoleriteMes> {
  await requireActiveUser();

  const [y, m] = ym.split("-").map((n) => parseInt(n, 10));
  if (!y || !m) throw new Error("Mês inválido");

  const filterCol = period === "pagas" ? "cc.paga_em" : "cc.gerada_em";

  const res = await db.execute(sql`
    SELECT
      cc.id AS comissao_id,
      cc.valor_devido::float AS valor_devido,
      cc.valor_pago::float AS valor_pago,
      cc.status,
      cc.paga_em::text AS paga_em,
      cc.gerada_em::text AS gerada_em,
      o.id AS operacao_id,
      o.numero AS operacao_numero,
      c.razao_social AS construtora_nome,
      u.nome AS corretor_nome
    FROM comissoes_comercial cc
    INNER JOIN operacoes o ON o.id = cc.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN users u ON u.id = o.corretor_user_id
    WHERE cc.comercial_id = ${comercialId}::uuid
      AND EXTRACT(YEAR FROM ${sql.raw(filterCol)}) = ${y}
      AND EXTRACT(MONTH FROM ${sql.raw(filterCol)}) = ${m}
    ORDER BY cc.gerada_em ASC
  `);

  const rows = extractRows<{
    comissao_id: string;
    valor_devido: number;
    valor_pago: number;
    status: string;
    paga_em: string | null;
    gerada_em: string;
    operacao_id: string;
    operacao_numero: string;
    construtora_nome: string | null;
    corretor_nome: string | null;
  }>(res);

  const itens: HoleriteItem[] = rows.map((r) => ({
    comissaoId: r.comissao_id,
    operacaoId: r.operacao_id,
    operacaoNumero: r.operacao_numero,
    construtoraNome: r.construtora_nome,
    corretorNome: r.corretor_nome,
    valorDevido: r.valor_devido,
    valorPago: r.valor_pago,
    saldo: r.valor_devido - r.valor_pago,
    status: r.status,
    pagaEm: r.paga_em,
    geradaEm: r.gerada_em,
  }));

  const totalBruto = itens.reduce((s, i) => s + i.valorDevido, 0);
  const totalPago = itens.reduce((s, i) => s + i.valorPago, 0);
  const totalAberto = itens.reduce((s, i) => s + i.saldo, 0);

  return {
    ym,
    label: `${LABELS_MES[m - 1]} de ${y}`,
    itens,
    totalBruto,
    totalPago,
    totalAberto,
    qtdOps: itens.length,
  };
}

/** Lista meses que têm comissões — pra dropdown de seleção. */
export async function listMesesComComissao(
  comercialId: string,
): Promise<{ ym: string; label: string }[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    SELECT DISTINCT
      to_char(date_trunc('month', cc.gerada_em), 'YYYY-MM') AS ym
    FROM comissoes_comercial cc
    WHERE cc.comercial_id = ${comercialId}::uuid
    ORDER BY ym DESC
    LIMIT 24
  `);
  return extractRows<{ ym: string }>(res).map((r) => {
    const [y, m] = r.ym.split("-").map((n) => parseInt(n, 10));
    return {
      ym: r.ym,
      label: `${LABELS_MES[m - 1]}/${String(y).slice(2)}`,
    };
  });
}
