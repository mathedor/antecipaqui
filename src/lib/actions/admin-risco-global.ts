"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";

export type TopDevedora = {
  construtoraId: string;
  construtoraNome: string;
  cnpj: string | null;
  parcelasVencidas: number;
  valorVencido: number;
  diasMedioAtraso: number;
  qtdFundosImpactados: number; // distintos fundos com exposição
  /** Fundos que bloquearam essa construtora (anti-cross-recomendação) */
  qtdBloqueios: number;
};

export type ComparativoFundo = {
  fundoId: string;
  fundoNome: string;
  taxaMensalBase: number;
  /** Total exposto em ops ativas */
  capitalExposto: number;
  qtdOps: number;
  /** Operações aguardando decisão do fundo (gargalo) */
  qtdPendentes: number;
  qtdAprovadasSeMan: number; // aprovadas (manualmente)
  qtdAprovadasAuto: number;
  qtdRecusadas: number;
  /** Faturas pagas / total emitidas */
  faturasPagas: number;
  faturasTotal: number;
  totalDevidoFaturas: number;
  totalPagoFaturas: number;
  /** Regras de auto-aprovação ativas */
  qtdRegrasAtivas: number;
  /** Construtoras bloqueadas */
  qtdBlacklist: number;
};

export type AlertaCritico = {
  tipo: "concentracao" | "inadimplencia" | "fatura_vencida" | "doc_revisar";
  titulo: string;
  descricao: string;
  href?: string;
  severidade: "warn" | "danger";
};

export type RiscoGlobalPayload = {
  capitalExpostoTotal: number;
  qtdFundosAtivos: number;
  qtdConstrutorasAtivas: number;
  qtdVencidasGlobal: number;
  valorVencidoGlobal: number;
  topDevedoras: TopDevedora[];
  comparativoFundos: ComparativoFundo[];
  alertas: AlertaCritico[];
};

