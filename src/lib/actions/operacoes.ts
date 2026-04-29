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
      status: "em_analise",
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

  // Audit log
  await db.insert(operacaoEvents).values({
    operacaoId: op.id,
    userId: user.id,
    type: "operacao_created",
    payload: { numero: op.numero, valorComissao, vp, desagio },
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
  const aprovadas = rows.filter((r) =>
    ["aprovada", "em_assinatura", "ativa"].includes(r.status),
  );
  const ativas = rows.filter((r) => r.status === "ativa");
  const liquidadas = rows.filter((r) => r.status === "liquidada");
  const pendentes = rows.filter((r) =>
    ["em_analise", "rascunho"].includes(r.status),
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
    .where(
      and(
        eq(operacoes.id, operacaoId),
        eq(operacoes.corretorUserId, userId),
      ),
    )
    .limit(1);

  if (!op) return null;

  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, operacaoId))
    .orderBy(parcelasComissao.numero);

  return { ...op, parcelas };
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
