"use server";

import { revalidatePath } from "next/cache";
import { eq, sql, asc } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  construtoras,
  documentos,
  fundos,
  imobiliarias,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { parseBRLNumber, valorPresente } from "@/lib/format";
import { getTaxaMensal } from "@/lib/actions/settings";
import { extractValidacao } from "@/lib/validacao-form";
import { checkBlacklist } from "@/lib/actions/fundo-risco";
import { audit } from "@/lib/audit";
import {
  parseCompradoresFromForm,
  parsePagadorTipo,
} from "@/lib/compradores";

export type CadastrarImobState =
  | { ok: false; error: string }
  | { ok: true; imobiliariaId: string }
  | null;

/**
 * Admin cadastra uma imobiliária + cria conta do responsável via Clerk
 * invitation. Quando o responsável aceita, getCurrentDbUser detecta a
 * publicMetadata.role = "corretor" ou "imobiliaria" e cria o user.
 *
 * Pra simplificar, o user é criado direto no DB com placeholder id baseado
 * no email; quando o responsável fizer login pela primeira vez, o
 * getCurrentDbUser vai encontrar pelo email (fallback) e seguir.
 */
export async function cadastrarImobiliariaAction(
  _prev: CadastrarImobState,
  formData: FormData,
): Promise<CadastrarImobState> {
  await requireAdmin();

  const razaoSocial = String(formData.get("razaoSocial") || "").trim();
  const nomeFantasia =
    String(formData.get("nomeFantasia") || "").trim() || null;
  const cnpj = unmaskCNPJ(String(formData.get("cnpj") || ""));
  const creci = String(formData.get("creci") || "").trim() || null;
  const telefone =
    String(formData.get("telefone") || "").replace(/\D/g, "") || null;
  const cep = String(formData.get("cep") || "").trim() || null;
  const endereco = String(formData.get("endereco") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;
  const uf = String(formData.get("uf") || "").trim().toUpperCase() || null;

  // Dados do responsável (vai ser o user vinculado)
  const responsavelNome =
    String(formData.get("responsavelNome") || "").trim() || null;
  const responsavelEmail =
    String(formData.get("responsavelEmail") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "corretor");

  // Bancários
  const bancoNome = String(formData.get("bancoNome") || "").trim() || null;
  const bancoCodigo =
    String(formData.get("bancoCodigo") || "").trim() || null;
  const bancoAgencia =
    String(formData.get("bancoAgencia") || "").trim() || null;
  const bancoConta = String(formData.get("bancoConta") || "").trim() || null;

  // Grupo econômico — matriz que tem filiais sob o mesmo cadastro.
  const possuiFiliais = String(formData.get("possuiFiliais") || "") === "1";

  // Validações
  if (!razaoSocial) return { ok: false, error: "Razão social é obrigatória" };
  if (!isValidCNPJ(cnpj)) return { ok: false, error: "CNPJ inválido" };
  if (!responsavelEmail || !responsavelEmail.includes("@"))
    return { ok: false, error: "Email do responsável inválido" };
  if (!["corretor", "imobiliaria"].includes(role))
    return { ok: false, error: "Tipo deve ser corretor ou imobiliária" };

  // Verifica se já existe imobiliária com esse CNPJ
  const existing = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.cnpj, cnpj))
    .limit(1);
  if (existing[0]) {
    return {
      ok: false,
      error: `Já existe imobiliária cadastrada com esse CNPJ (${existing[0].razaoSocial}).`,
    };
  }

  // Verifica se já existe user com esse email
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, responsavelEmail))
    .limit(1);

  let userId: string;
  if (existingUser[0]) {
    userId = existingUser[0].id;
    // Atualiza role pra refletir a escolha do admin (se mudar)
    await db
      .update(users)
      .set({
        role: role as never,
        nome: responsavelNome ?? existingUser[0].nome,
        telefone: telefone ?? existingUser[0].telefone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } else {
    // Cria invitation no Clerk
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      "https://www.antecipaqui.digital";
    let inviteId: string;
    try {
      const clerk = await clerkClient();
      const inv = await clerk.invitations.createInvitation({
        emailAddress: responsavelEmail,
        publicMetadata: { role },
        redirectUrl: `${siteUrl}/painel`,
      });
      inviteId = inv.id;
    } catch (e) {
      return {
        ok: false,
        error:
          "Erro ao criar convite no Clerk: " + (e as Error).message,
      };
    }

    // Cria user placeholder no DB com id derivado do convite (será
    // sincronizado quando o user logar pela primeira vez).
    userId = `invited_${inviteId}`;
    await db.insert(users).values({
      id: userId,
      email: responsavelEmail,
      nome: responsavelNome,
      telefone,
      role: role as never,
      onboardingStatus: "documentos_enviados",
      isActive: true,
    });
  }

  // Comercial (admin pode escolher; default = Antecipaqui)
  let comercialId =
    String(formData.get("comercialId") || "").trim() || null;
  if (!comercialId) {
    const { getDefaultComercialId } = await import(
      "@/lib/actions/comerciais"
    );
    comercialId = (await getDefaultComercialId()) ?? null;
  }

  // Cria imobiliária vinculada ao user
  const [created] = await db
    .insert(imobiliarias)
    .values({
      ownerUserId: userId,
      comercialId,
      razaoSocial,
      nomeFantasia,
      cnpj,
      creciResponsavel: creci,
      telefone,
      cep,
      endereco,
      cidade,
      uf,
      bancoNome,
      bancoCodigo,
      bancoAgencia,
      bancoConta,
      possuiFiliais,
      apelido: "Matriz",
    })
    .returning({ id: imobiliarias.id });

  // Documentos opcionais (KYC)
  type DocTipo = "contrato_social" | "comprovante_endereco" | "cartao_cnpj";
  const docInputs: { field: string; tipo: DocTipo; nomeDefault: string }[] = [
    { field: "doc_contrato_social", tipo: "contrato_social", nomeDefault: "contrato_social.pdf" },
    {
      field: "doc_comprovante_endereco",
      tipo: "comprovante_endereco",
      nomeDefault: "comprovante_endereco.pdf",
    },
    { field: "doc_cartao_cnpj", tipo: "cartao_cnpj", nomeDefault: "cartao_cnpj.pdf" },
  ];
  const docsToInsert: Array<{
    tipo: DocTipo;
    url: string;
    nomeOriginal: string;
    userId: string;
    imobiliariaId: string;
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
      userId,
      imobiliariaId: created.id,
      validacaoStatus: v.validacaoStatus,
      validacaoConfianca: v.validacaoConfianca,
      validacaoMotivo: v.validacaoMotivo,
    });
  }
  if (docsToInsert.length > 0) {
    await db.insert(documentos).values(docsToInsert);
  }

  audit({
    action: "admin_cadastrou_imobiliaria",
    targetType: "user",
    targetId: userId,
    targetLabel: razaoSocial,
    metadata: {
      cnpj,
      email: responsavelEmail,
      role,
      imobiliariaId: created.id,
      docsEnviados: docsToInsert.length,
    },
  }).catch(() => undefined);

  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/cadastrar");
  return { ok: true, imobiliariaId: created.id };
}

