"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comerciais } from "@/db/schema";
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

export type ComercialDesempenho = {
  // Identificação
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  fundoId: string | null;
  isActive: boolean;

  // Faturamento
  comissaoAcumulada: number;
  comissaoPaga: number;
  comissaoPendente: number;
  faturadoMesAtual: number;
  inadimplencia: number;

  // Operações
  qtdOps: number;
  qtdOpsAprovadas: number;
  qtdOpsRealizadas: number;
  qtdOpsRecusadas: number;
  volumePresenteTotal: number;
  ticketMedio: number;

  // Carteira
  qtdImobs: number;
  qtdImobsAtivas90d: number;
  qtdImobsDormidas: number;

  // Prospecção
  qtdPontosMapa: number;
  qtdPontosContactados: number;
  qtdLeads: number;
  qtdLeadsFechados: number;
  qtdLeadsPerdidos: number;
  qtdLeadsAtivos: number;

  // Captação
  qtdImobsCadastradasExpress: number;
  qtdLinksConvite: number;
  totalCliquesLink: number;
  totalConversoesLink: number;
  taxaConversaoLink: number;

  // CRM
  qtdInteracoes30d: number;
  qtdFollowupsAtrasados: number;

  // Templates
  qtdTemplates: number;
};

/** Agregado de tudo que importa pro acompanhamento do comercial.
 *  Único requireActiveUser — quem chama precisa garantir autorização
 *  contextual (admin no caso admin, fundo dono no caso fundo). */
