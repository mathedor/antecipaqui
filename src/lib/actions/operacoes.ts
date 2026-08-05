"use server";

import { revalidatePath } from "next/cache";
import { eq, sql, and, desc, inArray } from "drizzle-orm";
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
import { sendEmail } from "@/lib/email";
import { parseBRLNumber, valorPresente } from "@/lib/format";
import { getTaxaMensal } from "@/lib/actions/settings";
import { extractValidacao } from "@/lib/validacao-form";
import {
  parseCompradoresFromForm,
  parsePagadorTipo,
} from "@/lib/compradores";

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
  const telefone = String(formData.get("telefone") || "")
    .replace(/\D/g, "");
  const email = String(formData.get("email") || "").trim();
  const cep = String(formData.get("cep") || "").trim() || null;
  const endereco = String(formData.get("endereco") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;
  const uf =
    String(formData.get("uf") || "").trim().toUpperCase() || null;

  if (!razaoSocial) return { ok: false, error: "Razão social é obrigatória" };
  if (!isValidCNPJ(cnpj)) return { ok: false, error: "CNPJ inválido" };
  if (!telefone)
    return { ok: false, error: "Telefone comercial é obrigatório" };
  if (!email) return { ok: false, error: "Email é obrigatório" };
  if (!email.includes("@"))
    return { ok: false, error: "Email inválido" };

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
      cep,
      endereco,
      cidade,
      uf,
      registeredByUserId: user.id,
      comercialId: await (async () => {
        const { getDefaultComercialId } = await import("@/lib/actions/comerciais");
        return getDefaultComercialId();
      })(),
      onboardingStatus: "pendente",
    })
    .returning();

  // Documentos opcionais (KYC) — persistidos se admin/corretor enviou via form
  type ConsTipo = "contrato_social" | "comprovante_endereco" | "cartao_cnpj";
  const docInputs: { field: string; tipo: ConsTipo; nomeDefault: string }[] = [
    {
      field: "doc_contrato_social",
      tipo: "contrato_social",
      nomeDefault: "contrato_social.pdf",
    },
    {
      field: "doc_comprovante_endereco",
      tipo: "comprovante_endereco",
      nomeDefault: "comprovante_endereco.pdf",
    },
    {
      field: "doc_cartao_cnpj",
      tipo: "cartao_cnpj",
      nomeDefault: "cartao_cnpj.pdf",
    },
  ];
  const docsToInsert: Array<{
    tipo: ConsTipo;
    url: string;
    nomeOriginal: string;
    construtoraId: string;
    validacaoStatus: "ok" | "revisao" | null;
    validacaoConfianca: string | null;
    validacaoMotivo: string | null;
  }> = [];
  for (const d of docInputs) {
    const url = String(formData.get(d.field) || "").trim();
    if (!url) continue;
    const v = extractValidacao(formData, d.field);
    docsToInsert.push({
      tipo: d.tipo,
      url,
      nomeOriginal: String(formData.get(`${d.field}_nome`) || d.nomeDefault),
      construtoraId: created.id,
      validacaoStatus: v.validacaoStatus,
      validacaoConfianca: v.validacaoConfianca,
      validacaoMotivo: v.validacaoMotivo,
    });
  }
  if (docsToInsert.length > 0) {
    await db.insert(documentos).values(docsToInsert);
  }

  // Email de boas-vindas — best-effort, não bloqueia o fluxo
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";
  const cadastroLink = `${baseUrl}/cadastre-se`;
  await sendEmail({
    to: email,
    subject: `Antecipaqui · ${razaoSocial} foi cadastrada na nossa plataforma`,
    body: `Olá! Tudo bem?

A ${razaoSocial} foi cadastrada na plataforma Antecipaqui por ${user.nome ?? user.email}, que está prestes a antecipar uma comissão imobiliária vinculada à sua construtora.

Pra que as operações sigam normalmente, é necessário que a sua empresa complete o cadastro com os seguintes documentos:

• Contrato social
• Comprovante de endereço
• Telefone e dados de contato confirmados

Faça o cadastro de acesso aqui: ${cadastroLink}

Use o CNPJ ${cnpj} pra que sua construtora seja vinculada automaticamente. Em caso de dúvidas, responda este email ou fale com a gente em contato@antecipaqui.digital.

Equipe Antecipaqui`,
  }).catch((e) => console.error("[construtora/welcome-email]", e));

  revalidatePath("/painel/operacoes/nova");
  return { ok: true, construtoraId: created.id };
}