/* =========================================
   ADMIN CADASTRA OPERAÇÃO
   ========================================= */

/** Lista corretores/imobiliárias ativos pra dropdown de cedente. */
export async function listCorretoresForSelector() {
  await requireAdmin();
  const rows = await db
    .select({
      id: users.id,
      nome: users.nome,
      email: users.email,
      role: users.role,
      imobNome: imobiliarias.razaoSocial,
      imobCnpj: imobiliarias.cnpj,
    })
    .from(users)
    .leftJoin(imobiliarias, eq(imobiliarias.ownerUserId, users.id))
    .where(sql`${users.role} IN ('corretor', 'imobiliaria') AND ${users.isActive} = true`)
    .orderBy(asc(users.nome));
  return rows;
}

/** Lista construtoras ativas pra dropdown. */
export async function listConstrutorasForSelector() {
  await requireAdmin();
  return db
    .select({
      id: construtoras.id,
      razaoSocial: construtoras.razaoSocial,
      nomeFantasia: construtoras.nomeFantasia,
      cnpj: construtoras.cnpj,
    })
    .from(construtoras)
    .where(eq(construtoras.isActive, true))
    .orderBy(asc(construtoras.razaoSocial));
}

export type CadastrarOpAdminState =
  | { ok: false; error: string }
  | { ok: true; operacaoId: string; numero: string }
  | null;

