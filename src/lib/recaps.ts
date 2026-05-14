import "server-only";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { recapsRelatorio, fundos, users } from "@/db/schema";

export type RecapPeriodo = "diario" | "semanal" | "mensal";

export type RecapDados = {
  periodo: RecapPeriodo;
  inicio: string; // YYYY-MM-DD
  fim: string;
  escopo: "admin" | "fundo";
  fundoId: string | null;
  /** Ops criadas no período (qtd + valor comissão). */
  opsNovas: { qtd: number; valor: number };
  /** Ops realizadas/pagas no período. */
  opsRealizadas: { qtd: number; valor: number };
  /** Ops aprovadas pelo fundo no período (por fundo se admin). */
  aprovacoes: Array<{ fundoId: string; fundoNome: string; qtd: number; valor: number }>;
  /** Total aprovado no período. */
  totalAprovado: { qtd: number; valor: number };
  /** Total recusado no período. */
  totalRecusado: { qtd: number; valor: number };
  /** Inadimplência: valor vencido novo no período + acumulado até o fim. */
  inadimplencia: {
    vencidoNoPeriodo: number;
    acumulado: number;
    qtdVencidasAcumulado: number;
  };
  /** Novos corretores cadastrados no período. */
  novosCorretores: number;
  /** Prazo médio de análise (em horas) — ops criadas no período que tiveram decisão. */
  prazoMedioAnaliseHoras: number;
  /** Antecipações solicitadas / decididas no período. */
  antecipacoes: { solicitadas: number; aprovadas: number; recusadas: number };
};

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calcula janela [inicio, fim] (datas inclusive) pra um período + ref. */
export function periodoRange(
  periodo: RecapPeriodo,
  ref: Date,
): { inicio: string; fim: string } {
  const ref0 = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate()));
  if (periodo === "diario") {
    // ref é o "dia que fechou" — recap cobre esse dia inteiro
    return { inicio: fmtDate(ref0), fim: fmtDate(ref0) };
  }
  if (periodo === "semanal") {
    // segunda → domingo da semana que terminou
    const dow = ref0.getUTCDay(); // 0=dom .. 6=sab
    // Domingo é o "fim da semana"; segunda anterior é o início
    const distToSunday = dow === 0 ? 0 : dow - 0;
    const fim = new Date(ref0);
    fim.setUTCDate(ref0.getUTCDate() - distToSunday);
    const inicio = new Date(fim);
    inicio.setUTCDate(fim.getUTCDate() - 6);
    return { inicio: fmtDate(inicio), fim: fmtDate(fim) };
  }
  // mensal — mês inteiro anterior à data de ref
  const y = ref0.getUTCFullYear();
  const m = ref0.getUTCMonth();
  const inicio = new Date(Date.UTC(y, m - 1, 1));
  const fim = new Date(Date.UTC(y, m, 0));
  return { inicio: fmtDate(inicio), fim: fmtDate(fim) };
}