export async function getRiscoGlobal(): Promise<RiscoGlobalPayload> {
  await requireAdmin();

  // 1. KPIs gerais
  const kpis = await db.execute(sql`
    SELECT
      COALESCE(SUM(o.valor_presente)::float, 0) AS capital_exposto,
      COUNT(DISTINCT o.fundo_id)::int AS fundos_ativos,
      COUNT(DISTINCT o.construtora_id)::int AS construtoras_ativas
    FROM operacoes o
    WHERE o.status IN ('pre_aprovada','analise_final','enviada_para_assinatura','enviada_para_pagamento','realizada')
      AND o.fundo_id IS NOT NULL
  `);
  const k = (
    kpis as unknown as {
      rows: {
        capital_exposto: number;
        fundos_ativos: number;
        construtoras_ativas: number;
      }[];
    }
  ).rows[0] ?? {
    capital_exposto: 0,
    fundos_ativos: 0,
    construtoras_ativas: 0,
  };

  // 2. Vencidas globais
  const venc = await db.execute(sql`
    SELECT
      COUNT(*)::int AS qtd,
      COALESCE(SUM(p.valor)::float, 0) AS valor
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    WHERE p.status = 'vencida'
  `);
  const v = (
    venc as unknown as { rows: { qtd: number; valor: number }[] }
  ).rows[0] ?? { qtd: 0, valor: 0 };

  // 3. Top devedoras globais
  const devRes = await db.execute(sql`
    SELECT
      c.id::text AS construtora_id,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      c.cnpj AS cnpj,
      COUNT(p.id)::int AS parcelas_vencidas,
      COALESCE(SUM(p.valor)::float, 0) AS valor_vencido,
      COALESCE(AVG((CURRENT_DATE - p.vencimento)::int)::float, 0)
        AS dias_medio_atraso,
      COUNT(DISTINCT o.fundo_id)::int AS qtd_fundos_impactados,
      (
        SELECT COUNT(*) FROM fundo_blacklist b
        WHERE b.construtora_id = c.id
      )::int AS qtd_bloqueios
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    INNER JOIN construtoras c ON c.id = o.construtora_id
    WHERE p.status = 'vencida'
    GROUP BY c.id, c.nome_fantasia, c.razao_social, c.cnpj
    ORDER BY valor_vencido DESC
    LIMIT 15
  `);
  const topDevedoras: TopDevedora[] = (
    (
      devRes as unknown as {
        rows: {
          construtora_id: string;
          construtora_nome: string;
          cnpj: string | null;
          parcelas_vencidas: number;
          valor_vencido: number;
          dias_medio_atraso: number;
          qtd_fundos_impactados: number;
          qtd_bloqueios: number;
        }[];
      }
    ).rows ?? []
  ).map((r) => ({
    construtoraId: r.construtora_id,
    construtoraNome: r.construtora_nome,
    cnpj: r.cnpj,
    parcelasVencidas: r.parcelas_vencidas,
    valorVencido: r.valor_vencido,
    diasMedioAtraso: Math.round(r.dias_medio_atraso),
    qtdFundosImpactados: r.qtd_fundos_impactados,
    qtdBloqueios: r.qtd_bloqueios,
  }));

  // 4. Comparativo de fundos
  const fundosRes = await db.execute(sql`
    SELECT
      f.id::text AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome,
      f.taxa_mensal_base::float AS taxa_mensal,
      (
        SELECT COALESCE(SUM(o.valor_presente)::float, 0) FROM operacoes o
        WHERE o.fundo_id = f.id
          AND o.status IN ('pre_aprovada','analise_final','enviada_para_assinatura','enviada_para_pagamento','realizada')
      ) AS capital_exposto,
      (
        SELECT COUNT(*)::int FROM operacoes o
        WHERE o.fundo_id = f.id
          AND o.status IN ('pre_aprovada','analise_final','enviada_para_assinatura','enviada_para_pagamento','realizada')
      ) AS qtd_ops,
      (
        SELECT COUNT(*)::int FROM operacoes o
        WHERE o.fundo_id = f.id
          AND o.fundo_aprovacao = 'pendente'
          AND o.status IN ('pre_aprovada','analise_final','enviada_para_assinatura')
      ) AS qtd_pendentes,
      (
        SELECT COUNT(*)::int FROM operacoes o
        WHERE o.fundo_id = f.id
          AND o.fundo_aprovacao = 'aprovada'
          AND o.fundo_regra_auto_id IS NULL
      ) AS qtd_aprov_manual,
      (
        SELECT COUNT(*)::int FROM operacoes o
        WHERE o.fundo_id = f.id
          AND o.fundo_aprovacao = 'aprovada'
          AND o.fundo_regra_auto_id IS NOT NULL
      ) AS qtd_aprov_auto,
      (
        SELECT COUNT(*)::int FROM operacoes o
        WHERE o.fundo_id = f.id
          AND o.fundo_aprovacao = 'recusada'
      ) AS qtd_recusadas,
      (
        SELECT COUNT(*)::int FROM faturas_fundo ff
        WHERE ff.fundo_id = f.id AND ff.status = 'paga'
      ) AS faturas_pagas,
      (
        SELECT COUNT(*)::int FROM faturas_fundo ff
        WHERE ff.fundo_id = f.id
      ) AS faturas_total,
      (
        SELECT COALESCE(SUM(valor_devido)::float, 0) FROM faturas_fundo ff
        WHERE ff.fundo_id = f.id
      ) AS total_devido,
      (
        SELECT COALESCE(SUM(valor_pago)::float, 0) FROM faturas_fundo ff
        WHERE ff.fundo_id = f.id
      ) AS total_pago,
      (
        SELECT COUNT(*)::int FROM fundo_regras_auto_aprovacao r
        WHERE r.fundo_id = f.id AND r.ativa = true
      ) AS qtd_regras_ativas,
      (
        SELECT COUNT(*)::int FROM fundo_blacklist b
        WHERE b.fundo_id = f.id
      ) AS qtd_blacklist
    FROM fundos f
    WHERE f.is_active = true
    ORDER BY capital_exposto DESC
  `);
  type FRow = {
    fundo_id: string;
    fundo_nome: string;
    taxa_mensal: number;
    capital_exposto: number;
    qtd_ops: number;
    qtd_pendentes: number;
    qtd_aprov_manual: number;
    qtd_aprov_auto: number;
    qtd_recusadas: number;
    faturas_pagas: number;
    faturas_total: number;
    total_devido: number;
    total_pago: number;
    qtd_regras_ativas: number;
    qtd_blacklist: number;
  };
  const comparativoFundos: ComparativoFundo[] = (
    (fundosRes as unknown as { rows: FRow[] }).rows ?? []
  ).map((r) => ({
    fundoId: r.fundo_id,
    fundoNome: r.fundo_nome,
    taxaMensalBase: r.taxa_mensal,
    capitalExposto: r.capital_exposto,
    qtdOps: r.qtd_ops,
    qtdPendentes: r.qtd_pendentes,
    qtdAprovadasSeMan: r.qtd_aprov_manual,
    qtdAprovadasAuto: r.qtd_aprov_auto,
    qtdRecusadas: r.qtd_recusadas,
    faturasPagas: r.faturas_pagas,
    faturasTotal: r.faturas_total,
    totalDevidoFaturas: r.total_devido,
    totalPagoFaturas: r.total_pago,
    qtdRegrasAtivas: r.qtd_regras_ativas,
    qtdBlacklist: r.qtd_blacklist,
  }));

  // 5. Alertas críticos
  const alertas: AlertaCritico[] = [];

  // Alerta: construtora top devedora com >100k vencido
  if (topDevedoras[0] && topDevedoras[0].valorVencido > 100000) {
    alertas.push({
      tipo: "inadimplencia",
      titulo: `${topDevedoras[0].construtoraNome} — alto risco`,
      descricao: `${topDevedoras[0].parcelasVencidas} parcelas vencidas totalizando ${topDevedoras[0].valorVencido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${topDevedoras[0].diasMedioAtraso}d médio de atraso).`,
      href: `/admin/construtoras/${topDevedoras[0].construtoraId}`,
      severidade: "danger",
    });
  }

  // Alerta: faturas vencidas
  const faturasVenc = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd, COALESCE(SUM(valor_devido - valor_pago)::float, 0) AS valor
    FROM faturas_fundo
    WHERE status = 'vencida'
  `);
  const fv = (
    faturasVenc as unknown as { rows: { qtd: number; valor: number }[] }
  ).rows[0] ?? { qtd: 0, valor: 0 };
  if (fv.qtd > 0) {
    alertas.push({
      tipo: "fatura_vencida",
      titulo: `${fv.qtd} fatura${fv.qtd === 1 ? "" : "s"} vencida${fv.qtd === 1 ? "" : "s"}`,
      descricao: `${fv.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} pendente${fv.qtd === 1 ? "" : "s"} de fundos pra AQ.`,
      href: `/admin/faturas`,
      severidade: "warn",
    });
  }

  // Alerta: muitos docs marcados pra revisão
  const docsRev = await db.execute(sql`
    SELECT COUNT(*)::int AS qtd
    FROM documentos WHERE validacao_status = 'revisao'
  `);
  const dr = (
    docsRev as unknown as { rows: { qtd: number }[] }
  ).rows[0] ?? { qtd: 0 };
  if (dr.qtd > 10) {
    alertas.push({
      tipo: "doc_revisar",
      titulo: `${dr.qtd} documentos marcados pra revisão`,
      descricao: `A IA identificou docs com confiança baixa. Vale uma triagem.`,
      severidade: "warn",
    });
  }

  // Alerta: concentração — fundo com >40% capital exposto numa única construtora
  const concAlerts = await db.execute(sql`
    WITH expostos AS (
      SELECT
        o.fundo_id,
        o.construtora_id,
        SUM(o.valor_presente) AS valor
      FROM operacoes o
      WHERE o.fundo_id IS NOT NULL
        AND o.status IN ('pre_aprovada','analise_final','enviada_para_assinatura','enviada_para_pagamento','realizada')
      GROUP BY o.fundo_id, o.construtora_id
    ),
    totais AS (
      SELECT fundo_id, SUM(valor) AS total FROM expostos GROUP BY fundo_id
    )
    SELECT
      e.fundo_id::text AS fundo_id,
      e.construtora_id::text AS construtora_id,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      (e.valor / t.total)::float AS pct
    FROM expostos e
    INNER JOIN totais t ON t.fundo_id = e.fundo_id
    INNER JOIN fundos f ON f.id = e.fundo_id
    INNER JOIN construtoras c ON c.id = e.construtora_id
    WHERE e.valor / t.total > 0.4
    ORDER BY pct DESC
    LIMIT 5
  `);
  type ConcRow = {
    fundo_id: string;
    construtora_id: string;
    fundo_nome: string;
    construtora_nome: string;
    pct: number;
  };
  for (const c of (concAlerts as unknown as { rows: ConcRow[] }).rows ?? []) {
    alertas.push({
      tipo: "concentracao",
      titulo: `${c.fundo_nome} — concentração crítica`,
      descricao: `${(c.pct * 100).toFixed(0)}% do capital exposto em ${c.construtora_nome}.`,
      severidade: "danger",
    });
  }

  return {
    capitalExpostoTotal: k.capital_exposto,
    qtdFundosAtivos: k.fundos_ativos,
    qtdConstrutorasAtivas: k.construtoras_ativas,
    qtdVencidasGlobal: v.qtd,
    valorVencidoGlobal: v.valor,
    topDevedoras,
    comparativoFundos,
    alertas,
  };
}
