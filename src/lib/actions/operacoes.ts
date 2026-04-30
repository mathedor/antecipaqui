"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql, and, desc } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  imobiliarias,
  construtoras,
  operacoes,
  parcelasComissao,
  operacaoEvents,
  documentos,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { valorPresente } from "@/lib/format";

const TAXA_MENSAL_DEFAULT = 0.06;

/* =========================================
   HELPERS
   ========================================= */

async function generateOperacaoNumero() {
  const year = new Date().getFullYear();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(operacoes);
  return `OP-${year}-${String(count + 1).padStart(4, "0")}`;
}

function monthsBetween(from: Date, to: Date) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return years * 12 + months + dayFrac;
}

/* =========================================
   CONSTRUTORA — quick register (durante operação)
   ========================================= */

export type CreateConstrutoraState =
  | { ok: false; error: string }
  | { ok: true; construtoraId: string }
  | null;

export async function createConstrutoraAction(
  _prev: CreateConstrutoraState,
  formData: FormData,
): Promise<CreateConstrutoraState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const razaoSocial = String(formData.get("razaoSocial") || "").trim();
  const nomeFantasia =
    String(formData.get("nomeFantasia") || "").trim() || null;
  const cnpjRaw = String(formData.get("cnpj") || "");
  const cnpj = unmaskCNPJ(cnpjRaw);
  const telefone = String(formData.get("telefone") || "").trim() || null;
  const email = String(formData.get("email") || "").trim() || null;

  if (!razaoSocial) return { ok: false, error: "Razão social é obrigatória" };
  if (!isValidCNPJ(cnpj)) return { ok: false, error: "CNPJ inválido" };

  const existing = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.cnpj, cnpj))
    .limit(1);

  if (existing[0]) {
    return { ok: true, construtoraId: existing[0].id };
  }

  const [created] = await db
    .insert(construtoras)
    .values({
      razaoSocial,
      nomeFantasia,
      cnpj,
      telefone,
      email,
      registeredByUserId: user.id,
      onboardingStatus: "pendente",
    })
    .returning();

  revalidatePath("/painel/operacoes/nova");
  return { ok: true, construtoraId: created.id };
}

/* =========================================
   OPERAÇÃO — registrar nova
   ========================================= */

type ParcelaInput = { valor: number; vencimento: string };

export type CreateOperacaoState =
  | { ok: false; error: string }
  | { ok: true; operacaoId: string; numero: string }
  | null;