export async function getComercialDesempenho(
  comercialId: string,
): Promise<ComercialDesempenho | null> {
  await requireActiveUser();

  const [base] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.id, comercialId))
    .limit(1);
  if (!base) return null;

  // Uma query gigante com várias subqueries — evita N+1
  const res = await db.execute(sql`
    SELECT
      -- comissoes
      COALESCE((SELECT SUM(valor_devido)::float FROM comissoes_comercial WHERE comercial_id = ${comercialId}::uuid), 0) AS comissao_acumulada,
      COALESCE((SELECT SUM(valor_pago)::float FROM comissoes_comercial WHERE comercial_id = ${comercialId}::uuid), 0) AS comissao_paga,
      COALESCE((SELECT SUM(valor_devido - valor_pago)::float FROM comissoes_comercial WHERE comercial_id = ${comercialId}::uuid AND status = 'pendente'), 0) AS comissao_pendente,
      COALESCE((SELECT SUM(valor_pago)::float FROM comissoes_comercial WHERE comercial_id = ${comercialId}::uuid AND date_trunc('month', paga_em) = date_trunc('month', CURRENT_DATE)), 0) AS faturado_mes,

      -- parcelas vencidas das ops do comercial (inadimplência da carteira)
      COALESCE((
        SELECT SUM(p.valor)::float
        FROM parcelas_comissao p
        INNER JOIN operacoes o ON o.id = p.operacao_id
        WHERE o.comercial_id = ${comercialId}::uuid
          AND (p.status = 'vencida' OR (p.status = 'a_vencer' AND p.vencimento < CURRENT_DATE))
      ), 0) AS inadimplencia,

      -- operações
      (SELECT COUNT(*)::int FROM operacoes WHERE comercial_id = ${comercialId}::uuid) AS qtd_ops,
      (SELECT COUNT(*)::int FROM operacoes WHERE comercial_id = ${comercialId}::uuid AND status NOT IN ('rascunho','recusada','cancelada')) AS qtd_aprovadas,
      (SELECT COUNT(*)::int FROM operacoes WHERE comercial_id = ${comercialId}::uuid AND status = 'realizada') AS qtd_realizadas,
      (SELECT COUNT(*)::int FROM operacoes WHERE comercial_id = ${comercialId}::uuid AND status = 'recusada') AS qtd_recusadas,
      COALESCE((SELECT SUM(valor_presente)::float FROM operacoes WHERE comercial_id = ${comercialId}::uuid AND status NOT IN ('rascunho','recusada','cancelada')), 0) AS volume_total,
      COALESCE((SELECT AVG(valor_presente)::float FROM operacoes WHERE comercial_id = ${comercialId}::uuid AND status NOT IN ('rascunho','recusada','cancelada')), 0) AS ticket_medio,

      -- carteira
      (SELECT COUNT(*)::int FROM imobiliarias WHERE comercial_id = ${comercialId}::uuid) AS qtd_imobs,
      (SELECT COUNT(DISTINCT o.imobiliaria_id)::int
        FROM operacoes o
        WHERE o.comercial_id = ${comercialId}::uuid
          AND o.imobiliaria_id IS NOT NULL
          AND o.created_at >= NOW() - INTERVAL '90 days'
          AND o.status NOT IN ('rascunho','recusada','cancelada')) AS imobs_ativas,

      -- prospecção
      (SELECT COUNT(*)::int FROM comercial_prospect_pontos WHERE comercial_id = ${comercialId}::uuid) AS pontos,
      (SELECT COUNT(*)::int FROM comercial_prospect_pontos WHERE comercial_id = ${comercialId}::uuid AND status IN ('contactado','reuniao_agendada')) AS pontos_contactados,
      (SELECT COUNT(*)::int FROM comercial_leads WHERE comercial_id = ${comercialId}::uuid) AS leads,
      (SELECT COUNT(*)::int FROM comercial_leads WHERE comercial_id = ${comercialId}::uuid AND status = 'fechado') AS leads_fechados,
      (SELECT COUNT(*)::int FROM comercial_leads WHERE comercial_id = ${comercialId}::uuid AND status = 'perdido') AS leads_perdidos,
      (SELECT COUNT(*)::int FROM comercial_leads WHERE comercial_id = ${comercialId}::uuid AND status NOT IN ('fechado','perdido')) AS leads_ativos,

      -- captação
      (SELECT COUNT(*)::int FROM comercial_convite_links WHERE comercial_id = ${comercialId}::uuid) AS links,
      COALESCE((SELECT SUM(cliques)::int FROM comercial_convite_links WHERE comercial_id = ${comercialId}::uuid), 0) AS cliques,
      COALESCE((SELECT SUM(conversoes)::int FROM comercial_convite_links WHERE comercial_id = ${comercialId}::uuid), 0) AS conversoes,

      -- CRM
      (SELECT COUNT(*)::int FROM comercial_interacoes WHERE comercial_id = ${comercialId}::uuid AND created_at >= NOW() - INTERVAL '30 days') AS interacoes_30d,
      (SELECT COUNT(*)::int FROM comercial_interacoes WHERE comercial_id = ${comercialId}::uuid AND proxima_acao_em IS NOT NULL AND proxima_acao_em < CURRENT_DATE) AS followups_atrasados,

      -- templates
      (SELECT COUNT(*)::int FROM comercial_templates WHERE comercial_id = ${comercialId}::uuid) AS templates
  `);

  const row =
    extractRows<{
      comissao_acumulada: number;
      comissao_paga: number;
      comissao_pendente: number;
      faturado_mes: number;
      inadimplencia: number;
      qtd_ops: number;
      qtd_aprovadas: number;
      qtd_realizadas: number;
      qtd_recusadas: number;
      volume_total: number;
      ticket_medio: number;
      qtd_imobs: number;
      imobs_ativas: number;
      pontos: number;
      pontos_contactados: number;
      leads: number;
      leads_fechados: number;
      leads_perdidos: number;
      leads_ativos: number;
      links: number;
      cliques: number;
      conversoes: number;
      interacoes_30d: number;
      followups_atrasados: number;
      templates: number;
    }>(res)[0] ?? ({} as never);

  // Conta imobs cadastradas via cadastro express (audit log)
  const exp = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd
    FROM audit_logs
    WHERE action = 'imobiliaria_cadastrada_express'
      AND metadata->>'comercialId' = ${comercialId}
  `);
  const qtdImobsCadastradasExpress =
    extractRows<{ qtd: number }>(exp)[0]?.qtd ?? 0;

  // Imobs dormidas — última op > 60d
  const dorm = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd FROM (
      SELECT i.id, MAX(o.created_at) AS ult
      FROM imobiliarias i
      LEFT JOIN operacoes o ON o.imobiliaria_id = i.id
        AND o.status NOT IN ('rascunho','recusada','cancelada')
      WHERE i.comercial_id = ${comercialId}::uuid
      GROUP BY i.id
      HAVING MAX(o.created_at) IS NOT NULL AND MAX(o.created_at) < NOW() - INTERVAL '60 days'
    ) x
  `);
  const qtdImobsDormidas = extractRows<{ qtd: number }>(dorm)[0]?.qtd ?? 0;

  return {
    id: base.id,
    nome: base.apelido ?? base.nomeCompleto,
    email: base.email,
    telefone: base.telefone,
    fundoId: base.fundoId,
    isActive: base.isActive,

    comissaoAcumulada: row.comissao_acumulada ?? 0,
    comissaoPaga: row.comissao_paga ?? 0,
    comissaoPendente: row.comissao_pendente ?? 0,
    faturadoMesAtual: row.faturado_mes ?? 0,
    inadimplencia: row.inadimplencia ?? 0,

    qtdOps: row.qtd_ops ?? 0,
    qtdOpsAprovadas: row.qtd_aprovadas ?? 0,
    qtdOpsRealizadas: row.qtd_realizadas ?? 0,
    qtdOpsRecusadas: row.qtd_recusadas ?? 0,
    volumePresenteTotal: row.volume_total ?? 0,
    ticketMedio: row.ticket_medio ?? 0,

    qtdImobs: row.qtd_imobs ?? 0,
    qtdImobsAtivas90d: row.imobs_ativas ?? 0,
    qtdImobsDormidas,

    qtdPontosMapa: row.pontos ?? 0,
    qtdPontosContactados: row.pontos_contactados ?? 0,
    qtdLeads: row.leads ?? 0,
    qtdLeadsFechados: row.leads_fechados ?? 0,
    qtdLeadsPerdidos: row.leads_perdidos ?? 0,
    qtdLeadsAtivos: row.leads_ativos ?? 0,

    qtdImobsCadastradasExpress,
    qtdLinksConvite: row.links ?? 0,
    totalCliquesLink: row.cliques ?? 0,
    totalConversoesLink: row.conversoes ?? 0,
    taxaConversaoLink:
      row.cliques > 0 ? row.conversoes / row.cliques : 0,

    qtdInteracoes30d: row.interacoes_30d ?? 0,
    qtdFollowupsAtrasados: row.followups_atrasados ?? 0,

    qtdTemplates: row.templates ?? 0,
  };
}

/** Lista comerciais vinculados a um fundo específico (pra painel do fundo). */
export async function listComerciaisDoFundo(fundoId: string) {
  await requireActiveUser();
  return db
    .select()
    .from(comerciais)
    .where(eq(comerciais.fundoId, fundoId));
}