/**
 * Admin cria operação em nome de um corretor/imobiliária existente.
 * Bypassa validações de docs do KYC (admin é responsável).
 *
 * Espera: corretorUserId, construtoraId, valorVenda, valorComissao,
 * valorEntrada (opcional), dataVenda, parcelas (JSON [{valor, vencimento}]),
 * doc_comprovante_entrada (opcional), doc_contrato_venda, doc_contrato_comissao,
 * doc_nota_fiscal (opcionais — admin pode anexar depois)
 */
export async function adminCadastrarOperacaoAction(
  _prev: CadastrarOpAdminState,
  formData: FormData,
): Promise<CadastrarOpAdminState> {
  const admin = await requireAdmin();

  const corretorUserId = String(formData.get("corretorUserId") || "").trim();
  const construtoraId = String(formData.get("construtoraId") || "").trim();
  const comercialIdRaw =
    String(formData.get("comercialId") || "").trim() || null;
  if (!corretorUserId)
    return { ok: false, error: "Selecione a imobiliária / corretor cedente" };
  if (!construtoraId)
    return { ok: false, error: "Selecione a construtora" };

  // Se admin não escolheu comercial, atribui ao Antecipaqui (default)
  let comercialId = comercialIdRaw;
  if (!comercialId) {
    const { getDefaultComercialId } = await import(
      "@/lib/actions/comerciais"
    );
    comercialId = (await getDefaultComercialId()) ?? null;
  }

  const valorVenda = parseBRLNumber(String(formData.get("valorVenda") || ""));
  const valorComissao = parseBRLNumber(
    String(formData.get("valorComissao") || ""),
  );
  const valorEntradaRaw = String(formData.get("valorEntrada") || "").trim();
  const valorEntrada = valorEntradaRaw ? parseBRLNumber(valorEntradaRaw) : null;
  const dataVenda = String(formData.get("dataVenda") || "").trim();

  if (!valorVenda || valorVenda <= 0)
    return { ok: false, error: "Valor da venda inválido" };
  if (!valorComissao || valorComissao <= 0)
    return { ok: false, error: "Valor da comissão inválido" };
  if (valorComissao > valorVenda)
    return { ok: false, error: "Comissão maior que o valor da venda" };
  if (!dataVenda) return { ok: false, error: "Data da venda obrigatória" };

  // Parcelas
  const parcelasJson = String(formData.get("parcelas") || "[]");
  let parcelasRaw: { valor: unknown; vencimento: unknown }[] = [];
  try {
    parcelasRaw = JSON.parse(parcelasJson);
  } catch {
    return { ok: false, error: "Parcelas inválidas" };
  }
  if (!Array.isArray(parcelasRaw) || parcelasRaw.length === 0)
    return { ok: false, error: "Adicione pelo menos uma parcela" };
  if (parcelasRaw.length > 5)
    return { ok: false, error: "Limite de 5 parcelas" };

  const parcelas = parcelasRaw.map((p) => ({
    valor:
      typeof p.valor === "number" ? p.valor : parseBRLNumber(String(p.valor)),
    vencimento: String(p.vencimento ?? ""),
  }));

  const totalParcelas = parcelas.reduce((s, p) => s + p.valor, 0);
  if (Math.abs(totalParcelas - valorComissao) > 0.5) {
    return {
      ok: false,
      error: `Soma das parcelas (R$ ${totalParcelas.toFixed(2)}) não bate com a comissão (R$ ${valorComissao.toFixed(2)})`,
    };
  }

  // Imobiliária do corretor (se houver)
  const imob = (
    await db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, corretorUserId))
      .limit(1)
  )[0];

  // Fidelização: se a construtora está fidelizada a um fundo, vincula
  // automaticamente esse fundo + usa a taxa-base dele em vez da global.
  const [constru] = await db
    .select({
      fundoFidelizadoId: construtoras.fundoFidelizadoId,
    })
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
    .limit(1);

  let fundoIdAuto: string | null = null;
  let taxaMensal = await getTaxaMensal();
  if (constru?.fundoFidelizadoId) {
    // Antes de auto-vincular, conferir se a construtora não tá na blacklist
    // do fundo fidelizado. Se estiver, deixa fundoId=null e admin escolhe
    // outro na aprovação.
    const bl = await checkBlacklist(
      constru.fundoFidelizadoId,
      construtoraId,
    );
    if (!bl.blocked) {
      const [f] = await db
        .select({ id: fundos.id, taxaMensalBase: fundos.taxaMensalBase })
        .from(fundos)
        .where(eq(fundos.id, constru.fundoFidelizadoId))
        .limit(1);
      if (f) {
        fundoIdAuto = f.id;
        taxaMensal = parseFloat(f.taxaMensalBase);
      }
    }
  }

  // Calcula VP
  const today = new Date();
  const arr = parcelas.map((p) => {
    const venc = new Date(p.vencimento + "T00:00:00");
    const meses = Math.max(
      (venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30),
      0,
    );
    return { valor: p.valor, mesesAteVencimento: meses };
  });
  const vp = valorPresente(arr, taxaMensal);
  const desagio = valorComissao - vp;

  // Gera número OP-YYYY-XXXX
  const ano = new Date().getFullYear();
  const lastNumberRes = await db.execute(sql`
    SELECT MAX(CAST(SUBSTRING(numero FROM 'OP-${sql.raw(String(ano))}-(\\d+)') AS INTEGER)) AS max
    FROM operacoes WHERE numero LIKE ${`OP-${ano}-%`}
  `);
  const lastNum =
    ((lastNumberRes as unknown as { rows: { max: number | null }[] }).rows[0]
      ?.max ?? 0) || 0;
  const numero = `OP-${ano}-${String(lastNum + 1).padStart(4, "0")}`;

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
      corretorUserId,
      imobiliariaId: imob?.id ?? null,
      construtoraId,
      comercialId,
      fundoId: fundoIdAuto,
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      valorEntrada:
        valorEntrada && valorEntrada > 0
          ? String(valorEntrada.toFixed(2))
          : null,
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

  await db.insert(parcelasComissao).values(
    parcelas.map((p, i) => ({
      operacaoId: op.id,
      numero: i + 1,
      valor: String(p.valor.toFixed(2)),
      vencimento: p.vencimento,
      status: "a_vencer" as const,
    })),
  );

  // Documentos (opcionais — admin pode anexar depois pela página da operação)
  type DocRow = {
    tipo:
      | "contrato_venda"
      | "contrato_comissao"
      | "nota_fiscal"
      | "comprovante_entrada";
    url: string;
    nome: string;
  };
  const docRows: (DocRow & {
    nameBase: string;
  })[] = [];
  const addDoc = (
    field: string,
    tipo: DocRow["tipo"],
    fallbackName: string,
  ) => {
    const url = String(formData.get(field) || "").trim();
    if (!url) return;
    docRows.push({
      tipo,
      url,
      nome: String(formData.get(`${field}_nome`) || fallbackName),
      nameBase: field,
    });
  };
  addDoc("doc_contrato_venda", "contrato_venda", "contrato_venda.pdf");
  addDoc("doc_contrato_comissao", "contrato_comissao", "contrato_comissao.pdf");
  addDoc("doc_nota_fiscal", "nota_fiscal", "nota_fiscal.pdf");
  addDoc(
    "doc_comprovante_entrada",
    "comprovante_entrada",
    "comprovante_entrada.pdf",
  );
  if (docRows.length > 0) {
    await db.insert(documentos).values(
      docRows.map((d) => {
        const v = extractValidacao(formData, d.nameBase);
        return {
          tipo: d.tipo,
          url: d.url,
          nomeOriginal: d.nome,
          userId: corretorUserId,
          operacaoId: op.id,
          validacaoStatus: v.validacaoStatus,
          validacaoConfianca: v.validacaoConfianca,
          validacaoMotivo: v.validacaoMotivo,
        };
      }),
    );
  }

  audit({
    action: "admin_cadastrou_operacao",
    targetType: "operacao",
    targetId: op.id,
    targetLabel: numero,
    metadata: {
      corretorUserId,
      construtoraId,
      adminId: admin.id,
    },
  }).catch(() => undefined);

  revalidatePath("/admin/operacoes");
  return { ok: true, operacaoId: op.id, numero };
}