export async function createOperacaoAction(
  _prev: CreateOperacaoState,
  formData: FormData,
): Promise<CreateOperacaoState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  if (user.onboardingStatus === "pendente") {
    return {
      ok: false,
      error: "Complete seu cadastro antes de registrar operações.",
    };
  }

  const construtoraId = String(formData.get("construtoraId") || "").trim();
  const valorVendaStr = String(formData.get("valorVenda") || "").replace(",", ".");
  const valorComissaoStr = String(formData.get("valorComissao") || "").replace(",", ".");
  const dataVenda = String(formData.get("dataVenda") || "").trim();
  const parcelasJson = String(formData.get("parcelas") || "[]");

  const valorVenda = parseFloat(valorVendaStr);
  const valorComissao = parseFloat(valorComissaoStr);

  if (!construtoraId) return { ok: false, error: "Selecione a construtora" };
  if (!Number.isFinite(valorVenda) || valorVenda <= 0)
    return { ok: false, error: "Valor da venda inválido" };
  if (!Number.isFinite(valorComissao) || valorComissao <= 0)
    return { ok: false, error: "Valor da comissão inválido" };
  if (valorComissao > valorVenda)
    return { ok: false, error: "Comissão maior que valor da venda" };
  if (!dataVenda) return { ok: false, error: "Data da venda obrigatória" };

  let parcelas: ParcelaInput[] = [];
  try {
    parcelas = JSON.parse(parcelasJson);
  } catch {
    return { ok: false, error: "Parcelas inválidas" };
  }
  if (!Array.isArray(parcelas) || parcelas.length === 0)
    return { ok: false, error: "Adicione pelo menos uma parcela" };
  if (parcelas.length > 4)
    return { ok: false, error: "Limite máximo de 4 parcelas (120 dias)" };

  // Valida que nenhuma parcela passa de 120 dias do hoje
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite120 = new Date(hoje);
  limite120.setDate(limite120.getDate() + 120);
  const passa120 = parcelas.some((p) => {
    const v = new Date(p.vencimento + "T00:00:00");
    return v > limite120;
  });
  if (passa120)
    return {
      ok: false,
      error: "Parcelas devem vencer dentro de 120 dias da data de hoje",
    };

  const totalParcelas = parcelas.reduce((s, p) => s + Number(p.valor || 0), 0);
  if (Math.abs(totalParcelas - valorComissao) > 0.5) {
    return {
      ok: false,
      error: `Soma das parcelas (R$ ${totalParcelas.toFixed(2)}) não bate com a comissão (R$ ${valorComissao.toFixed(2)})`,
    };
  }

  // Imobiliária do user (se for corretor / imobiliária)
  const imob = (
    await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, user.id))
      .limit(1)
  )[0];

  // Cálculo do valor presente
  const today = new Date();
  const parcelasComMeses = parcelas.map((p) => ({
    valor: Number(p.valor),
    mesesAteVencimento: Math.max(monthsBetween(today, new Date(p.vencimento)), 0),
  }));
  const vp = valorPresente(parcelasComMeses, TAXA_MENSAL_DEFAULT);
  const desagio = valorComissao - vp;

  const numero = await generateOperacaoNumero();

  const [op] = await db
    .insert(operacoes)
    .values({
      numero,
      corretorUserId: user.id,
      imobiliariaId: imob?.id ?? null,
      construtoraId,
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      dataVenda,
      numeroParcelas: parcelas.length,
      taxaMensal: String(TAXA_MENSAL_DEFAULT),
      valorPresente: String(vp.toFixed(2)),
      desagio: String(desagio.toFixed(2)),
      status: "aguardando_aprovacao",
    })
    .returning();

  // Insere parcelas
  await db.insert(parcelasComissao).values(
    parcelas.map((p, i) => ({
      operacaoId: op.id,
      numero: i + 1,
      valor: String(Number(p.valor).toFixed(2)),
      vencimento: p.vencimento,
      status: "a_vencer" as const,
    })),
  );

  // Documentos da operação (URLs do Vercel Blob)
  const docRows = [
    {
      tipo: "contrato_venda" as const,
      url: String(formData.get("doc_contrato_venda") || ""),
      nome: String(formData.get("doc_contrato_venda_nome") || "contrato_venda.pdf"),
    },
    {
      tipo: "contrato_comissao" as const,
      url: String(formData.get("doc_contrato_comissao") || ""),
      nome: String(formData.get("doc_contrato_comissao_nome") || "contrato_comissao.pdf"),
    },
    {
      tipo: "nota_fiscal" as const,
      url: String(formData.get("doc_nota_fiscal") || ""),
      nome: String(formData.get("doc_nota_fiscal_nome") || "nota_fiscal.pdf"),
    },
  ].filter((d) => d.url);

  if (docRows.length > 0) {
    await db.insert(documentos).values(
      docRows.map((d) => ({
        tipo: d.tipo,
        url: d.url,
        nomeOriginal: d.nome,
        userId: user.id,
        operacaoId: op.id,
      })),
    );
  }

  // Audit log
  await db.insert(operacaoEvents).values({
    operacaoId: op.id,
    userId: user.id,
    type: "operacao_created",
    payload: {
      numero: op.numero,
      valorComissao,
      vp,
      desagio,
      docs: docRows.length,
    },
  });

  revalidatePath("/painel");
  revalidatePath("/painel/operacoes");
  return { ok: true, operacaoId: op.id, numero: op.numero };
}

/* =========================================
   QUERIES — pra páginas
   ========================================= */

