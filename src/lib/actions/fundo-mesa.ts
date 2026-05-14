"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  fundoRegrasAutoAprovacao,
  operacoes,
  type FundoRegraAuto,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";
import { getCurrentFundo } from "@/lib/actions/fundos";
import { computeScore } from "@/lib/scoring";
import { getScoreParams } from "@/lib/actions/settings";

export type OpPendente = {
  operacaoId: string;
  numero: string;
  construtoraId: string;
  construtoraNome: string | null;
  imobiliariaId: string | null;
  imobiliariaNome: string | null;
  corretorNome: string | null;
  valorComissao: number;
  valorPresente: number;
  juros: number;
  custos: number;
  taxaOpMensal: number;
  taxaFundoMensal: number;
  spread: number;
  spreadPct: number; // taxa_op − taxa_fundo em pontos %
  parteFundo: number;
  numeroParcelas: number;
  dataVenda: string;
  aprovadoEm: Date | null;
  /** Score 0–100 da construtora baseado em histórico no fundo */
  scoreConstrutora: number;
  /** Total de ops já feitas com essa construtora pelo fundo */
  opsComConstrutora: number;
  /** Quantos docs estão "ok" / "revisao" / não validados */
  docsStatus: { ok: number; revisao: number; semValidacao: number };
};

// computeScore + janela de "atraso grave" centralizados em scoring.ts e
// configuráveis em system_settings (admin/configuracoes).

/** Lista ops aguardando decisão do fundo (fundo_aprovacao = 'pendente'),
 *  ou ops com fundo vinculado em status pre/analise/assinatura sem decisão. */
