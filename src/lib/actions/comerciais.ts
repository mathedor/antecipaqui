"use server";

import { revalidatePath } from "next/cache";
import { eq, desc, sql, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
  comerciais,
  users,
  operacoes,
  parcelasComissao,
  construtoras,
  imobiliarias,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ, isValidCPF, unmaskCPF } from "@/lib/cnpj";
import { audit } from "@/lib/audit";
import { calcLucroOperacao, calcComissaoComercial } from "@/lib/comercial-calc";

export type CadastrarComercialState =
  | { ok: false; error: string }
  | { ok: true; comercialId: string }
  | null;

/**
 * Admin cadastra um comercial (PF ou PJ).
 * Cria invitation Clerk + user placeholder + comercial row.
 *
 * Quando o comercial aceita o convite e faz primeiro login,
 * getCurrentDbUser detecta a publicMetadata.role='comercial' + comercialId
 * e vincula o user real ao comercial (similar ao fluxo de fundo).
 */
export async function cadastrarComercialAction(
  _prev: CadastrarComercialState,
  formData: FormData,
): Promise<CadastrarComercialState> {
  await requireAdmin();

  const tipoPessoa = String(formData.get("tipoPessoa") || "").trim();
  if (tipoPessoa !== "fisica" && tipoPessoa !== "juridica") {
    return { ok: false, error: "Selecione PF ou PJ" };
  }

  const nomeCompleto = String(formData.get("nomeCompleto") || "").trim();
  const apelido = String(formData.get("apelido") || "").trim() || null;
  const documentoRaw = String(formData.get("documento") || "");
  const cep = String(formData.get("cep") || "").trim() || null;
  const endereco = String(formData.get("endereco") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;
  const uf = String(formData.get("uf") || "").trim().toUpperCase() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const telefone =
    String(formData.get("telefone") || "").replace(/\D/g, "") || null;

  // Validações
  if (!nomeCompleto)
    return {
      ok: false,
      error: tipoPessoa === "fisica"
        ? "Nome completo é obrigatório"
        : "Razão social é obrigatória",
    };
  if (!email || !email.includes("@"))
    return { ok: false, error: "Email inválido" };

  let documento: string;
  if (tipoPessoa === "fisica") {
    documento = unmaskCPF(documentoRaw);
    if (!isValidCPF(documento))
      return { ok: false, error: "CPF inválido" };
  } else {
    documento = unmaskCNPJ(documentoRaw);
    if (!isValidCNPJ(documento))
      return { ok: false, error: "CNPJ inválido" };
  }

  // Verifica duplicata por documento
  const existingDoc = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.documento, documento))
    .limit(1);
  if (existingDoc[0]) {
    return {
      ok: false,
      error: `Já existe comercial cadastrado com esse ${tipoPessoa === "fisica" ? "CPF" : "CNPJ"} (${existingDoc[0].nomeCompleto}).`,
    };
  }

  // Verifica/cria user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;
  if (existingUser[0]) {
    // Atualiza role pra comercial se já existe
    userId = existingUser[0].id;
    await db
      .update(users)
      .set({
        role: "comercial" as never,
        nome: nomeCompleto,
        telefone,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } else {
    // Cria invitation Clerk
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
      "https://www.antecipaqui.digital";
    let inviteId: string;
    try {
      const clerk = await clerkClient();
      const inv = await clerk.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: { role: "comercial" },
        redirectUrl: `${siteUrl}/painel`,
      });
      inviteId = inv.id;
    } catch (e) {
      return {
        ok: false,
        error: "Erro ao criar convite no Clerk: " + (e as Error).message,
      };
    }

    // Cria user placeholder. Será sincronizado quando comercial logar.
    userId = `invited_${inviteId}`;
    await db.insert(users).values({
      id: userId,
      email,
      nome: nomeCompleto,
      telefone,
      role: "comercial" as never,
      onboardingStatus: "aprovado",
      isActive: true,
    });
  }

  // Cria comercial vinculado
  const [created] = await db
    .insert(comerciais)
    .values({
      ownerUserId: userId,
      tipoPessoa: tipoPessoa as "fisica" | "juridica",
      nomeCompleto,
      apelido,
      documento,
      cep,
      endereco,
      cidade,
      uf,
      email,
      telefone,
    })
    .returning({ id: comerciais.id });

  audit({
    action: "admin_cadastrou_comercial",
    targetType: "comercial",
    targetId: created.id,
    targetLabel: nomeCompleto,
    metadata: { tipoPessoa, email, documento, userId },
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
  revalidatePath("/admin/cadastrar");
  return { ok: true, comercialId: created.id };
}

export async function editComercialAction(
  _prev: CadastrarComercialState,
  formData: FormData,
): Promise<CadastrarComercialState> {
  await requireAdmin();

  const comercialId = String(formData.get("comercialId") || "").trim();
  if (!comercialId) return { ok: false, error: "ID inválido" };

  const tipoPessoa = String(formData.get("tipoPessoa") || "").trim();
  if (tipoPessoa !== "fisica" && tipoPessoa !== "juridica")
    return { ok: false, error: "Tipo de pessoa inválido" };

  const documentoRaw = String(formData.get("documento") || "");
  let documento: string;
  if (tipoPessoa === "fisica") {
    documento = unmaskCPF(documentoRaw);
    if (!isValidCPF(documento))
      return { ok: false, error: "CPF inválido" };
  } else {
    documento = unmaskCNPJ(documentoRaw);
    if (!isValidCNPJ(documento))
      return { ok: false, error: "CNPJ inválido" };
  }

  await db
    .update(comerciais)
    .set({
      tipoPessoa: tipoPessoa as "fisica" | "juridica",
      nomeCompleto: String(formData.get("nomeCompleto") || "").trim(),
      apelido: String(formData.get("apelido") || "").trim() || null,
      documento,
      cep: String(formData.get("cep") || "").trim() || null,
      endereco: String(formData.get("endereco") || "").trim() || null,
      cidade: String(formData.get("cidade") || "").trim() || null,
      uf: String(formData.get("uf") || "").trim().toUpperCase() || null,
      email: String(formData.get("email") || "").trim().toLowerCase(),
      telefone:
        String(formData.get("telefone") || "").replace(/\D/g, "") || null,
      updatedAt: new Date(),
    })
    .where(eq(comerciais.id, comercialId));

  audit({
    action: "update_comercial",
    targetType: "comercial",
    targetId: comercialId,
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
  revalidatePath(`/admin/comerciais/${comercialId}`);
  return { ok: true, comercialId };
}

export async function deleteComercialAction(comercialId: string) {
  await requireAdmin();
  const [c] = await db
    .select({ id: comerciais.id, nomeCompleto: comerciais.nomeCompleto, ownerUserId: comerciais.ownerUserId })
    .from(comerciais)
    .where(eq(comerciais.id, comercialId))
    .limit(1);
  if (!c) throw new Error("Comercial não encontrado");

  await db.delete(comerciais).where(eq(comerciais.id, comercialId));

  // Tenta deletar o user vinculado (best-effort)
  if (c.ownerUserId) {
    await db
      .delete(users)
      .where(eq(users.id, c.ownerUserId))
      .catch(() => undefined);
    if (!c.ownerUserId.startsWith("invited_")) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(c.ownerUserId);
      } catch (e) {
        console.error("[delete-comercial] Clerk:", e);
      }
    }
  }

  audit({
    action: "delete_comercial",
    targetType: "comercial",
    targetId: comercialId,
    targetLabel: c.nomeCompleto,
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
}

/* =========================================
   QUERIES
   ========================================= */

export async function listAllComerciais() {
  return db.select().from(comerciais).orderBy(desc(comerciais.createdAt));
}

export async function getComercialDetail(comercialId: string) {
  const [c] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.id, comercialId))
    .limit(1);
  if (!c) return null;

  const owner = c.ownerUserId
    ? (
        await db
          .select()
          .from(users)
          .where(eq(users.id, c.ownerUserId))
          .limit(1)
      )[0] ?? null
    : null;

  return { comercial: c, owner };
}

/**
 * Retorna o ID do comercial "Antecipaqui" (default fallback).
 * Cacheado em memória dentro do request.
 */
let _defaultCache: string | null = null;
export async function getDefaultComercialId(): Promise<string | null> {
  if (_defaultCache) return _defaultCache;
  const [c] = await db
    .select({ id: comerciais.id })
    .from(comerciais)
    .where(eq(comerciais.documento, "32708702000110"))
    .limit(1);
  _defaultCache = c?.id ?? null;
  return _defaultCache;
}

/** Lista comerciais ativos pra dropdown / selector. */
export async function listComerciaisForSelector() {
  return db
    .select({
      id: comerciais.id,
      nomeCompleto: comerciais.nomeCompleto,
      apelido: comerciais.apelido,
      documento: comerciais.documento,
      tipoPessoa: comerciais.tipoPessoa,
    })
    .from(comerciais)
    .where(eq(comerciais.isActive, true))
    .orderBy(comerciais.nomeCompleto);
}

export async function getCurrentComercial() {
  const { getCurrentDbUser } = await import("@/lib/auth-user");
  const user = await getCurrentDbUser();
  if (!user || user.role !== "comercial") return null;
  const [c] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.ownerUserId, user.id))
    .limit(1);
  return c ?? null;
}

