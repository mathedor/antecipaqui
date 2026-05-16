"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { comercialInteracoes } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { getDefaultsByComercial } from "@/lib/actions/comercial-templates";
import { aplicarTemplate } from "@/lib/comercial-templates-types";
import { formatBRLcompact } from "@/lib/format";

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

/* ============================================================
   FOCO DO DIA — lista priorizada de ações concretas
   ============================================================ */

export type FocoItem = {
  key: string;
  prioridade: number; // menor = mais urgente
  titulo: string;
  descricao: string;
  /** Pra contato direto. */
  alvoTipo: "imobiliaria" | "construtora" | "corretor";
  alvoId: string;
  alvoNome: string;
  telefone: string | null;
  /** Tipo de ação: 'reativar' | 'parabenizar' | 'investigar' | 'empurrar' | 'novo_cadastro' | 'aniversario'. */
  tipo: string;
  /** Sugestão de mensagem WhatsApp já formatada (sem URL encode). */
  msgSugerida: string;
};

export async function getComercialFocoDoDia(
  comercialId: string,
): Promise<FocoItem[]> {
  await requireActiveUser();

  const items: FocoItem[] = [];
  const templatesDefault = await getDefaultsByComercial(comercialId);

  // Helper que escolhe template do comercial ou cai no fallback.
  const msg = (
    tipo: string,
    fallback: string,
    vars: Record<string, string | number | undefined> = {},
  ): string => {
    const t = templatesDefault.get(tipo);
    return t ? aplicarTemplate(t, vars) : fallback;
  };

  // 1) Imobiliárias dormidas (+60d sem op) — reativar
  const dormidasRes = await db.execute(sql`
    SELECT
      i.id, i.razao_social, i.telefone,
      EXTRACT(DAY FROM (NOW() - MAX(o.created_at)))::int AS dias_inativa,
      COUNT(o.id)::int AS qtd_total
    FROM imobiliarias i
    LEFT JOIN operacoes o ON o.imobiliaria_id = i.id
      AND o.status NOT IN ('rascunho','recusada','cancelada')
    WHERE i.comercial_id = ${comercialId}::uuid
    GROUP BY i.id, i.razao_social, i.telefone
    HAVING MAX(o.created_at) IS NOT NULL
       AND MAX(o.created_at) < NOW() - INTERVAL '60 days'
    ORDER BY MAX(o.created_at) ASC
    LIMIT 5
  `);
  for (const r of extractRows<{
    id: string;
    razao_social: string;
    telefone: string | null;
    dias_inativa: number;
    qtd_total: number;
  }>(dormidasRes)) {
    items.push({
      key: `dormida_${r.id}`,
      prioridade: r.dias_inativa > 90 ? 1 : 2,
      titulo: `${r.razao_social} está fria há ${r.dias_inativa} dias`,
      descricao: `${r.qtd_total} op(s) no histórico. Bora reativar — um WhatsApp resolve.`,
      alvoTipo: "imobiliaria",
      alvoId: r.id,
      alvoNome: r.razao_social,
      telefone: r.telefone,
      tipo: "reativar",
      msgSugerida: msg(
        "reativar",
        `Oi! Tudo bem por aí? Notei que faz um tempo que a ${r.razao_social} não cadastra uma operação na Antecipaqui. Tem alguma comissão parcelada do mês que dá pra adiantar? Tô à disposição se precisar.`,
        {
          nome: r.razao_social,
          empresa: r.razao_social,
          dias_inativa: r.dias_inativa,
        },
      ),
    });
  }

  // 2) Imobiliárias cadastradas sem nenhuma op ainda (>15d) — converter
  const semOpRes = await db.execute(sql`
    SELECT
      i.id, i.razao_social, i.telefone,
      EXTRACT(DAY FROM (NOW() - i.created_at))::int AS dias_cadastrada
    FROM imobiliarias i
    LEFT JOIN operacoes o ON o.imobiliaria_id = i.id
      AND o.status NOT IN ('rascunho','recusada','cancelada')
    WHERE i.comercial_id = ${comercialId}::uuid
      AND i.created_at < NOW() - INTERVAL '15 days'
    GROUP BY i.id, i.razao_social, i.telefone, i.created_at
    HAVING COUNT(o.id) = 0
    ORDER BY i.created_at ASC
    LIMIT 5
  `);
  for (const r of extractRows<{
    id: string;
    razao_social: string;
    telefone: string | null;
    dias_cadastrada: number;
  }>(semOpRes)) {
    items.push({
      key: `semop_${r.id}`,
      prioridade: 2,
      titulo: `${r.razao_social} cadastrou há ${r.dias_cadastrada}d e nunca operou`,
      descricao: `Onboarding não engatou. Vale uma visita ou call de demonstração.`,
      alvoTipo: "imobiliaria",
      alvoId: r.id,
      alvoNome: r.razao_social,
      telefone: r.telefone,
      tipo: "investigar",
      msgSugerida: msg(
        "investigar",
        `Oi! Você se cadastrou na Antecipaqui há um tempo e ainda não fez nenhuma operação. Tem alguma dúvida? Posso te mostrar em 10 minutos como funciona — qual o melhor horário pra gente conversar?`,
        { nome: r.razao_social, empresa: r.razao_social },
      ),
    });
  }

  // 3) Operações travadas há +4d em algum estágio — empurrar
  const travadasRes = await db.execute(sql`
    SELECT
      o.id, o.numero, o.status,
      EXTRACT(DAY FROM (NOW() - o.updated_at))::int AS dias_parada,
      c.id AS construtora_id, c.razao_social AS construtora_nome, c.telefone AS construtora_tel,
      i.id AS imob_id, i.razao_social AS imob_nome, i.telefone AS imob_tel
    FROM operacoes o
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias i ON i.id = o.imobiliaria_id
    WHERE o.comercial_id = ${comercialId}::uuid
      AND o.status IN ('aguardando_aprovacao','documentos_incompletos','pre_aprovada','analise_final','enviada_para_assinatura')
      AND o.updated_at < NOW() - INTERVAL '4 days'
    ORDER BY o.updated_at ASC
    LIMIT 5
  `);
  for (const r of extractRows<{
    id: string;
    numero: string;
    status: string;
    dias_parada: number;
    construtora_id: string | null;
    construtora_nome: string | null;
    construtora_tel: string | null;
    imob_id: string | null;
    imob_nome: string | null;
    imob_tel: string | null;
  }>(travadasRes)) {
    // Alvo do empurrão: depende do status
    const alvoEhConstrutora = ["enviada_para_assinatura"].includes(r.status);
    const alvoTipo = alvoEhConstrutora ? "construtora" : "imobiliaria";
    const alvoId = alvoEhConstrutora ? r.construtora_id : r.imob_id;
    const alvoNome = alvoEhConstrutora ? r.construtora_nome : r.imob_nome;
    const tel = alvoEhConstrutora ? r.construtora_tel : r.imob_tel;
    if (!alvoId || !alvoNome) continue;
    items.push({
      key: `travada_${r.id}`,
      prioridade: r.dias_parada > 7 ? 1 : 2,
      titulo: `Op ${r.numero} parada há ${r.dias_parada}d`,
      descricao: `Status: ${r.status.replace(/_/g, " ")}. Empurrar ${alvoTipo} pra destravar.`,
      alvoTipo: alvoTipo as "construtora" | "imobiliaria",
      alvoId,
      alvoNome,
      telefone: tel,
      tipo: "empurrar",
      msgSugerida: msg(
        "empurrar",
        alvoEhConstrutora
          ? `Oi! A operação ${r.numero} está aguardando sua assinatura há ${r.dias_parada} dias. Conseguimos destravar hoje? Qualquer dúvida, manda mensagem.`
          : `Oi! A operação ${r.numero} tá parada há ${r.dias_parada} dias precisando de uma ação sua (documentos ou ajuste). Posso te ajudar a destravar?`,
        {
          nome: alvoNome,
          empresa: alvoNome,
          numero_op: r.numero,
          dias_inativa: r.dias_parada,
        },
      ),
    });
  }

  // 4) Primeira op aprovada/realizada nas últimas 7d — parabenizar
  const primeiraOpRes = await db.execute(sql`
    WITH primeira AS (
      SELECT
        o.id, o.numero, o.valor_presente::float AS vp, o.aprovado_em,
        i.id AS imob_id, i.razao_social AS imob_nome, i.telefone AS imob_tel,
        ROW_NUMBER() OVER (PARTITION BY o.imobiliaria_id ORDER BY o.aprovado_em ASC) AS rn
      FROM operacoes o
      INNER JOIN imobiliarias i ON i.id = o.imobiliaria_id
      WHERE o.comercial_id = ${comercialId}::uuid
        AND o.status IN ('enviada_para_pagamento','realizada')
        AND o.aprovado_em IS NOT NULL
    )
    SELECT id, numero, vp, imob_id, imob_nome, imob_tel
    FROM primeira
    WHERE rn = 1 AND aprovado_em >= NOW() - INTERVAL '7 days'
    ORDER BY aprovado_em DESC
    LIMIT 3
  `);
  for (const r of extractRows<{
    id: string;
    numero: string;
    vp: number;
    imob_id: string;
    imob_nome: string;
    imob_tel: string | null;
  }>(primeiraOpRes)) {
    items.push({
      key: `primeira_${r.id}`,
      prioridade: 3,
      titulo: `1ª op aprovada: ${r.imob_nome}`,
      descricao: `Op ${r.numero} de R$ ${r.vp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Parabenize — relacionamento.`,
      alvoTipo: "imobiliaria",
      alvoId: r.imob_id,
      alvoNome: r.imob_nome,
      telefone: r.imob_tel,
      tipo: "parabenizar",
      msgSugerida: msg(
        "parabenizar",
        `Parabéns pela primeira operação na Antecipaqui! 🎉 Op ${r.numero} aprovada. Qualquer dúvida no processo é só chamar.`,
        {
          nome: r.imob_nome,
          empresa: r.imob_nome,
          numero_op: r.numero,
          valor_op: formatBRLcompact(r.vp),
        },
      ),
    });
  }

  // 5) Construtoras com >2 ops recusadas nos últimos 30d — investigar
  const recusasRes = await db.execute(sql`
    SELECT
      c.id, c.razao_social, c.telefone,
      COUNT(*)::int AS qtd_recusa
    FROM operacoes o
    INNER JOIN construtoras c ON c.id = o.construtora_id
    WHERE o.comercial_id = ${comercialId}::uuid
      AND o.status = 'recusada'
      AND o.updated_at >= NOW() - INTERVAL '30 days'
    GROUP BY c.id, c.razao_social, c.telefone
    HAVING COUNT(*) >= 2
    ORDER BY COUNT(*) DESC
    LIMIT 3
  `);
  for (const r of extractRows<{
    id: string;
    razao_social: string;
    telefone: string | null;
    qtd_recusa: number;
  }>(recusasRes)) {
    items.push({
      key: `recusa_${r.id}`,
      prioridade: 2,
      titulo: `${r.razao_social} teve ${r.qtd_recusa} ops recusadas em 30d`,
      descricao: `Algo travando — vale conversar pra entender o motivo e ajustar.`,
      alvoTipo: "construtora",
      alvoId: r.id,
      alvoNome: r.razao_social,
      telefone: r.telefone,
      tipo: "investigar",
      msgSugerida: msg(
        "investigar",
        `Oi! Vi que as últimas operações da ${r.razao_social} foram recusadas. Quero entender o que tá pegando pra te ajudar a destravar — tem 10 min hoje pra gente falar?`,
        { nome: r.razao_social, empresa: r.razao_social },
      ),
    });
  }

  // 6) Follow-ups marcados pra hoje ou atrasados
  const followupsRes = await db.execute(sql`
    SELECT
      id, alvo_tipo, alvo_id, alvo_nome, proxima_acao_em, proxima_acao_texto,
      (CURRENT_DATE - proxima_acao_em)::int AS dias_atraso
    FROM comercial_interacoes
    WHERE comercial_id = ${comercialId}::uuid
      AND proxima_acao_em IS NOT NULL
      AND proxima_acao_em <= CURRENT_DATE
    ORDER BY proxima_acao_em ASC
    LIMIT 5
  `);
  for (const r of extractRows<{
    id: string;
    alvo_tipo: string;
    alvo_id: string;
    alvo_nome: string | null;
    proxima_acao_em: string;
    proxima_acao_texto: string | null;
    dias_atraso: number;
  }>(followupsRes)) {
    items.push({
      key: `followup_${r.id}`,
      prioridade: r.dias_atraso > 0 ? 1 : 2,
      titulo:
        r.dias_atraso > 0
          ? `Follow-up atrasado ${r.dias_atraso}d: ${r.alvo_nome ?? "—"}`
          : `Follow-up hoje: ${r.alvo_nome ?? "—"}`,
      descricao: r.proxima_acao_texto ?? "Você marcou um follow-up.",
      alvoTipo: r.alvo_tipo as "imobiliaria" | "construtora" | "corretor",
      alvoId: r.alvo_id,
      alvoNome: r.alvo_nome ?? "—",
      telefone: null,
      tipo: "followup",
      msgSugerida: msg(
        "followup",
        `Oi! Conforme combinamos, tô retomando contato. ${r.proxima_acao_texto ?? ""}`,
        { nome: r.alvo_nome ?? "" },
      ),
    });
  }

  return items.sort((a, b) => a.prioridade - b.prioridade).slice(0, 8);
}

