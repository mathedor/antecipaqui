"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";
import { getScoresBatchConstrutoras, type ScoreItem } from "@/lib/scoring";

export type AdminOpDecidir = {
  operacaoId: string;
  numero: string;
  status: string;
  construtoraId: string;
  construtoraNome: string | null;
  imobiliariaNome: string | null;
  corretorNome: string | null;
  fundoId: string | null;
  fundoNome: string | null;
  valorComissao: number;
  valorPresente: number;
  juros: number;
  custos: number;
  taxaOpMensal: number;
  taxaFundoMensal: number;
  spread: number;
  spreadPctMensal: number; // taxa_op - taxa_fundo
  resultadoAQ: number;
  numeroParcelas: number;
  dataVenda: string;
  createdAt: Date;
  /** Score da construtora no contexto GLOBAL */
  scoreConstrutora: ScoreItem;
  /** Status de docs validados por IA */
  docsStatus: { ok: number; revisao: number; semValidacao: number; total: number };
  /** Decisão do fundo (se já passou pelo fundo) */
  fundoAprovacao: string | null;
  fundoRecusaMotivo: string | null;
};

/** Carrega ops esperando decisão do admin. Filtra por status do fluxo de
 *  aprovação (não considera estados terminais). */
export async function getOpsAguardandoAdmin(opts?: {
  status?: string[];
}): Promise<AdminOpDecidir[]> {
  await requireAdmin();

  const statusFiltro = opts?.status ?? [
    "aguardando_aprovacao",
    "documentos_incompletos",
    "pre_aprovada",
    "analise_final",
    "enviada_para_assinatura",
  ];

  const result = await db.execute(sql`
    SELECT
      o.id::text AS operacao_id,
      o.numero,
      o.status,
      o.construtora_id::text AS construtora_id,
      COALESCE(c.nome_fantasia, c.razao_social) AS construtora_nome,
      COALESCE(im.nome_fantasia, im.razao_social) AS imobiliaria_nome,
      u.nome AS corretor_nome,
      o.fundo_id::text AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome,
      o.valor_comissao::float AS valor_comissao,
      o.valor_presente::float AS valor_presente,
      o.desagio::float AS juros,
      COALESCE(custos.total, 0)::float AS custos,
      o.taxa_mensal::float AS taxa_op,
      COALESCE(o.taxa_fundo_snapshot, f.taxa_mensal_base, 0)::float AS taxa_fundo,
      COALESCE(o.numero_parcelas, 0)::int AS numero_parcelas,
      o.data_venda::text AS data_venda,
      o.created_at AS created_at,
      o.fundo_aprovacao,
      o.fundo_recusa_motivo,
      (
        SELECT COUNT(*) FROM documentos d
        WHERE d.operacao_id = o.id
      )::int AS docs_total,
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
    LEFT JOIN fundos f ON f.id = o.fundo_id
    LEFT JOIN (
      SELECT operacao_id, SUM(valor) AS total
      FROM custos_operacao GROUP BY operacao_id
    ) custos ON custos.operacao_id = o.id
    WHERE o.status = ANY(${statusFiltro})
    ORDER BY o.created_at ASC
  `);

  type Raw = {
    operacao_id: string;
    numero: string;
    status: string;
    construtora_id: string;
    construtora_nome: string | null;
    imobiliaria_nome: string | null;
    corretor_nome: string | null;
    fundo_id: string | null;
    fundo_nome: string | null;
    valor_comissao: number;
    valor_presente: number;
    juros: number;
    custos: number;
    taxa_op: number;
    taxa_fundo: number;
    numero_parcelas: number;
    data_venda: string;
    created_at: Date;
    fundo_aprovacao: string | null;
    fundo_recusa_motivo: string | null;
    docs_total: number;
    docs_ok: number;
    docs_revisao: number;
    docs_sem_val: number;
  };
  const rows = (result as unknown as { rows: Raw[] }).rows ?? [];

  // Batch lookup de scores
  const construtoraIds = Array.from(new Set(rows.map((r) => r.construtora_id)));
  const scoresMap = await getScoresBatchConstrutoras(construtoraIds, "global");

  return rows.map((r) => {
    const razao = r.taxa_op > 0 ? Math.min(1, r.taxa_fundo / r.taxa_op) : 0;
    const custoDinheiro = r.juros * razao;
    const spread = Math.max(0, r.juros - custoDinheiro);
    const resultadoAQ = Math.max(0, r.custos + spread / 2);
    return {
      operacaoId: r.operacao_id,
      numero: r.numero,
      status: r.status,
      construtoraId: r.construtora_id,
      construtoraNome: r.construtora_nome,
      imobiliariaNome: r.imobiliaria_nome,
      corretorNome: r.corretor_nome,
      fundoId: r.fundo_id,
      fundoNome: r.fundo_nome,
      valorComissao: r.valor_comissao,
      valorPresente: r.valor_presente,
      juros: r.juros,
      custos: r.custos,
      taxaOpMensal: r.taxa_op,
      taxaFundoMensal: r.taxa_fundo,
      spread,
      spreadPctMensal: Math.max(0, r.taxa_op - r.taxa_fundo),
      resultadoAQ,
      numeroParcelas: r.numero_parcelas,
      dataVenda: r.data_venda,
      createdAt: r.created_at,
      scoreConstrutora: scoresMap.get(r.construtora_id) ?? {
        totalParcelas: 0,
        vencidas: 0,
        vencidasGraves: 0,
        score: 50,
      },
      docsStatus: {
        ok: r.docs_ok,
        revisao: r.docs_revisao,
        semValidacao: r.docs_sem_val,
        total: r.docs_total,
      },
      fundoAprovacao: r.fundo_aprovacao,
      fundoRecusaMotivo: r.fundo_recusa_motivo,
    };
  });
}

/** Stats agregadas pro topo da página */
export async function getAdminMesaStats(): Promise<{
  qtdAguardandoAprovacao: number;
  qtdDocsIncompletos: number;
  qtdFundoPendente: number;
  qtdFundoRecusou: number;
}> {
  await requireAdmin();
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'aguardando_aprovacao')::int AS aguardando,
      COUNT(*) FILTER (WHERE status = 'documentos_incompletos')::int AS docs_incompletos,
      COUNT(*) FILTER (
        WHERE fundo_aprovacao = 'pendente'
          AND status IN ('pre_aprovada','analise_final','enviada_para_assinatura')
      )::int AS fundo_pendente,
      COUNT(*) FILTER (WHERE fundo_aprovacao = 'recusada')::int AS fundo_recusou
    FROM operacoes
  `);
  const r = (
    result as unknown as {
      rows: {
        aguardando: number;
        docs_incompletos: number;
        fundo_pendente: number;
        fundo_recusou: number;
      }[];
    }
  ).rows[0] ?? {
    aguardando: 0,
    docs_incompletos: 0,
    fundo_pendente: 0,
    fundo_recusou: 0,
  };
  return {
    qtdAguardandoAprovacao: r.aguardando,
    qtdDocsIncompletos: r.docs_incompletos,
    qtdFundoPendente: r.fundo_pendente,
    qtdFundoRecusou: r.fundo_recusou,
  };
}
