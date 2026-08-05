"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@/db";
import {
  construtoras,
  documentos,
  imobiliarias,
  operacaoEvents,
  operacoes,
  parcelasComissao,
  pendingOperacoes,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { sendEmail } from "@/lib/email";
import { parseBRLNumber, valorPresente } from "@/lib/format";
import { notify } from "@/lib/notify";
import { getTaxaMensal } from "@/lib/actions/settings";
import { parseCompradoresFromForm } from "@/lib/compradores";
import { extractValidacao } from "@/lib/validacao-form";

type LinhaPayload = {
  imobiliariaId?: string | null;
  imobNova?: {
    razaoSocial: string;
    cnpj: string;
    email: string;
    telefone: string;
  };
  corretorEmail?: string;
  corretorNome?: string;
  valorVenda: string;
  valorComissao: string;
  numeroParcelas: string;
  dataPrimeiraParcela: string;
  observacoes?: string;
  /** 'construtora' (default) ou 'compradores'. */
  pagadorTipo?: "construtora" | "compradores";
  /** JSON string ou array dos compradores quando pagadorTipo='compradores'. */
  compradores?: unknown;
};

export type CreatePendingState =
  | { ok: false; error: string; linhaIndex?: number }
  | { ok: true; total: number }
  | null;

function generateInviteToken() {
  return crypto.randomBytes(20).toString("hex");
}

/**
 * Recebe uma lista de linhas e cria pending_operacoes em lote.
 * Pra cada linha:
 *  - Resolve imobiliária (existente OU cria nova com ownerUserId=null)
 *  - Cria pending_operacao com invite_token único
 *  - Manda email pro corretor convidando
 */
export async function createPendingOperacoesAction(
  _prev: CreatePendingState,
  formData: FormData,
): Promise<CreatePendingState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "construtora")
    return { ok: false, error: "Apenas construtora pode usar lote" };

  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return { ok: false, error: "Construtora não encontrada" };

  let linhas: LinhaPayload[] = [];
  try {
    linhas = JSON.parse(String(formData.get("linhas") || "[]"));
  } catch {
    return { ok: false, error: "Linhas inválidas" };
  }
  if (!Array.isArray(linhas) || linhas.length === 0)
    return { ok: false, error: "Adicione pelo menos uma operação" };

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

  let criadas = 0;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    // Resolve imobiliária: usa id existente OU cria nova
    let imobId: string | null = l.imobiliariaId ?? null;
    let corretorEmail = (l.corretorEmail ?? "").trim();
    let corretorNome = (l.corretorNome ?? "").trim() || null;
    let corretorTelefone: string | null = null;
    let corretorCnpj: string | null = null;

    if (imobId) {
      const [imob] = await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.id, imobId))
        .limit(1);
      if (imob) {
        // Pega email do owner se existir
        if (imob.ownerUserId) {
          const [owner] = await db
            .select()
            .from(users)
            .where(eq(users.id, imob.ownerUserId))
            .limit(1);
          if (owner) {
            corretorEmail = corretorEmail || owner.email;
            corretorNome = corretorNome ?? owner.nome;
            corretorTelefone = owner.telefone ?? imob.telefone;
          }
        } else {
          corretorTelefone = imob.telefone;
        }
        corretorCnpj = imob.cnpj;
      }
    } else if (l.imobNova) {
      const cnpj = unmaskCNPJ(l.imobNova.cnpj);
      if (!isValidCNPJ(cnpj))
        return {
          ok: false,
          linhaIndex: i,
          error: `Linha ${i + 1}: CNPJ da imobiliária inválido`,
        };
      const emailNova = l.imobNova.email.trim();
      if (!emailNova || !emailNova.includes("@"))
        return {
          ok: false,
          linhaIndex: i,
          error: `Linha ${i + 1}: email da imobiliária obrigatório`,
        };

      // Verifica se já existe imobiliária com esse CNPJ
      const [existing] = await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.cnpj, cnpj))
        .limit(1);
      if (existing) {
        imobId = existing.id;
        if (existing.ownerUserId) {
          const [owner] = await db
            .select()
            .from(users)
            .where(eq(users.id, existing.ownerUserId))
            .limit(1);
          corretorEmail = corretorEmail || owner?.email || emailNova;
          corretorNome = corretorNome ?? owner?.nome ?? l.imobNova.razaoSocial;
          corretorTelefone = owner?.telefone ?? existing.telefone;
        } else {
          corretorEmail = corretorEmail || emailNova;
          corretorNome = corretorNome ?? l.imobNova.razaoSocial;
          corretorTelefone = existing.telefone;
        }
        corretorCnpj = existing.cnpj;
      } else {
        // Cria imobiliária stub (ownerUserId null — será preenchido quando
        // o corretor se cadastrar).
        // imobiliarias.ownerUserId é NOT NULL → vamos contornar mantendo
        // tudo apenas em pending_operacoes (sem imobiliariaId).
        imobId = null;
        corretorEmail = corretorEmail || emailNova;
        corretorNome = corretorNome ?? l.imobNova.razaoSocial;
        corretorTelefone = l.imobNova.telefone;
        corretorCnpj = cnpj;
      }
    }

    if (!corretorEmail || !corretorEmail.includes("@"))
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: email do corretor obrigatório`,
      };

    const valorVenda = parseBRLNumber(l.valorVenda);
    const valorComissao = parseBRLNumber(l.valorComissao);
    if (!valorVenda || valorVenda <= 0)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: valor da venda inválido`,
      };
    if (!valorComissao || valorComissao <= 0)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: valor da comissão inválido`,
      };
    if (valorComissao > valorVenda)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: comissão maior que venda`,
      };

    const numeroParcelas = parseInt(l.numeroParcelas, 10);
    if (!Number.isFinite(numeroParcelas) || numeroParcelas < 1 || numeroParcelas > 4)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: parcelas devem ser entre 1 e 4`,
      };

    const dp = String(l.dataPrimeiraParcela ?? "").trim();
    if (!dp || Number.isNaN(new Date(dp + "T00:00:00").getTime()))
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: data da 1ª parcela inválida`,
      };

    // Pagador (default 'construtora')
    const pagadorTipoLinha =
      l.pagadorTipo === "compradores" ? "compradores" : "construtora";
    let compradoresLinha:
      | Array<{
          tipoPessoa: "fisica" | "juridica";
          nome: string;
          documento: string;
          telefone: string;
          email: string;
          cep?: string | null;
          endereco?: string | null;
          cidade?: string | null;
          uf?: string | null;
        }>
      | null = null;
    if (pagadorTipoLinha === "compradores") {
      const raw =
        typeof l.compradores === "string"
          ? l.compradores
          : JSON.stringify(l.compradores ?? []);
      const parsed = parseCompradoresFromForm(raw);
      if (!parsed.ok)
        return {
          ok: false,
          linhaIndex: i,
          error: `Linha ${i + 1}: ${parsed.error}`,
        };
      compradoresLinha = parsed.compradores;
    }

    const inviteToken = generateInviteToken();
    await db.insert(pendingOperacoes).values({
      construtoraId: c.id,
      imobiliariaId: imobId,
      corretorEmail: corretorEmail.toLowerCase(),
      corretorNome,
      corretorTelefone,
      corretorCnpj,
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      numeroParcelas,
      dataPrimeiraParcela: dp,
      dataVenda: new Date().toISOString().slice(0, 10),
      observacoes: l.observacoes?.trim() || null,
      inviteToken,
      createdByUserId: user.id,
      pagadorTipo: pagadorTipoLinha,
      compradores: compradoresLinha,
    });

    // Email convite (best-effort)
    const inviteUrl = `${baseUrl}/cadastre-se?invite=${inviteToken}`;
    await sendEmail({
      contexto: "pending-operacoes",
      to: corretorEmail,
      subject: `Antecipaqui · ${c.razaoSocial} cadastrou uma operação pra você`,
      body: `Olá${corretorNome ? ` ${corretorNome.split(" ")[0]}` : ""}!

A construtora ${c.razaoSocial} cadastrou uma operação de antecipação de comissão envolvendo você na plataforma Antecipaqui.

📋 Resumo:
• Valor da venda: R$ ${valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Comissão: R$ ${valorComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Parcelas: ${numeroParcelas}x
• Primeira parcela: ${new Date(dp + "T00:00:00").toLocaleDateString("pt-BR")}

Pra simular o quanto você recebe hoje e finalizar o cadastro (anexar contratos e nota fiscal), acesse:

${inviteUrl}

Se você ainda não tem cadastro, o link te leva direto pra criar a conta. Em caso de dúvida, responda este email.

Equipe Antecipaqui`,
    }).catch((e) => console.error("[pending/email]", e));

    // Se já existe um user no nosso DB com esse email, manda também
    // notificação in-app
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, corretorEmail.toLowerCase()))
      .limit(1);
    if (existingUser) {
      await notify({
        userId: existingUser.id,
        type: "pending_operacao_recebida",
        title: `${c.razaoSocial} cadastrou uma operação pra você`,
        body: `Comissão de R$ ${valorComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${numeroParcelas}x. Acesse seus convites pra completar.`,
        link: "/painel/convites",
      });
    }

    criadas++;
  }

  revalidatePath("/painel");
  revalidatePath("/painel/operacoes/lote");
  return { ok: true, total: criadas };
}