/* =========================================
   DASHBOARD DO COMERCIAL
   ========================================= */

export async function getComercialDashboard(comercialId: string) {
  // Operações do comercial: diretas OU via construtora/imob com esse comercial
  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      status: operacoes.status,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      desagio: operacoes.desagio,
      createdAt: operacoes.createdAt,
      construtoraNome: construtoras.razaoSocial,
      construtoraId: operacoes.construtoraId,
      corretorNome: users.nome,
      imobiliariaNome: imobiliarias.razaoSocial,
    })
    .from(operacoes)
    .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
    .leftJoin(imobiliarias, eq(imobiliarias.id, operacoes.imobiliariaId))
    .leftJoin(users, eq(users.id, operacoes.corretorUserId))
    .where(
      or(
        eq(operacoes.comercialId, comercialId),
        eq(construtoras.comercialId, comercialId),
        eq(imobiliarias.comercialId, comercialId),
      ),
    )
    .orderBy(desc(operacoes.createdAt));

  const opIds = ops.map((o) => o.id);

  // Parcelas pra inadimplência + faturamento
  const parcelas = opIds.length
    ? await db
        .select()
        .from(parcelasComissao)
        .where(sql`${parcelasComissao.operacaoId} = ANY(${opIds})`)
    : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  let valorAVencer = 0;
  let valorVencido = 0;
  let faturadoNoMes = 0;
  for (const p of parcelas) {
    const v = parseFloat(p.valor);
    const venc = new Date(p.vencimento + "T00:00:00");
    if (p.status === "paga") {
      if (p.pagoEm && new Date(p.pagoEm + "T00:00:00") >= monthStart) {
        faturadoNoMes += parseFloat(p.pagoValor ?? p.valor);
      }
    } else {
      if (venc < today) valorVencido += v;
      else valorAVencer += v;
    }
  }

  // Lucro / comissão calculados em cima do deságio das ops aprovadas
  let comissaoAcumulada = 0;
  let comissaoPendente = 0;
  let comissaoRealizada = 0;
  for (const o of ops) {
    if (
      ["rascunho", "recusada", "cancelada"].includes(o.status)
    )
      continue;
    const desagio = parseFloat(o.desagio);
    const com = calcComissaoComercial(desagio);
    comissaoAcumulada += com;
    if (o.status === "realizada") comissaoRealizada += com;
    else comissaoPendente += com;
  }

  // Construtoras / imobiliárias distintas que ele atende
  const construtorasMap = new Map<
    string,
    { id: string; nome: string; qtd: number; valorOperado: number }
  >();
  for (const o of ops) {
    if (!o.construtoraId) continue;
    const cur = construtorasMap.get(o.construtoraId);
    const vp = parseFloat(o.valorPresente);
    if (cur) {
      cur.qtd++;
      cur.valorOperado += vp;
    } else {
      construtorasMap.set(o.construtoraId, {
        id: o.construtoraId,
        nome: o.construtoraNome ?? "—",
        qtd: 1,
        valorOperado: vp,
      });
    }
  }

  // Ranking por mês — gráfico de evolução
  const porMesRes = await db.execute(sql`
    SELECT
      to_char(date_trunc('month', o.created_at), 'YYYY-MM') AS month,
      COUNT(*)::int AS qtd,
      COALESCE(SUM(o.valor_presente)::float, 0) AS volume,
      COALESCE(SUM(o.desagio)::float, 0) AS juros
    FROM operacoes o
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    WHERE (o.comercial_id = ${comercialId}::uuid
      OR c.comercial_id = ${comercialId}::uuid
      OR im.comercial_id = ${comercialId}::uuid)
      AND o.status NOT IN ('rascunho', 'recusada', 'cancelada')
      AND o.created_at >= date_trunc('month', NOW()) - INTERVAL '11 months'
    GROUP BY date_trunc('month', o.created_at)
    ORDER BY date_trunc('month', o.created_at)
  `);
  type MesRow = {
    month: string;
    qtd: number;
    volume: number;
    juros: number;
  };
  const porMesRows = (
    porMesRes as unknown as { rows?: MesRow[] }
  ).rows ?? [];
  const porMes = porMesRows.map((m) => ({
    ...m,
    comissao: calcComissaoComercial(m.juros),
  }));

  return {
    totals: {
      qtdOperacoes: ops.length,
      valorAVencer,
      valorVencido,
      faturadoNoMes,
      comissaoAcumulada,
      comissaoRealizada,
      comissaoPendente,
      qtdConstrutoras: construtorasMap.size,
    },
    construtoras: Array.from(construtorasMap.values()).sort(
      (a, b) => b.valorOperado - a.valorOperado,
    ),
    operacoes: ops,
    porMes,
  };
}