/** Calcula os dados do recap pra (escopo, fundoId, janela). */
export async function calcularRecap(args: {
  periodo: RecapPeriodo;
  inicio: string;
  fim: string;
  escopo: "admin" | "fundo";
  fundoId: string | null;
}): Promise<RecapDados> {
  const { periodo, inicio, fim, escopo, fundoId } = args;

  const fundoFilter = escopo === "fundo" && fundoId
    ? sql`AND o.fundo_id = ${fundoId}::uuid`
    : sql``;

  // 1) Ops novas no período (created_at)
  const opsNovasRes = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd, COALESCE(SUM(o.valor_comissao), 0)::float AS valor
    FROM operacoes o
    WHERE o.created_at::date BETWEEN ${inicio}::date AND ${fim}::date
    ${fundoFilter}
  `);
  const opsNovas = (opsNovasRes as unknown as { rows: { qtd: number; valor: number }[] }).rows[0] ?? { qtd: 0, valor: 0 };

  // 2) Ops realizadas (pagas) no período — usando data_pagamento ou updated_at quando status virou 'realizada'
  const opsRealRes = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd, COALESCE(SUM(o.valor_comissao), 0)::float AS valor
    FROM operacoes o
    WHERE o.status = 'realizada'
      AND o.updated_at::date BETWEEN ${inicio}::date AND ${fim}::date
    ${fundoFilter}
  `);
  const opsRealizadas = (opsRealRes as unknown as { rows: { qtd: number; valor: number }[] }).rows[0] ?? { qtd: 0, valor: 0 };

  // 3) Aprovações no período (fundo_aprovado_em)
  const aprovacoesRes = await db.execute(sql`
    SELECT
      o.fundo_id::text AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome,
      COUNT(*)::int AS qtd,
      COALESCE(SUM(o.valor_comissao), 0)::float AS valor
    FROM operacoes o
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE o.fundo_aprovacao = 'aprovada'
      AND o.fundo_aprovado_em::date BETWEEN ${inicio}::date AND ${fim}::date
    ${fundoFilter}
    GROUP BY o.fundo_id, f.nome_fantasia, f.razao_social
    ORDER BY valor DESC
  `);
  const aprovacoes = (
    aprovacoesRes as unknown as { rows: { fundo_id: string; fundo_nome: string | null; qtd: number; valor: number }[] }
  ).rows.map((r) => ({
    fundoId: r.fundo_id,
    fundoNome: r.fundo_nome ?? "—",
    qtd: r.qtd,
    valor: r.valor,
  }));
  const totalAprovado = aprovacoes.reduce(
    (acc, a) => ({ qtd: acc.qtd + a.qtd, valor: acc.valor + a.valor }),
    { qtd: 0, valor: 0 },
  );

  // 4) Recusas no período
  const recusasRes = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd, COALESCE(SUM(o.valor_comissao), 0)::float AS valor
    FROM operacoes o
    WHERE o.fundo_aprovacao = 'recusada'
      AND o.fundo_aprovado_em::date BETWEEN ${inicio}::date AND ${fim}::date
    ${fundoFilter}
  `);
  const totalRecusado = (recusasRes as unknown as { rows: { qtd: number; valor: number }[] }).rows[0] ?? { qtd: 0, valor: 0 };

  // 5) Inadimplência — parcelas que viraram vencidas no período + total acumulado até o fim
  const vencidoPeriodoRes = await db.execute(sql`
    SELECT COALESCE(SUM(p.valor), 0)::float AS valor
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE p.vencimento BETWEEN ${inicio}::date AND ${fim}::date
      AND p.status = 'vencida'
    ${fundoFilter}
  `);
  const vencidoNoPeriodo = (
    vencidoPeriodoRes as unknown as { rows: { valor: number }[] }
  ).rows[0]?.valor ?? 0;

  const acumuladoRes = await db.execute(sql`
    SELECT
      COALESCE(SUM(p.valor), 0)::float AS valor,
      COUNT(*)::int AS qtd
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE p.status = 'vencida'
      AND p.vencimento <= ${fim}::date
    ${fundoFilter}
  `);
  const acumuladoRow = (acumuladoRes as unknown as { rows: { valor: number; qtd: number }[] }).rows[0] ?? { valor: 0, qtd: 0 };

  // 6) Novos corretores cadastrados no período (admin global; pra fundo, contamos
  //    corretores que entraram via ops do fundo no período)
  let novosCorretores = 0;
  if (escopo === "admin") {
    const cRes = await db.execute(sql`
      SELECT COUNT(*)::int AS qtd
      FROM users
      WHERE role IN ('corretor','imobiliaria')
        AND created_at::date BETWEEN ${inicio}::date AND ${fim}::date
    `);
    novosCorretores = (cRes as unknown as { rows: { qtd: number }[] }).rows[0]?.qtd ?? 0;
  } else if (fundoId) {
    const cRes = await db.execute(sql`
      SELECT COUNT(DISTINCT u.id)::int AS qtd
      FROM users u
      INNER JOIN operacoes o ON o.corretor_user_id = u.id
      WHERE o.fundo_id = ${fundoId}::uuid
        AND u.created_at::date BETWEEN ${inicio}::date AND ${fim}::date
    `);
    novosCorretores = (cRes as unknown as { rows: { qtd: number }[] }).rows[0]?.qtd ?? 0;
  }

  // 7) Prazo médio de análise — diferença entre created_at e fundo_aprovado_em
  //    (em horas) pra ops criadas no período que já foram decididas
  const prazoRes = await db.execute(sql`
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (o.fundo_aprovado_em - o.created_at)) / 3600), 0)::float AS horas
    FROM operacoes o
    WHERE o.created_at::date BETWEEN ${inicio}::date AND ${fim}::date
      AND o.fundo_aprovado_em IS NOT NULL
    ${fundoFilter}
  `);
  const prazoMedioAnaliseHoras = (
    prazoRes as unknown as { rows: { horas: number }[] }
  ).rows[0]?.horas ?? 0;

  // 8) Antecipações solicitadas/decididas no período
  const antecRes = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE pa.created_at::date BETWEEN ${inicio}::date AND ${fim}::date)::int AS solicitadas,
      COUNT(*) FILTER (WHERE pa.status = 'aprovada' AND pa.decido_em::date BETWEEN ${inicio}::date AND ${fim}::date)::int AS aprovadas,
      COUNT(*) FILTER (WHERE pa.status = 'recusada' AND pa.decido_em::date BETWEEN ${inicio}::date AND ${fim}::date)::int AS recusadas
    FROM parcela_antecipacoes pa
    INNER JOIN parcelas_comissao p ON p.id = pa.parcela_id
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE 1=1 ${fundoFilter}
  `);
  const antecipacoes =
    (antecRes as unknown as { rows: { solicitadas: number; aprovadas: number; recusadas: number }[] }).rows[0] ??
    { solicitadas: 0, aprovadas: 0, recusadas: 0 };

  return {
    periodo,
    inicio,
    fim,
    escopo,
    fundoId,
    opsNovas,
    opsRealizadas,
    aprovacoes,
    totalAprovado,
    totalRecusado,
    inadimplencia: {
      vencidoNoPeriodo,
      acumulado: acumuladoRow.valor,
      qtdVencidasAcumulado: acumuladoRow.qtd,
    },
    novosCorretores,
    prazoMedioAnaliseHoras,
    antecipacoes,
  };
}