/* ============================================================
   QUERIES
   ============================================================ */

/** Imobiliárias já cadastradas (pra autocomplete na construtora). */
export async function listImobiliariasForLote() {
  await getCurrentDbUser();
  return db
    .select({
      id: imobiliarias.id,
      razaoSocial: imobiliarias.razaoSocial,
      nomeFantasia: imobiliarias.nomeFantasia,
      cnpj: imobiliarias.cnpj,
    })
    .from(imobiliarias)
    .orderBy(imobiliarias.razaoSocial);
}

/** Pendings já cadastrados pela construtora atual (histórico). */
export async function listPendingByCurrentConstrutora() {
  const user = await getCurrentDbUser();
  if (!user) return [];
  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return [];

  return db
    .select()
    .from(pendingOperacoes)
    .where(eq(pendingOperacoes.construtoraId, c.id))
    .orderBy(desc(pendingOperacoes.createdAt));
}

/* ============================================================
   CORRETOR — listar e completar convites
   ============================================================ */

/**
 * Lista convites pendentes pro user atual (match por email).
 * Retorna também dados da construtora.
 */
export async function listMyConvites() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  const rows = await db
    .select({
      id: pendingOperacoes.id,
      corretorEmail: pendingOperacoes.corretorEmail,
      corretorNome: pendingOperacoes.corretorNome,
      valorVenda: pendingOperacoes.valorVenda,
      valorComissao: pendingOperacoes.valorComissao,
      numeroParcelas: pendingOperacoes.numeroParcelas,
      dataPrimeiraParcela: pendingOperacoes.dataPrimeiraParcela,
      dataVenda: pendingOperacoes.dataVenda,
      observacoes: pendingOperacoes.observacoes,
      status: pendingOperacoes.status,
      createdAt: pendingOperacoes.createdAt,
      construtoraId: pendingOperacoes.construtoraId,
      construtoraNome: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
      construtoraEmail: construtoras.email,
      construtoraTelefone: construtoras.telefone,
    })
    .from(pendingOperacoes)
    .leftJoin(
      construtoras,
      eq(pendingOperacoes.construtoraId, construtoras.id),
    )
    .where(
      and(
        eq(pendingOperacoes.corretorEmail, user.email.toLowerCase()),
        eq(pendingOperacoes.status, "aguardando_cedente"),
      ),
    )
    .orderBy(desc(pendingOperacoes.createdAt));

  return rows;
}