/* ============================================================
   META AUTOMÁTICA — 120% do mês anterior (volume ops + comissão)
   ============================================================ */

export type ComercialMeta = {
  metaVolume: number;
  metaComissao: number;
  realVolume: number;
  realComissao: number;
  pctVolume: number; // 0–1+
  pctComissao: number;
  diasDecorridos: number;
  diasTotaisMes: number;
  /** Projeção linear: se mantiver o ritmo até fim do mês. */
  projecaoVolume: number;
  projecaoComissao: number;
  mesAnteriorVolume: number;
  mesAnteriorComissao: number;
};

export async function getComercialMeta(
  comercialId: string,
): Promise<ComercialMeta> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH
    mes_atual AS (
      SELECT
        COALESCE(SUM(o.valor_presente)::float, 0) AS volume,
        COALESCE(SUM(cc.valor_devido)::float, 0) AS comissao
      FROM operacoes o
      LEFT JOIN comissoes_comercial cc ON cc.operacao_id = o.id
      WHERE o.comercial_id = ${comercialId}::uuid
        AND date_trunc('month', o.created_at) = date_trunc('month', CURRENT_DATE)
        AND o.status NOT IN ('rascunho','recusada','cancelada')
    ),
    mes_anterior AS (
      SELECT
        COALESCE(SUM(o.valor_presente)::float, 0) AS volume,
        COALESCE(SUM(cc.valor_devido)::float, 0) AS comissao
      FROM operacoes o
      LEFT JOIN comissoes_comercial cc ON cc.operacao_id = o.id
      WHERE o.comercial_id = ${comercialId}::uuid
        AND date_trunc('month', o.created_at) = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND o.status NOT IN ('rascunho','recusada','cancelada')
    )
    SELECT
      (SELECT volume FROM mes_atual)::float AS atual_volume,
      (SELECT comissao FROM mes_atual)::float AS atual_comissao,
      (SELECT volume FROM mes_anterior)::float AS prev_volume,
      (SELECT comissao FROM mes_anterior)::float AS prev_comissao,
      EXTRACT(DAY FROM CURRENT_DATE)::int AS dia_atual,
      EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int AS dias_no_mes
  `);
  const row =
    extractRows<{
      atual_volume: number;
      atual_comissao: number;
      prev_volume: number;
      prev_comissao: number;
      dia_atual: number;
      dias_no_mes: number;
    }>(res)[0] ?? {
      atual_volume: 0,
      atual_comissao: 0,
      prev_volume: 0,
      prev_comissao: 0,
      dia_atual: 1,
      dias_no_mes: 30,
    };

  // Meta default: 120% do mês anterior. Se mês anterior = 0, meta = max(50k, 1.2 * atual).
  const metaVolume = Math.max(row.prev_volume * 1.2, row.prev_volume > 0 ? 0 : 50000);
  const metaComissao = Math.max(
    row.prev_comissao * 1.2,
    row.prev_comissao > 0 ? 0 : 500,
  );

  // Projeção linear
  const fator = row.dia_atual > 0 ? row.dias_no_mes / row.dia_atual : 1;
  const projecaoVolume = row.atual_volume * fator;
  const projecaoComissao = row.atual_comissao * fator;

  return {
    metaVolume,
    metaComissao,
    realVolume: row.atual_volume,
    realComissao: row.atual_comissao,
    pctVolume: metaVolume > 0 ? row.atual_volume / metaVolume : 0,
    pctComissao: metaComissao > 0 ? row.atual_comissao / metaComissao : 0,
    diasDecorridos: row.dia_atual,
    diasTotaisMes: row.dias_no_mes,
    projecaoVolume,
    projecaoComissao,
    mesAnteriorVolume: row.prev_volume,
    mesAnteriorComissao: row.prev_comissao,
  };
}

/* ============================================================
   CARTEIRA VIVA — imobiliárias com temperatura
   ============================================================ */

export type CarteiraEntry = {
  id: string;
  nome: string;
  telefone: string | null;
  /** "quente" | "morna" | "fria" | "dormida" | "nova". */
  temperatura: string;
  diasInativa: number | null;
  qtdOps: number;
  valorTotal: number;
  ticketMedio: number;
  ultimaInteracao: string | null;
  ultimaInteracaoTipo: string | null;
};

export async function getComercialCarteira(
  comercialId: string,
): Promise<CarteiraEntry[]> {
  await requireActiveUser();

  const res = await db.execute(sql`
    SELECT
      i.id, i.razao_social AS nome, i.telefone,
      COUNT(o.id)::int AS qtd_ops,
      COALESCE(SUM(o.valor_presente)::float, 0) AS valor_total,
      COALESCE(AVG(o.valor_presente)::float, 0) AS ticket_medio,
      MAX(o.created_at) AS ultima_op,
      EXTRACT(DAY FROM (NOW() - COALESCE(MAX(o.created_at), i.created_at)))::int AS dias_inativa,
      (
        SELECT MAX(ci.created_at)::text FROM comercial_interacoes ci
        WHERE ci.comercial_id = ${comercialId}::uuid
          AND ci.alvo_tipo = 'imobiliaria'
          AND ci.alvo_id = i.id::text
      ) AS ultima_interacao,
      (
        SELECT ci.tipo FROM comercial_interacoes ci
        WHERE ci.comercial_id = ${comercialId}::uuid
          AND ci.alvo_tipo = 'imobiliaria'
          AND ci.alvo_id = i.id::text
        ORDER BY ci.created_at DESC LIMIT 1
      ) AS ultima_interacao_tipo
    FROM imobiliarias i
    LEFT JOIN operacoes o ON o.imobiliaria_id = i.id
      AND o.status NOT IN ('rascunho','recusada','cancelada')
    WHERE i.comercial_id = ${comercialId}::uuid
    GROUP BY i.id, i.razao_social, i.telefone, i.created_at
    ORDER BY
      CASE
        WHEN MAX(o.created_at) IS NULL THEN 4
        WHEN EXTRACT(DAY FROM (NOW() - MAX(o.created_at))) > 90 THEN 0
        WHEN EXTRACT(DAY FROM (NOW() - MAX(o.created_at))) > 60 THEN 1
        WHEN EXTRACT(DAY FROM (NOW() - MAX(o.created_at))) > 30 THEN 2
        ELSE 3
      END,
      dias_inativa DESC
  `);

  return extractRows<{
    id: string;
    nome: string;
    telefone: string | null;
    qtd_ops: number;
    valor_total: number;
    ticket_medio: number;
    dias_inativa: number;
    ultima_op: string | null;
    ultima_interacao: string | null;
    ultima_interacao_tipo: string | null;
  }>(res).map((r) => {
    let temp: string;
    if (r.qtd_ops === 0) temp = "nova";
    else if (r.dias_inativa > 90) temp = "dormida";
    else if (r.dias_inativa > 60) temp = "fria";
    else if (r.dias_inativa > 30) temp = "morna";
    else temp = "quente";

    return {
      id: r.id,
      nome: r.nome,
      telefone: r.telefone,
      temperatura: temp,
      diasInativa: r.qtd_ops > 0 ? r.dias_inativa : null,
      qtdOps: r.qtd_ops,
      valorTotal: r.valor_total,
      ticketMedio: r.ticket_medio,
      ultimaInteracao: r.ultima_interacao,
      ultimaInteracaoTipo: r.ultima_interacao_tipo,
    };
  });
}

/* ============================================================
   PROJEÇÃO PESSOAL — calendário comissão + cenários
   ============================================================ */

export type ProjecaoComercial = {
  ganhoSeManter: number; // próximos 90d
  ganhoSeReativar30Pct: number; // se reativar 30% das dormidas + estimar 1 op cada com ticket médio
  ganhoSeCadaQuenteFizerMais1: number;
};

export async function getComercialProjecoes(
  comercialId: string,
): Promise<ProjecaoComercial> {
  await requireActiveUser();

  const res = await db.execute(sql`
    WITH
    ganho_proj AS (
      SELECT COALESCE(SUM(cc.valor_devido - cc.valor_pago)::float, 0) AS valor
      FROM comissoes_comercial cc
      WHERE cc.comercial_id = ${comercialId}::uuid
        AND cc.status = 'pendente'
    ),
    media_comissao AS (
      SELECT COALESCE(AVG(cc.valor_devido)::float, 0) AS valor
      FROM comissoes_comercial cc
      INNER JOIN operacoes o ON o.id = cc.operacao_id
      WHERE cc.comercial_id = ${comercialId}::uuid
        AND o.created_at >= NOW() - INTERVAL '180 days'
    ),
    dormidas_qtd AS (
      SELECT COUNT(*)::int AS qtd
      FROM imobiliarias i
      LEFT JOIN operacoes o ON o.imobiliaria_id = i.id
        AND o.status NOT IN ('rascunho','recusada','cancelada')
      WHERE i.comercial_id = ${comercialId}::uuid
      GROUP BY i.id
      HAVING MAX(o.created_at) IS NOT NULL
         AND MAX(o.created_at) < NOW() - INTERVAL '60 days'
    ),
    quentes_qtd AS (
      SELECT COUNT(*)::int AS qtd
      FROM imobiliarias i
      LEFT JOIN operacoes o ON o.imobiliaria_id = i.id
        AND o.status NOT IN ('rascunho','recusada','cancelada')
      WHERE i.comercial_id = ${comercialId}::uuid
      GROUP BY i.id
      HAVING MAX(o.created_at) >= NOW() - INTERVAL '30 days'
    )
    SELECT
      (SELECT valor FROM ganho_proj)::float AS ganho_manter,
      (SELECT valor FROM media_comissao)::float AS media_comissao,
      (SELECT COUNT(*)::int FROM dormidas_qtd) AS dormidas,
      (SELECT COUNT(*)::int FROM quentes_qtd) AS quentes
  `);
  const row =
    extractRows<{
      ganho_manter: number;
      media_comissao: number;
      dormidas: number;
      quentes: number;
    }>(res)[0] ?? { ganho_manter: 0, media_comissao: 0, dormidas: 0, quentes: 0 };

  const reativar30Pct = Math.floor(row.dormidas * 0.3);
  return {
    ganhoSeManter: row.ganho_manter,
    ganhoSeReativar30Pct: reativar30Pct * row.media_comissao,
    ganhoSeCadaQuenteFizerMais1: row.quentes * row.media_comissao,
  };
}

/* ============================================================
   REGISTRO DE INTERAÇÃO
   ============================================================ */

export async function registrarInteracao(input: {
  comercialId: string;
  alvoTipo: "imobiliaria" | "construtora" | "corretor";
  alvoId: string;
  alvoNome: string;
  tipo: "visita" | "ligacao" | "whatsapp" | "email" | "anotacao";
  descricao: string;
  proximaAcaoEm?: string | null;
  proximaAcaoTexto?: string | null;
}) {
  await requireActiveUser();

  await db.insert(comercialInteracoes).values({
    comercialId: input.comercialId,
    alvoTipo: input.alvoTipo,
    alvoId: input.alvoId,
    alvoNome: input.alvoNome,
    tipo: input.tipo,
    descricao: input.descricao,
    proximaAcaoEm: input.proximaAcaoEm ?? null,
    proximaAcaoTexto: input.proximaAcaoTexto ?? null,
  });

  revalidatePath("/painel");
  return { ok: true };
}

/** Marca um follow-up como concluído (apaga ou só re-registra com nova ação). */
export async function concluirFollowup(input: {
  interacaoId: string;
  comercialId: string;
}) {
  await requireActiveUser();
  await db
    .update(comercialInteracoes)
    .set({ proximaAcaoEm: null, proximaAcaoTexto: null })
    .where(
      and(
        eq(comercialInteracoes.id, input.interacaoId),
        eq(comercialInteracoes.comercialId, input.comercialId),
      ),
    );
  revalidatePath("/painel");
  return { ok: true };
}