export async function getOpsAguardandoFundo(): Promise<OpPendente[] | null> {
  const fundo = await getCurrentFundo();
  if (!fundo) return null;

  const scoreParams = await getScoreParams();

  const result = await db.execute(sql`
    SELECT
      o.id::text AS operacao_id,
      o.numero AS numero,
      o.construtora_id::text AS construtora_id,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      o.imobiliaria_id::text AS imobiliaria_id,
      COALESCE(im.nome_fantasia, im.razao_social) AS imobiliaria_nome,
      u.nome AS corretor_nome,
      o.valor_comissao::float AS valor_comissao,
      o.valor_presente::float AS valor_presente,
      o.desagio::float AS juros,
      COALESCE(custos.total, 0)::float AS custos,
      o.taxa_mensal::float AS taxa_op,
      COALESCE(o.taxa_fundo_snapshot, ${fundo.taxaMensalBase}, 0)::float AS taxa_fundo,
      COALESCE(o.numero_parcelas, 0)::int AS numero_parcelas,
      o.data_venda::text AS data_venda,
      o.aprovado_em AS aprovado_em,
      -- Histórico com a construtora
      (
        SELECT COUNT(*) FROM operacoes oo
        WHERE oo.fundo_id = ${fundo.id}::uuid
          AND oo.construtora_id = o.construtora_id
          AND oo.status IN ('enviada_para_pagamento','realizada')
      )::int AS ops_com_construtora,
      (
        SELECT COUNT(*) FROM parcelas_comissao pp
        INNER JOIN operacoes oo ON oo.id = pp.operacao_id
        WHERE oo.fundo_id = ${fundo.id}::uuid
          AND oo.construtora_id = o.construtora_id
      )::int AS total_parcelas_construtora,
      (
        SELECT COUNT(*) FROM parcelas_comissao pp
        INNER JOIN operacoes oo ON oo.id = pp.operacao_id
        WHERE oo.fundo_id = ${fundo.id}::uuid
          AND oo.construtora_id = o.construtora_id
          AND pp.status = 'vencida'
      )::int AS vencidas_construtora,
      (
        SELECT COUNT(*) FROM parcelas_comissao pp
        INNER JOIN operacoes oo ON oo.id = pp.operacao_id
        WHERE oo.fundo_id = ${fundo.id}::uuid
          AND oo.construtora_id = o.construtora_id
          AND pp.status = 'vencida'
          AND (CURRENT_DATE - pp.vencimento) > ${scoreParams.diasGrave}
      )::int AS vencidas_graves,
      -- Docs validados
      (
        SELECT COUNT(*) FROM documentos d
        WHERE d.operacao_id = o.id AND d.validacao_status = 'ok'
      )::int AS docs_ok,
      (
        SELECT COUNT(*) FROM documentos d
        WHERE d.operacao_id = o.id AND d.validacao_status = 'revisao'
      )::int AS docs_revisao,
      (
        SELECT COUNT(*) FROM documentos d
        WHERE d.operacao_id = o.id AND d.validacao_status IS NULL
      )::int AS docs_sem_val
    FROM operacoes o
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN users u ON u.id = o.corretor_user_id
    LEFT JOIN (
      SELECT operacao_id, SUM(valor) AS total
      FROM custos_operacao GROUP BY operacao_id
    ) custos ON custos.operacao_id = o.id
    WHERE o.fundo_id = ${fundo.id}::uuid
      AND o.fundo_aprovacao = 'pendente'
      AND o.status IN ('pre_aprovada','analise_final','enviada_para_assinatura')
    ORDER BY o.aprovado_em ASC NULLS LAST
  `);

  type Raw = {
    operacao_id: string;
    numero: string;
    construtora_id: string;
    construtora_nome: string | null;
    imobiliaria_id: string | null;
    imobiliaria_nome: string | null;
    corretor_nome: string | null;
    valor_comissao: number;
    valor_presente: number;
    juros: number;
    custos: number;
    taxa_op: number;
    taxa_fundo: number;
    numero_parcelas: number;
    data_venda: string;
    aprovado_em: Date | null;
    ops_com_construtora: number;
    total_parcelas_construtora: number;
    vencidas_construtora: number;
    vencidas_graves: number;
    docs_ok: number;
    docs_revisao: number;
    docs_sem_val: number;
  };
  const rows = (result as unknown as { rows: Raw[] }).rows ?? [];

  return rows.map((r) => {
    const razao = r.taxa_op > 0 ? Math.min(1, r.taxa_fundo / r.taxa_op) : 0;
    const custoDinheiro = r.juros * razao;
    const spread = Math.max(0, r.juros - custoDinheiro);
    const parteFundo = custoDinheiro + spread / 2;
    const scoreConstrutora = computeScore(
      {
        totalParcelas: r.total_parcelas_construtora,
        vencidas: r.vencidas_construtora,
        vencidasGraves: r.vencidas_graves,
      },
      scoreParams,
    );
    return {
      operacaoId: r.operacao_id,
      numero: r.numero,
      construtoraId: r.construtora_id,
      construtoraNome: r.construtora_nome,
      imobiliariaId: r.imobiliaria_id,
      imobiliariaNome: r.imobiliaria_nome,
      corretorNome: r.corretor_nome,
      valorComissao: r.valor_comissao,
      valorPresente: r.valor_presente,
      juros: r.juros,
      custos: r.custos,
      taxaOpMensal: r.taxa_op,
      taxaFundoMensal: r.taxa_fundo,
      spread,
      spreadPct: Math.max(0, r.taxa_op - r.taxa_fundo),
      parteFundo,
      numeroParcelas: r.numero_parcelas,
      dataVenda: r.data_venda,
      aprovadoEm: r.aprovado_em,
      scoreConstrutora,
      opsComConstrutora: r.ops_com_construtora,
      docsStatus: {
        ok: r.docs_ok,
        revisao: r.docs_revisao,
        semValidacao: r.docs_sem_val,
      },
    };
  });
}

/* =========================================
   APROVAÇÃO MANUAL DO FUNDO
   ========================================= */

export type DecisaoState =
  | { ok: false; error: string }
  | { ok: true; action: "aprovada" | "recusada" }
  | null;