export async function getConviteById(id: string) {
  const user = await getCurrentDbUser();
  if (!user) return null;

  const [row] = await db
    .select({
      id: pendingOperacoes.id,
      corretorEmail: pendingOperacoes.corretorEmail,
      corretorNome: pendingOperacoes.corretorNome,
      valorVenda: pendingOperacoes.valorVenda,
      valorComissao: pendingOperacoes.valorComissao,
      numeroParcelas: pendingOperacoes.numeroParcelas,
      dataPrimeiraParcela: pendingOperacoes.dataPrimeiraParcela,
      dataVenda: pendingOperacoes.dataVenda,
      observacoes: pendingOperacoes.observacoes,
      status: pendingOperacoes.status,
      construtoraId: pendingOperacoes.construtoraId,
      construtoraNome: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
    })
    .from(pendingOperacoes)
    .leftJoin(
      construtoras,
      eq(pendingOperacoes.construtoraId, construtoras.id),
    )
    .where(eq(pendingOperacoes.id, id))
    .limit(1);

  if (!row) return null;
  // Authz: só o dono do email pode ver
  if (row.corretorEmail !== user.email.toLowerCase()) return null;
  return row;
}

/**
 * Conta de convites pendentes pro user atual (pra badge no menu/banner).
 */
export async function getMyConvitesCount() {
  const user = await getCurrentDbUser();
  if (!user) return 0;
  const rows = await db
    .select({ id: pendingOperacoes.id })
    .from(pendingOperacoes)
    .where(
      and(
        eq(pendingOperacoes.corretorEmail, user.email.toLowerCase()),
        eq(pendingOperacoes.status, "aguardando_cedente"),
      ),
    );
  return rows.length;
}