/* =========================================
   ADMIN — RELATÓRIO DE DESEMPENHO DOS COMERCIAIS
   ========================================= */

export async function getDesempenhoComerciais(filters: {
  from?: string;
  to?: string;
} = {}) {
  await requireAdmin();
  const conds: ReturnType<typeof sql>[] = [
    sql`o.status NOT IN ('rascunho', 'recusada', 'cancelada')`,
  ];
  if (filters.from) conds.push(sql`o.created_at >= ${filters.from}::date`);
  if (filters.to)
    conds.push(
      sql`o.created_at <= (${filters.to}::date + interval '1 day')`,
    );
  const where = sql.join(conds, sql` AND `);

  const result = await db.execute(sql`
    SELECT
      cm.id,
      cm.nome_completo AS nome,
      cm.apelido,
      cm.tipo_pessoa,
      cm.email,
      COUNT(o.id)::int AS qtd_operacoes,
      COALESCE(SUM(o.valor_presente)::float, 0) AS volume_operado,
      COALESCE(SUM(o.valor_comissao)::float, 0) AS comissoes_intermediadas,
      COALESCE(SUM(o.desagio)::float, 0) AS juros_total,
      COUNT(o.id) FILTER (WHERE o.status = 'realizada')::int AS qtd_realizadas
    FROM comerciais cm
    LEFT JOIN operacoes o
      ON (o.comercial_id = cm.id
        OR o.construtora_id IN (SELECT id FROM construtoras WHERE comercial_id = cm.id)
        OR o.imobiliaria_id IN (SELECT id FROM imobiliarias WHERE comercial_id = cm.id))
      AND ${where}
    WHERE cm.is_active = TRUE
    GROUP BY cm.id, cm.nome_completo, cm.apelido, cm.tipo_pessoa, cm.email
    ORDER BY volume_operado DESC, qtd_operacoes DESC
  `);

  type Row = {
    id: string;
    nome: string;
    apelido: string | null;
    tipo_pessoa: string;
    email: string;
    qtd_operacoes: number;
    volume_operado: number;
    comissoes_intermediadas: number;
    juros_total: number;
    qtd_realizadas: number;
  };
  const rows = (result as unknown as { rows: Row[] }).rows;

  return rows.map((r) => ({
    id: r.id,
    nome: r.nome,
    apelido: r.apelido,
    tipoPessoa: r.tipo_pessoa,
    email: r.email,
    qtdOperacoes: Number(r.qtd_operacoes),
    qtdRealizadas: Number(r.qtd_realizadas),
    volumeOperado: Number(r.volume_operado),
    comissoesIntermediadas: Number(r.comissoes_intermediadas),
    jurosTotal: Number(r.juros_total),
    lucroLiquido: calcLucroOperacao(Number(r.juros_total)),
    comissaoComercial: calcComissaoComercial(Number(r.juros_total)),
  }));
}