export async function decidirOperacaoAction(
  _prev: DecisaoState,
  formData: FormData,
): Promise<DecisaoState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo")
    return { ok: false, error: "Não autorizado" };

  const fundo = await getCurrentFundo();
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const operacaoId = String(formData.get("operacaoId") || "").trim();
  const decisao = String(formData.get("decisao") || "").trim();
  const motivo = String(formData.get("motivo") || "").trim().slice(0, 500);

  if (!operacaoId) return { ok: false, error: "operacaoId obrigatório" };
  if (decisao !== "aprovada" && decisao !== "recusada")
    return { ok: false, error: "Decisão inválida" };
  if (decisao === "recusada" && !motivo)
    return { ok: false, error: "Motivo obrigatório pra recusar" };

  // Confirma que op é desse fundo
  const [op] = await db
    .select({ fundoId: operacoes.fundoId, numero: operacoes.numero })
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op || op.fundoId !== fundo.id) {
    return { ok: false, error: "Operação não pertence ao seu fundo" };
  }

  await db
    .update(operacoes)
    .set({
      fundoAprovacao: decisao,
      fundoAprovadoEm: new Date(),
      fundoAprovadoPorUserId: user.id,
      fundoRecusaMotivo: decisao === "recusada" ? motivo : null,
      updatedAt: new Date(),
    })
    .where(eq(operacoes.id, operacaoId));

  await audit({
    action: `fundo_decisao_${decisao}`,
    targetType: "operacao",
    targetId: operacaoId,
    targetLabel: op.numero,
    metadata: { fundoId: fundo.id, motivo: motivo || null },
  });

  // Webhook externo (fundo_decisao)
  {
    const [opFull] = await db
      .select({
        id: operacoes.id,
        numero: operacoes.numero,
        construtoraId: operacoes.construtoraId,
        valorComissao: operacoes.valorComissao,
      })
      .from(operacoes)
      .where(eq(operacoes.id, operacaoId))
      .limit(1);
    if (opFull) {
      const { enqueueWebhookEvento } = await import("@/lib/actions/webhooks");
      enqueueWebhookEvento({
        evento: "fundo_decisao",
        fundoId: fundo.id,
        payload: {
          operacaoId: opFull.id,
          operacaoNumero: opFull.numero,
          construtoraId: opFull.construtoraId,
          fundoId: fundo.id,
          decisao,
          motivo: motivo || null,
          valorComissao: parseFloat(opFull.valorComissao),
          decididoEm: new Date().toISOString(),
        },
      }).catch((e) =>
        console.error("[webhook] fundo_decisao:", e),
      );
    }
  }

  revalidatePath("/painel/aprovar");
  revalidatePath("/painel");
  return { ok: true, action: decisao };
}

/* =========================================
   REGRAS DE AUTO-APROVAÇÃO
   ========================================= */

export type RegraInput = {
  nome: string;
  taxaMinima?: number; // 0–1
  prazoMaximoMeses?: number;
  valorMaximoComissao?: number;
  construtorasIds?: string[];
};

export async function listRegrasFundo(): Promise<FundoRegraAuto[]> {
  const fundo = await getCurrentFundo();
  if (!fundo) return [];
  return db
    .select()
    .from(fundoRegrasAutoAprovacao)
    .where(eq(fundoRegrasAutoAprovacao.fundoId, fundo.id))
    .orderBy(asc(fundoRegrasAutoAprovacao.prioridade));
}

export type RegraState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

export async function criarRegraAction(
  _prev: RegraState,
  formData: FormData,
): Promise<RegraState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo")
    return { ok: false, error: "Não autorizado" };
  const fundo = await getCurrentFundo();
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const nome = String(formData.get("nome") || "").trim().slice(0, 100);
  if (!nome) return { ok: false, error: "Nome obrigatório" };

  const taxaMinRaw = String(formData.get("taxaMinima") || "").trim();
  let taxaMinima: string | null = null;
  if (taxaMinRaw) {
    const n = parseFloat(taxaMinRaw.replace("%", "").replace(",", "."));
    if (Number.isFinite(n)) {
      const dec = n >= 0.5 ? n / 100 : n;
      if (dec > 0 && dec < 1) taxaMinima = dec.toFixed(4);
    }
  }

  const prazoMax = parseInt(String(formData.get("prazoMaximoMeses") || ""), 10);
  const valorMax = parseFloat(
    String(formData.get("valorMaximoComissao") || "")
      .replace(/\./g, "")
      .replace(",", "."),
  );

  const construtorasRaw = String(formData.get("construtorasIds") || "").trim();
  let construtorasIds: string[] | null = null;
  if (construtorasRaw) {
    construtorasIds = construtorasRaw.split(",").map((s) => s.trim()).filter(Boolean);
    if (construtorasIds.length === 0) construtorasIds = null;
  }

  const [created] = await db
    .insert(fundoRegrasAutoAprovacao)
    .values({
      fundoId: fundo.id,
      nome,
      taxaMinima: taxaMinima ?? undefined,
      prazoMaximoMeses: Number.isFinite(prazoMax) && prazoMax > 0 ? prazoMax : null,
      valorMaximoComissao:
        Number.isFinite(valorMax) && valorMax > 0 ? valorMax.toFixed(2) : null,
      construtorasIds,
    })
    .returning({ id: fundoRegrasAutoAprovacao.id });

  await audit({
    action: "fundo_regra_criada",
    targetType: "fundo_regra",
    targetId: created.id,
    metadata: { fundoId: fundo.id, nome },
  });

  revalidatePath("/painel/regras");
  return { ok: true, id: created.id };
}