export type CompletarConviteState =
  | { ok: false; error: string }
  | { ok: true; operacaoId: string }
  | null;

function monthsBetween(from: Date, to: Date) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return Math.max(years * 12 + months + dayFrac, 0);
}

/**
 * Completa um convite: anexa docs, cria operação real, vincula
 * pending → operação, redireciona pra detalhe.
 */
export async function completarConviteAction(
  _prev: CompletarConviteState,
  formData: FormData,
): Promise<CompletarConviteState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "corretor" && user.role !== "imobiliaria")
    return { ok: false, error: "Apenas corretor/imobiliária pode completar" };
  if (user.onboardingStatus === "pendente")
    return {
      ok: false,
      error: "Complete seu cadastro antes de aceitar operações",
    };

  // Validação de docs KYC (mesmo do createOperacao)
  const userDocs = await db
    .select({ tipo: documentos.tipo })
    .from(documentos)
    .where(eq(documentos.userId, user.id));
  const tiposKyc = new Set(userDocs.map((d) => d.tipo));
  const faltam: string[] = [];
  if (!tiposKyc.has("contrato_social")) faltam.push("contrato social");
  if (!tiposKyc.has("comprovante_endereco"))
    faltam.push("comprovante de endereço");
  if (faltam.length > 0)
    return {
      ok: false,
      error: `Antes de aceitar a operação, envie: ${faltam.join(" e ")}.`,
    };

  const pendingId = String(formData.get("pendingId") || "").trim();
  if (!pendingId) return { ok: false, error: "ID do convite obrigatório" };

  const [pending] = await db
    .select()
    .from(pendingOperacoes)
    .where(eq(pendingOperacoes.id, pendingId))
    .limit(1);
  if (!pending) return { ok: false, error: "Convite não encontrado" };
  if (pending.corretorEmail !== user.email.toLowerCase())
    return { ok: false, error: "Esse convite não é pra você" };
  if (pending.status !== "aguardando_cedente")
    return { ok: false, error: "Convite já foi processado" };

  // Documentos: contratos obrigatórios; NF opcional.
  const docContratoVendaUrl = String(
    formData.get("doc_contrato_venda") || "",
  ).trim();
  const docContratoComissaoUrl = String(
    formData.get("doc_contrato_comissao") || "",
  ).trim();
  const docNotaFiscalUrl = String(
    formData.get("doc_nota_fiscal") || "",
  ).trim();
  if (!docContratoVendaUrl)
    return { ok: false, error: "Anexe o contrato de compra e venda" };
  if (!docContratoComissaoUrl)
    return { ok: false, error: "Anexe o contrato de comissionamento" };

  // Imobiliária do user (se for PJ)
  const [imob] = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.ownerUserId, user.id))
    .limit(1);

  // Gera parcelas (1ª na data informada, demais +1 mês)
  const valorComissao = parseFloat(pending.valorComissao);
  const numero = pending.numeroParcelas;
  const valorParcela = valorComissao / numero;
  const start = new Date(pending.dataPrimeiraParcela + "T00:00:00");

  // Limita 4 parcelas / 120 dias
  if (numero > 4)
    return { ok: false, error: "Limite máximo de 4 parcelas (120 dias)" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limite120 = new Date(today);
  limite120.setDate(limite120.getDate() + 120);

  const parcelasArr = Array.from({ length: numero }, (_, i) => {
    const v = new Date(start);
    v.setMonth(v.getMonth() + i);
    return {
      numero: i + 1,
      valor: Number(valorParcela.toFixed(2)),
      vencimento: v.toISOString().slice(0, 10),
    };
  });

  if (parcelasArr.some((p) => new Date(p.vencimento + "T00:00:00") > limite120))
    return {
      ok: false,
      error: "Parcelas devem vencer dentro de 120 dias da data de hoje",
    };

  // Fidelização: se a construtora está fidelizada a um fundo, vincula
  // automaticamente esse fundo + adota a taxa-base dele em vez da global.
  const [construRow] = await db
    .select({ fundoFidelizadoId: construtoras.fundoFidelizadoId })
    .from(construtoras)
    .where(eq(construtoras.id, pending.construtoraId))
    .limit(1);
  let fundoIdAuto: string | null = null;
  let taxaMensal = await getTaxaMensal();
  if (construRow?.fundoFidelizadoId) {
    const { fundos } = await import("@/db/schema");
    const [f] = await db
      .select({ id: fundos.id, taxaMensalBase: fundos.taxaMensalBase })
      .from(fundos)
      .where(eq(fundos.id, construRow.fundoFidelizadoId))
      .limit(1);
    if (f) {
      fundoIdAuto = f.id;
      taxaMensal = parseFloat(f.taxaMensalBase);
    }
  }

  const parcelasComMeses = parcelasArr.map((p) => ({
    valor: p.valor,
    mesesAteVencimento: Math.max(
      monthsBetween(today, new Date(p.vencimento + "T00:00:00")),
      0,
    ),
  }));
  const vp = valorPresente(parcelasComMeses, taxaMensal);
  const desagio = valorComissao - vp;

  // Gera número da operação
  const year = new Date().getFullYear();
  const [{ count: opCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(operacoes);
  const opNumero = `OP-${year}-${String(opCount + 1).padStart(4, "0")}`;

  // Cria operação — copia pagadorTipo do pending
  const [op] = await db
    .insert(operacoes)
    .values({
      numero: opNumero,
      corretorUserId: user.id,
      imobiliariaId: imob?.id ?? null,
      construtoraId: pending.construtoraId,
      fundoId: fundoIdAuto,
      valorVenda: pending.valorVenda,
      valorComissao: pending.valorComissao,
      dataVenda: pending.dataVenda ?? new Date().toISOString().slice(0, 10),
      numeroParcelas: numero,
      taxaMensal: String(taxaMensal),
      valorPresente: String(vp.toFixed(2)),
      desagio: String(desagio.toFixed(2)),
      status: "aguardando_aprovacao",
      pagadorTipo: pending.pagadorTipo,
    })
    .returning();

  // Compradores (copia do JSON do pending)
  if (
    pending.pagadorTipo === "compradores" &&
    Array.isArray(pending.compradores) &&
    pending.compradores.length > 0
  ) {
    const { operacaoCompradores } = await import("@/db/schema");
    await db.insert(operacaoCompradores).values(
      pending.compradores.map((c, i) => ({
        operacaoId: op.id,
        ordem: i + 1,
        tipoPessoa: c.tipoPessoa,
        nome: c.nome,
        documento: c.documento,
        telefone: c.telefone,
        email: c.email,
        cep: c.cep ?? null,
        endereco: c.endereco ?? null,
        cidade: c.cidade ?? null,
        uf: c.uf ?? null,
      })),
    );
  }

  // Parcelas
  await db.insert(parcelasComissao).values(
    parcelasArr.map((p) => ({
      operacaoId: op.id,
      numero: p.numero,
      valor: String(p.valor.toFixed(2)),
      vencimento: p.vencimento,
      status: "a_vencer" as const,
    })),
  );

  // Documentos
  const docNomes: {
    tipo: "contrato_venda" | "contrato_comissao" | "nota_fiscal";
    url: string;
    nome: string;
    nameBase: string;
  }[] = [
    {
      tipo: "contrato_venda",
      url: docContratoVendaUrl,
      nome: String(formData.get("doc_contrato_venda_nome") || "contrato_venda.pdf"),
      nameBase: "doc_contrato_venda",
    },
    {
      tipo: "contrato_comissao",
      url: docContratoComissaoUrl,
      nome: String(formData.get("doc_contrato_comissao_nome") || "contrato_comissao.pdf"),
      nameBase: "doc_contrato_comissao",
    },
  ];
  if (docNotaFiscalUrl) {
    docNomes.push({
      tipo: "nota_fiscal",
      url: docNotaFiscalUrl,
      nome: String(formData.get("doc_nota_fiscal_nome") || "nota_fiscal.pdf"),
      nameBase: "doc_nota_fiscal",
    });
  }
  await db.insert(documentos).values(
    docNomes.map((d) => {
      const v = extractValidacao(formData, d.nameBase);
      return {
        tipo: d.tipo,
        url: d.url,
        nomeOriginal: d.nome,
        userId: user.id,
        operacaoId: op.id,
        validacaoStatus: v.validacaoStatus,
        validacaoConfianca: v.validacaoConfianca,
        validacaoMotivo: v.validacaoMotivo,
      };
    }),
  );

  // Audit
  await db.insert(operacaoEvents).values({
    operacaoId: op.id,
    userId: user.id,
    type: "operacao_created",
    payload: {
      origem: "convite",
      pendingId: pending.id,
      construtoraId: pending.construtoraId,
    },
  });

  // Atualiza pending
  await db
    .update(pendingOperacoes)
    .set({
      status: "reivindicada",
      reivindicadoPorUserId: user.id,
      reivindicadoEm: new Date(),
      operacaoId: op.id,
      updatedAt: new Date(),
    })
    .where(eq(pendingOperacoes.id, pending.id));

  // Notifica a construtora que o cedente completou
  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, pending.construtoraId))
    .limit(1);
  if (c?.ownerUserId) {
    await notify({
      userId: c.ownerUserId,
      type: "convite_aceito",
      title: `${user.nome ?? user.email} completou a operação ${opNumero}`,
      body: `A operação que você cadastrou em lote agora está em análise da Antecipaqui.`,
      link: `/painel/operacoes/${op.id}`,
      operacaoId: op.id,
    });
  }

  // Notifica admins (mesma rota que createOperacao não notifica admin
  // hoje, mas vou seguir o padrão de não criar barulho extra)

  revalidatePath("/painel");
  revalidatePath("/painel/convites");
  revalidatePath("/painel/operacoes");
  return { ok: true, operacaoId: op.id };
}