/** Persiste recap (upsert idempotente por chave única). */
export async function salvarRecap(dados: RecapDados): Promise<{ id: string; criado: boolean }> {
  const existing = await db
    .select({ id: recapsRelatorio.id })
    .from(recapsRelatorio)
    .where(
      and(
        eq(recapsRelatorio.periodo, dados.periodo),
        eq(recapsRelatorio.inicio, dados.inicio),
        eq(recapsRelatorio.escopo, dados.escopo),
        dados.fundoId
          ? eq(recapsRelatorio.fundoId, dados.fundoId)
          : sql`${recapsRelatorio.fundoId} IS NULL`,
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(recapsRelatorio)
      .set({ dados: dados as never, fim: dados.fim, geradoEm: new Date() })
      .where(eq(recapsRelatorio.id, existing[0].id));
    return { id: existing[0].id, criado: false };
  }

  const [created] = await db
    .insert(recapsRelatorio)
    .values({
      periodo: dados.periodo,
      inicio: dados.inicio,
      fim: dados.fim,
      escopo: dados.escopo,
      fundoId: dados.fundoId,
      dados: dados as never,
    })
    .returning({ id: recapsRelatorio.id });

  return { id: created.id, criado: true };
}

/** Lista recaps com filtros. */
export async function listRecaps(opts: {
  escopo: "admin" | "fundo";
  fundoId?: string | null;
  periodo?: RecapPeriodo;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const conds = [eq(recapsRelatorio.escopo, opts.escopo)];
  if (opts.escopo === "fundo" && opts.fundoId)
    conds.push(eq(recapsRelatorio.fundoId, opts.fundoId));
  if (opts.periodo) conds.push(eq(recapsRelatorio.periodo, opts.periodo));
  if (opts.from) conds.push(gte(recapsRelatorio.inicio, opts.from));
  if (opts.to) conds.push(lte(recapsRelatorio.inicio, opts.to));

  return db
    .select()
    .from(recapsRelatorio)
    .where(and(...conds))
    .orderBy(sql`${recapsRelatorio.inicio} DESC`)
    .limit(opts.limit ?? 200);
}

/** Lista emails dos donos de fundo (pra envio). */
export async function listFundosComOwner(): Promise<Array<{ id: string; razaoSocial: string; ownerUserId: string | null; ownerEmail: string | null; ownerNome: string | null }>> {
  const rows = await db
    .select({
      id: fundos.id,
      razaoSocial: fundos.razaoSocial,
      ownerUserId: fundos.ownerUserId,
      ownerEmail: users.email,
      ownerNome: users.nome,
    })
    .from(fundos)
    .leftJoin(users, eq(users.id, fundos.ownerUserId));
  return rows;
}

/** Lista admins ativos pra envio. */
export async function listAdmins(): Promise<Array<{ id: string; email: string; nome: string }>> {
  const rows = await db
    .select({ id: users.id, email: users.email, nome: users.nome })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  return rows.map((r) => ({ id: r.id, email: r.email, nome: r.nome ?? "Admin" }));
}