export type ToggleRegraState =
  | { ok: false; error: string }
  | { ok: true; ativa: boolean }
  | null;

export async function toggleRegraAction(
  _prev: ToggleRegraState,
  formData: FormData,
): Promise<ToggleRegraState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo")
    return { ok: false, error: "Não autorizado" };
  const fundo = await getCurrentFundo();
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const id = String(formData.get("id") || "").trim();
  if (!id) return { ok: false, error: "ID obrigatório" };

  const [regra] = await db
    .select()
    .from(fundoRegrasAutoAprovacao)
    .where(
      and(
        eq(fundoRegrasAutoAprovacao.id, id),
        eq(fundoRegrasAutoAprovacao.fundoId, fundo.id),
      ),
    )
    .limit(1);
  if (!regra) return { ok: false, error: "Regra não encontrada" };

  const novaAtiva = !regra.ativa;
  await db
    .update(fundoRegrasAutoAprovacao)
    .set({ ativa: novaAtiva, updatedAt: new Date() })
    .where(eq(fundoRegrasAutoAprovacao.id, id));

  revalidatePath("/painel/regras");
  return { ok: true, ativa: novaAtiva };
}

export async function deletarRegraAction(
  _prev: ToggleRegraState,
  formData: FormData,
): Promise<ToggleRegraState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "fundo")
    return { ok: false, error: "Não autorizado" };
  const fundo = await getCurrentFundo();
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const id = String(formData.get("id") || "").trim();
  await db
    .delete(fundoRegrasAutoAprovacao)
    .where(
      and(
        eq(fundoRegrasAutoAprovacao.id, id),
        eq(fundoRegrasAutoAprovacao.fundoId, fundo.id),
      ),
    );

  revalidatePath("/painel/regras");
  return { ok: true, ativa: false };
}

/* =========================================
   AVALIAÇÃO AUTOMÁTICA — chamada pelo status-flow quando fundo é vinculado
   ========================================= */

export type AvaliacaoAutoInput = {
  fundoId: string;
  construtoraId: string;
  taxaMensalOp: number;
  valorComissao: number;
  numeroParcelas: number;
};

export type AvaliacaoAutoResult = {
  aprovada: boolean;
  regraId: string | null;
  regraNome: string | null;
};

export async function avaliarRegrasAutoAprovacao(
  input: AvaliacaoAutoInput,
): Promise<AvaliacaoAutoResult> {
  const regras = await db
    .select()
    .from(fundoRegrasAutoAprovacao)
    .where(
      and(
        eq(fundoRegrasAutoAprovacao.fundoId, input.fundoId),
        eq(fundoRegrasAutoAprovacao.ativa, true),
      ),
    )
    .orderBy(asc(fundoRegrasAutoAprovacao.prioridade));

  for (const r of regras) {
    if (
      r.taxaMinima !== null &&
      input.taxaMensalOp < parseFloat(r.taxaMinima)
    ) {
      continue;
    }
    if (
      r.prazoMaximoMeses !== null &&
      input.numeroParcelas > r.prazoMaximoMeses
    ) {
      continue;
    }
    if (
      r.valorMaximoComissao !== null &&
      input.valorComissao > parseFloat(r.valorMaximoComissao)
    ) {
      continue;
    }
    if (
      r.construtorasIds !== null &&
      Array.isArray(r.construtorasIds) &&
      r.construtorasIds.length > 0 &&
      !r.construtorasIds.includes(input.construtoraId)
    ) {
      continue;
    }
    // Atendeu — auto-aprova
    await db
      .update(fundoRegrasAutoAprovacao)
      .set({
        contadorAcionamentos: sql`${fundoRegrasAutoAprovacao.contadorAcionamentos} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(fundoRegrasAutoAprovacao.id, r.id));
    return { aprovada: true, regraId: r.id, regraNome: r.nome };
  }

  return { aprovada: false, regraId: null, regraNome: null };
}