export async function getDashboardStats(corretorUserId: string) {
  const rows = await db
    .select({
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
    })
    .from(operacoes)
    .where(eq(operacoes.corretorUserId, corretorUserId));

  const total = rows.length;
  const APROVADAS_STATUSES = [
    "pre_aprovada",
    "analise_final",
    "enviada_para_assinatura",
    "enviada_para_pagamento",
  ];
  const aprovadas = rows.filter((r) => APROVADAS_STATUSES.includes(r.status));
  const ativas = rows.filter((r) =>
    ["enviada_para_assinatura", "enviada_para_pagamento"].includes(r.status),
  );
  const liquidadas = rows.filter((r) => r.status === "realizada");
  const pendentes = rows.filter((r) =>
    [
      "aguardando_aprovacao",
      "documentos_incompletos",
      "rascunho",
    ].includes(r.status),
  );

  const sum = (
    arr: { valorPresente: string; valorComissao: string }[],
    field: "valorPresente" | "valorComissao",
  ) => arr.reduce((s, r) => s + parseFloat(r[field]), 0);

  return {
    total,
    pendentes: pendentes.length,
    aprovadas: aprovadas.length,
    valorAntecipado: sum([...ativas, ...liquidadas], "valorPresente"),
    valorComissaoTotal: sum(rows, "valorComissao"),
    valorPresentePendente: sum(pendentes, "valorPresente"),
  };
}

export async function getOperacoesByCorretor(corretorUserId: string) {
  return db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      dataVenda: operacoes.dataVenda,
      createdAt: operacoes.createdAt,
      construtoraNome: construtoras.razaoSocial,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .where(eq(operacoes.corretorUserId, corretorUserId))
    .orderBy(desc(operacoes.createdAt));
}

export async function getOperacaoDetail(operacaoId: string, userId: string) {
  // Permite acesso pelo corretor que cadastrou OU pela construtora dona da row
  const construtoraOwned = (
    await db
      .select({ id: construtoras.id })
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, userId))
      .limit(1)
  )[0];

  const conditions = [eq(operacoes.id, operacaoId)];
  // Authz: corretor dono OU construtora dona
  // Drizzle: fazemos a query e checamos no app
  const [op] = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorVenda: operacoes.valorVenda,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      dataVenda: operacoes.dataVenda,
      numeroParcelas: operacoes.numeroParcelas,
      taxaMensal: operacoes.taxaMensal,
      motivoRecusa: operacoes.motivoRecusa,
      createdAt: operacoes.createdAt,
      corretorUserId: operacoes.corretorUserId,
      construtoraId: operacoes.construtoraId,
      construtoraNome: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .where(and(...conditions))
    .limit(1);

  if (!op) return null;

  const isCorretor = op.corretorUserId === userId;
  const isConstrutora =
    construtoraOwned && op.construtoraId === construtoraOwned.id;
  if (!isCorretor && !isConstrutora) return null;

  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, operacaoId))
    .orderBy(parcelasComissao.numero);

  const docs = await db
    .select({
      id: documentos.id,
      tipo: documentos.tipo,
      url: documentos.url,
      nomeOriginal: documentos.nomeOriginal,
      sizeBytes: documentos.sizeBytes,
      createdAt: documentos.createdAt,
    })
    .from(documentos)
    .where(eq(documentos.operacaoId, operacaoId))
    .orderBy(documentos.createdAt);

  return {
    ...op,
    parcelas,
    documentos: docs,
    viewerRole: isConstrutora ? ("construtora" as const) : ("corretor" as const),
  };
}

/* =========================================
   QUERIES — visão da CONSTRUTORA
   ========================================= */

export async function getConstrutoraByOwnerId(userId: string) {
  return (
    await db
      .select()
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, userId))
      .limit(1)
  )[0];
}

export async function getOperacoesByConstrutora(construtoraId: string) {
  return db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      dataVenda: operacoes.dataVenda,
      createdAt: operacoes.createdAt,
      corretorNome: users.nome,
    })
    .from(operacoes)
    .leftJoin(users, eq(operacoes.corretorUserId, users.id))
    .where(eq(operacoes.construtoraId, construtoraId))
    .orderBy(desc(operacoes.createdAt));
}