/* =========================================
   OPERAÇÃO — registrar nova
   ========================================= */

type ParcelaInput = { valor: number; vencimento: string };

/**
 * Resolve de qual unidade (matriz ou filial) sai a operação.
 *
 * - `unidadeId` vazio → vínculo padrão do user. Owner de grupo cai na
 *   matriz; membro de filial cai na filial dele.
 * - `unidadeId` preenchido → só aceita se estiver no escopo do user.
 *
 * Retorna "fora_do_grupo" quando o ID informado não pertence ao escopo —
 * o caller transforma em erro de validação.
 */
async function resolveImobiliariaDaOperacao(
  userId: string,
  unidadeId: string,
): Promise<{ id: string } | null | "fora_do_grupo"> {
  const { getCurrentImobMembership } = await import(
    "@/lib/actions/imobiliaria-membros"
  );
  const me = await getCurrentImobMembership();

  if (!me) {
    // Sem vínculo resolvido (ex: role fora de corretor/imobiliária) —
    // mantém o comportamento legado de buscar a imob que o user é dono.
    const [own] = await db
      .select({ id: imobiliarias.id })
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, userId))
      .limit(1);
    return own ?? null;
  }

  if (!unidadeId) return { id: me.imobiliariaId };
  if (!me.scopeImobIds.includes(unidadeId)) return "fora_do_grupo";
  return { id: unidadeId };
}

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

  // Pra corretor/imobiliária: precisa ter os 2 documentos KYC no DB
  // (contrato social + comprovante de endereço) antes de criar operação.
  if (user.role === "corretor" || user.role === "imobiliaria") {
    const userDocs = await db
      .select({ tipo: documentos.tipo })
      .from(documentos)
      .where(eq(documentos.userId, user.id));
    const tipos = new Set(userDocs.map((d) => d.tipo));
    const faltam: string[] = [];
    if (!tipos.has("contrato_social")) faltam.push("contrato social");
    if (!tipos.has("comprovante_endereco"))
      faltam.push("comprovante de endereço");
    if (faltam.length > 0) {
      return {
        ok: false,
        error: `Antes de cadastrar operações você precisa enviar: ${faltam.join(" e ")}. Acesse seu painel para completar o cadastro.`,
      };
    }
  }

  const construtoraId = String(formData.get("construtoraId") || "").trim();
  const dataVenda = String(formData.get("dataVenda") || "").trim();
  const parcelasJson = String(formData.get("parcelas") || "[]");

  const valorVenda = parseBRLNumber(String(formData.get("valorVenda") || ""));
  const valorComissao = parseBRLNumber(
    String(formData.get("valorComissao") || ""),
  );
  const valorEntradaRaw = String(formData.get("valorEntrada") || "").trim();
  const valorEntrada = valorEntradaRaw
    ? parseBRLNumber(valorEntradaRaw)
    : null;

  if (!construtoraId) return { ok: false, error: "Selecione a construtora" };
  if (!Number.isFinite(valorVenda) || valorVenda <= 0)
    return { ok: false, error: "Valor da venda inválido" };
  if (!Number.isFinite(valorComissao) || valorComissao <= 0)
    return { ok: false, error: "Valor da comissão inválido" };
  if (valorComissao > valorVenda)
    return { ok: false, error: "Comissão maior que valor da venda" };
  if (!dataVenda) return { ok: false, error: "Data da venda obrigatória" };

  let parcelasRaw: { valor: unknown; vencimento: unknown }[] = [];
  try {
    parcelasRaw = JSON.parse(parcelasJson);
  } catch {
    return { ok: false, error: "Parcelas inválidas" };
  }
  if (!Array.isArray(parcelasRaw) || parcelasRaw.length === 0)
    return { ok: false, error: "Adicione pelo menos uma parcela" };
  if (parcelasRaw.length > 4)
    return { ok: false, error: "Limite máximo de 4 parcelas (120 dias)" };

  // Normaliza valor (aceita string mascarada BR ou número) e vencimento
  const parcelas: ParcelaInput[] = parcelasRaw.map((p) => ({
    valor:
      typeof p.valor === "number" ? p.valor : parseBRLNumber(String(p.valor)),
    vencimento: String(p.vencimento ?? ""),
  }));

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

  // Documentos: contratos obrigatórios; NF e comprovante de entrada opcionais.
  const docContratoVendaUrl = String(
    formData.get("doc_contrato_venda") || "",
  ).trim();
  const docContratoComissaoUrl = String(
    formData.get("doc_contrato_comissao") || "",
  ).trim();
  const docNotaFiscalUrl = String(
    formData.get("doc_nota_fiscal") || "",
  ).trim();
  const docComprovanteEntradaUrl = String(
    formData.get("doc_comprovante_entrada") || "",
  ).trim();

  if (!docContratoVendaUrl)
    return { ok: false, error: "Anexe o contrato de compra e venda" };
  if (!docContratoComissaoUrl)
    return { ok: false, error: "Anexe o contrato de comissionamento" };

  // Unidade originadora da operação (matriz ou filial do grupo).
  // O form manda `imobiliariaId` quando o grupo tem mais de uma unidade;
  // sem isso, cai no vínculo padrão do user.
  const imob = await resolveImobiliariaDaOperacao(
    user.id,
    String(formData.get("imobiliariaId") || "").trim(),
  );
  if (imob === "fora_do_grupo")
    return { ok: false, error: "Unidade selecionada não pertence ao seu grupo" };

  // Fidelização: se a construtora está fidelizada a um fundo, vincula
  // automaticamente esse fundo + adota a taxa-base dele em vez da global.
  const [construRow] = await db
    .select({ fundoFidelizadoId: construtoras.fundoFidelizadoId })
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
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

  const today = new Date();
  const parcelasComMeses = parcelas.map((p) => ({
    valor: Number(p.valor),
    mesesAteVencimento: Math.max(monthsBetween(today, new Date(p.vencimento)), 0),
  }));
  const vp = valorPresente(parcelasComMeses, taxaMensal);
  const desagio = valorComissao - vp;

  const numero = await generateOperacaoNumero();

  // Pagador (construtora|compradores) + lista de compradores quando aplicável
  const pagadorTipo = parsePagadorTipo(
    String(formData.get("pagadorTipo") || ""),
  );
  let compradoresParseados: ReturnType<typeof parseCompradoresFromForm> = {
    ok: true,
    compradores: [],
  };
  if (pagadorTipo === "compradores") {
    compradoresParseados = parseCompradoresFromForm(
      String(formData.get("compradores") || ""),
    );
    if (!compradoresParseados.ok)
      return { ok: false, error: compradoresParseados.error };
  }

  const [op] = await db
    .insert(operacoes)
    .values({
      numero,
      corretorUserId: user.id,
      imobiliariaId: imob?.id ?? null,
      construtoraId,
      fundoId: fundoIdAuto,
      comercialId: await (async () => {
        const { getDefaultComercialId } = await import("@/lib/actions/comerciais");
        return getDefaultComercialId();
      })(),
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      valorEntrada:
        valorEntrada && valorEntrada > 0 ? String(valorEntrada.toFixed(2)) : null,
      dataVenda,
      numeroParcelas: parcelas.length,
      taxaMensal: String(taxaMensal),
      valorPresente: String(vp.toFixed(2)),
      desagio: String(desagio.toFixed(2)),
      status: "aguardando_aprovacao",
      pagadorTipo,
    })
    .returning();

  if (
    pagadorTipo === "compradores" &&
    compradoresParseados.ok &&
    compradoresParseados.compradores.length > 0
  ) {
    const { operacaoCompradores } = await import("@/db/schema");
    await db.insert(operacaoCompradores).values(
      compradoresParseados.compradores.map((c, i) => ({
        operacaoId: op.id,
        ordem: i + 1,
        tipoPessoa: c.tipoPessoa,
        nome: c.nome,
        documento: c.documento,
        telefone: c.telefone,
        email: c.email,
        cep: c.cep,
        endereco: c.endereco,
        cidade: c.cidade,
        uf: c.uf,
      })),
    );
  }

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

  // Documentos da operação (URLs do Vercel Blob — já validadas acima)
  type DocRow = {
    tipo:
      | "contrato_venda"
      | "contrato_comissao"
      | "nota_fiscal"
      | "comprovante_entrada";
    url: string;
    nome: string;
    nameBase: string;
  };
  const docRows: DocRow[] = [
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
    docRows.push({
      tipo: "nota_fiscal",
      url: docNotaFiscalUrl,
      nome: String(formData.get("doc_nota_fiscal_nome") || "nota_fiscal.pdf"),
      nameBase: "doc_nota_fiscal",
    });
  }
  if (docComprovanteEntradaUrl) {
    docRows.push({
      tipo: "comprovante_entrada",
      url: docComprovanteEntradaUrl,
      nome: String(
        formData.get("doc_comprovante_entrada_nome") ||
          "comprovante_entrada.pdf",
      ),
      nameBase: "doc_comprovante_entrada",
    });
  }

  if (docRows.length > 0) {
    await db.insert(documentos).values(
      docRows.map((d) => {
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

/** Lista ops da imobiliária com escopo de permissão.
 *  - Se canSeeAll = true (owner/gerente/financeiro): retorna TODAS da imob
 *  - Caso contrário (corretor membro): retorna só onde user é corretor ou
 *    é corretor_atendente. */
export async function getOperacoesByImobiliariaScoped(args: {
  /** Unidade de lotação — mantido por compatibilidade. */
  imobiliariaId: string;
  /** Unidades do grupo que o user enxerga. Quando ausente, usa só
   *  `imobiliariaId` (comportamento anterior ao grupo econômico). */
  imobiliariaIds?: string[];
  userId: string;
  canSeeAll: boolean;
}) {
  const ids =
    args.imobiliariaIds && args.imobiliariaIds.length > 0
      ? args.imobiliariaIds
      : [args.imobiliariaId];

  const baseWhere =
    ids.length === 1
      ? eq(operacoes.imobiliariaId, ids[0])
      : inArray(operacoes.imobiliariaId, ids);
  const where = args.canSeeAll
    ? baseWhere
    : and(
        baseWhere,
        sql`(${operacoes.corretorUserId} = ${args.userId}
          OR ${operacoes.corretorAtendenteUserId} = ${args.userId})`,
      );

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
      empreendimentoId: operacoes.empreendimentoId,
      corretorAtendenteUserId: operacoes.corretorAtendenteUserId,
      imobiliariaId: operacoes.imobiliariaId,
      unidadeNome: sql<string | null>`(
        SELECT COALESCE(i.apelido, i.nome_fantasia, i.razao_social)
        FROM imobiliarias i WHERE i.id = ${operacoes.imobiliariaId}
      )`,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .where(where)
    .orderBy(desc(operacoes.createdAt));
}

export async function getOperacaoDetail(operacaoId: string, userId: string) {
  // Permite acesso pelo corretor que cadastrou, construtora dona da row,
  // ou fundo dono da operação
  const construtoraOwned = (
    await db
      .select({ id: construtoras.id })
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, userId))
      .limit(1)
  )[0];

  const { fundos } = await import("@/db/schema");
  const fundoOwned = (
    await db
      .select({ id: fundos.id })
      .from(fundos)
      .where(eq(fundos.ownerUserId, userId))
      .limit(1)
  )[0];

  const { fundos: fundosTable } = await import("@/db/schema");
  const conditions = [eq(operacoes.id, operacaoId)];
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
      motivoPendencia: operacoes.motivoPendencia,
      fundoAprovacao: operacoes.fundoAprovacao,
      fundoRecusaMotivo: operacoes.fundoRecusaMotivo,
      createdAt: operacoes.createdAt,
      corretorUserId: operacoes.corretorUserId,
      construtoraId: operacoes.construtoraId,
      fundoId: operacoes.fundoId,
      cashbackPercent: operacoes.cashbackPercent,
      pagadorTipo: operacoes.pagadorTipo,
      construtoraNome: construtoras.razaoSocial,
      construtoraCnpj: construtoras.cnpj,
      construtoraAssinadaEm: operacoes.construtoraAssinadaEm,
      construtoraAssinaturaIp: operacoes.construtoraAssinaturaIp,
      construtoraRecusouAssinaturaEm: operacoes.construtoraRecusouAssinaturaEm,
      construtoraRecusaAssinaturaMotivo:
        operacoes.construtoraRecusaAssinaturaMotivo,
      corretorNome: users.nome,
      corretorEmail: users.email,
      fundoNome: fundosTable.razaoSocial,
      fundoNomeFantasia: fundosTable.nomeFantasia,
      fundoEmailComercial: fundosTable.emailComercial,
      fundoContatoResponsavel: fundosTable.contatoResponsavel,
      fundoTelefone: fundosTable.telefone,
      fundoBancoNome: fundosTable.bancoNome,
      fundoBancoAgencia: fundosTable.bancoAgencia,
      fundoBancoConta: fundosTable.bancoConta,
      fundoBancoPix: fundosTable.bancoPix,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
    .leftJoin(users, eq(operacoes.corretorUserId, users.id))
    .leftJoin(fundosTable, eq(operacoes.fundoId, fundosTable.id))
    .where(and(...conditions))
    .limit(1);

  if (!op) return null;

  const isCorretor = op.corretorUserId === userId;
  const isConstrutora =
    construtoraOwned && op.construtoraId === construtoraOwned.id;
  const isFundo = fundoOwned && op.fundoId === fundoOwned.id;
  if (!isCorretor && !isConstrutora && !isFundo) return null;

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

  const { operacaoCompradores } = await import("@/db/schema");
  const compradoresOp = await db
    .select()
    .from(operacaoCompradores)
    .where(eq(operacaoCompradores.operacaoId, operacaoId))
    .orderBy(operacaoCompradores.ordem);

  return {
    ...op,
    parcelas,
    documentos: docs,
    compradores: compradoresOp,
    viewerRole: isFundo
      ? ("fundo" as const)
      : isConstrutora
        ? ("construtora" as const)
        : ("corretor" as const),
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
      empreendimentoId: operacoes.empreendimentoId,
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
            inArray(parcelasComissao.operacaoId, ativasIds),
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
        .where(inArray(parcelasComissao.operacaoId, ativasIds))
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

/**
 * Agregação dos últimos 12 meses pro dashboard da construtora.
 * Retorna SEMPRE 12 meses, formato { month, label, operacoes,
 * valorAntecipado, valorComissao }.
 */
export async function getConstrutoraMonthlyStats(construtoraId: string) {
  const result = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
      COUNT(*)::int AS operacoes,
      COALESCE(SUM(valor_presente), 0)::float AS valor_antecipado,
      COALESCE(SUM(valor_comissao), 0)::float AS valor_comissao
    FROM operacoes
    WHERE construtora_id = ${construtoraId}
      AND created_at >= date_trunc('month', now()) - interval '11 months'
      AND status NOT IN ('rascunho', 'recusada', 'cancelada')
    GROUP BY date_trunc('month', created_at)
  `);

  // db.execute() pode retornar array direto OU { rows: [] } dependendo
  // do driver — extrai de forma resiliente.
  const rawRows: Array<{
    month: string;
    operacoes: number;
    valor_antecipado: number;
    valor_comissao: number;
  }> = Array.isArray(result)
    ? (result as never)
    : ((result as { rows?: unknown[] }).rows as never) ?? [];

  const list = rawRows.map((r) => ({
    month: r.month,
    operacoes: Number(r.operacoes),
    valorAntecipado: Number(r.valor_antecipado),
    valorComissao: Number(r.valor_comissao),
  }));

  const map = new Map(list.map((r) => [r.month, r]));
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);

  const series: Array<{
    month: string;
    label: string;
    operacoes: number;
    valorAntecipado: number;
    valorComissao: number;
  }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d
      .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      .replace(".", "")
      .replace(" de ", "/");
    const found = map.get(monthKey);
    series.push({
      month: monthKey,
      label,
      operacoes: found?.operacoes ?? 0,
      valorAntecipado: found?.valorAntecipado ?? 0,
      valorComissao: found?.valorComissao ?? 0,
    });
  }
  return series;
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