export async function getDashboardStatsForConstrutora(construtoraId: string) {
  const ops = await db
    .select({
      id: operacoes.id,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
    })
    .from(operacoes)
    .where(eq(operacoes.construtoraId, construtoraId));

  const STATUS_ATIVAS = [
    "pre_aprovada",
    "analise_final",
    "enviada_para_assinatura",
    "enviada_para_pagamento",
  ];

  const ativasIds = ops
    .filter((o) => STATUS_ATIVAS.includes(o.status))
    .map((o) => o.id);

  const totalDevido = ops
    .filter((o) => STATUS_ATIVAS.includes(o.status))
    .reduce((s, o) => s + parseFloat(o.valorComissao), 0);

  // Parcelas a vencer no mês corrente
  const parcelas = ativasIds.length
    ? await db
        .select({
          valor: parcelasComissao.valor,
          vencimento: parcelasComissao.vencimento,
          status: parcelasComissao.status,
          pagoValor: parcelasComissao.pagoValor,
        })
        .from(parcelasComissao)
        .where(
          and(
            eq(parcelasComissao.status, "a_vencer"),
            // include all parcelas of these ops
            sql`${parcelasComissao.operacaoId} = ANY(${ativasIds})`,
          ),
        )
    : [];

  const allParcelas = ativasIds.length
    ? await db
        .select({
          valor: parcelasComissao.valor,
          vencimento: parcelasComissao.vencimento,
          status: parcelasComissao.status,
          pagoValor: parcelasComissao.pagoValor,
        })
        .from(parcelasComissao)
        .where(sql`${parcelasComissao.operacaoId} = ANY(${ativasIds})`)
    : [];

  const now = new Date();
  const inMonth = (d: string) => {
    const dt = new Date(d + "T00:00:00");
    return (
      dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
    );
  };

  const aVencerNoMes = parcelas
    .filter((p) => inMonth(p.vencimento))
    .reduce((s, p) => s + parseFloat(p.valor), 0);

  const totalPago = allParcelas
    .filter((p) => p.status === "paga")
    .reduce((s, p) => s + parseFloat(p.pagoValor ?? p.valor), 0);

  const vencidas = allParcelas
    .filter((p) => p.status === "vencida")
    .reduce((s, p) => s + parseFloat(p.valor), 0);

  return {
    totalOperacoes: ops.length,
    totalAtivas: ativasIds.length,
    totalDevido,
    aVencerNoMes,
    totalPago,
    vencidas,
  };
}

export async function getDuplicatasParaPagar(construtoraId: string) {
  // Lista todas as parcelas das operações ativas, ordenadas por vencimento
  return db
    .select({
      parcelaId: parcelasComissao.id,
      numero: parcelasComissao.numero,
      valor: parcelasComissao.valor,
      vencimento: parcelasComissao.vencimento,
      statusParcela: parcelasComissao.status,
      pagoEm: parcelasComissao.pagoEm,
      pagoValor: parcelasComissao.pagoValor,
      operacaoId: operacoes.id,
      operacaoNumero: operacoes.numero,
      operacaoStatus: operacoes.status,
      corretorNome: users.nome,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
    .leftJoin(users, eq(operacoes.corretorUserId, users.id))
    .where(
      and(
        eq(operacoes.construtoraId, construtoraId),
        sql`${operacoes.status} IN ('pre_aprovada', 'analise_final', 'enviada_para_assinatura', 'enviada_para_pagamento')`,
      ),
    )
    .orderBy(parcelasComissao.vencimento);
}

export async function listConstrutorasForSelect() {
  return db
    .select({
      id: construtoras.id,
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      cnpj: construtoras.cnpj,
    })
    .from(construtoras)
    .orderBy(construtoras.razaoSocial);
}

/* =========================================
   ADMIN-ish helpers (até ter painel admin)
   ========================================= */

export async function devApproveOnboarding(userId: string) {
  // Helper temporário pra dev. Em produção isso seria feito pelo admin.
  await db
    .update(users)
    .set({ onboardingStatus: "aprovado", updatedAt: new Date() })
    .where(eq(users.id, userId));
  revalidatePath("/painel");
}
