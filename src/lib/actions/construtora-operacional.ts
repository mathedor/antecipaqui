"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  documentos,
  documentoSolicitacoes,
  empreendimentos,
  fundos,
  operacoes,
  parcelaAntecipacoes,
  parcelaRenegociacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { notify } from "@/lib/notify";

/** Carrega a construtora do user logado. Erro se não for role=construtora
 *  ou não tiver construtora vinculada. */
async function requireConstrutoraOwner() {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  if (user.role !== "construtora")
    throw new Error("Apenas construtora");
  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) throw new Error("Construtora não vinculada ao seu usuário");
  return { user, construtora: c };
}

function parseBRLNumber(s: string): number {
  if (!s) return 0;
  const cleaned = s
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  return parseFloat(cleaned);
}

/* =========================================================================
   EMPREENDIMENTOS
   ========================================================================= */

export async function listEmpreendimentosDaConstrutora() {
  const { construtora } = await requireConstrutoraOwner();
  return db
    .select()
    .from(empreendimentos)
    .where(eq(empreendimentos.construtoraId, construtora.id))
    .orderBy(desc(empreendimentos.isActive), asc(empreendimentos.nome));
}

export type UpsertEmpreendimentoState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

export async function upsertEmpreendimentoAction(
  _prev: UpsertEmpreendimentoState,
  formData: FormData,
): Promise<UpsertEmpreendimentoState> {
  const { construtora } = await requireConstrutoraOwner();
  const id = String(formData.get("id") || "").trim();
  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim();
  const cidade = String(formData.get("cidade") || "").trim();
  const uf = String(formData.get("uf") || "").trim().toUpperCase();

  if (!nome) return { ok: false, error: "Informe o nome do empreendimento" };

  if (id) {
    // Garante que o empreendimento é da construtora do user
    const [e] = await db
      .select({ construtoraId: empreendimentos.construtoraId })
      .from(empreendimentos)
      .where(eq(empreendimentos.id, id))
      .limit(1);
    if (!e || e.construtoraId !== construtora.id)
      return { ok: false, error: "Empreendimento não pertence à sua construtora" };

    await db
      .update(empreendimentos)
      .set({
        nome,
        descricao: descricao || null,
        cidade: cidade || null,
        uf: uf || null,
        updatedAt: new Date(),
      })
      .where(eq(empreendimentos.id, id));
    revalidatePath("/painel/empreendimentos");
    return { ok: true, id };
  }

  const [created] = await db
    .insert(empreendimentos)
    .values({
      construtoraId: construtora.id,
      nome,
      descricao: descricao || null,
      cidade: cidade || null,
      uf: uf || null,
    })
    .returning();
  revalidatePath("/painel/empreendimentos");
  return { ok: true, id: created.id };
}

export async function toggleEmpreendimentoActiveAction(
  id: string,
  ativo: boolean,
) {
  const { construtora } = await requireConstrutoraOwner();
  const [e] = await db
    .select({ construtoraId: empreendimentos.construtoraId })
    .from(empreendimentos)
    .where(eq(empreendimentos.id, id))
    .limit(1);
  if (!e || e.construtoraId !== construtora.id)
    throw new Error("Empreendimento não pertence à sua construtora");
  await db
    .update(empreendimentos)
    .set({ isActive: ativo, updatedAt: new Date() })
    .where(eq(empreendimentos.id, id));
  revalidatePath("/painel/empreendimentos");
}

/** Linka empreendimento a uma operação (admin ou construtora dona). */
export async function linkarEmpreendimentoOperacao(
  operacaoId: string,
  empreendimentoId: string | null,
) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");

  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) throw new Error("Operação não encontrada");

  // Admin pode tudo. Construtora só se for dona.
  if (user.role !== "admin") {
    if (user.role !== "construtora")
      throw new Error("Sem permissão");
    const [c] = await db
      .select()
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, user.id))
      .limit(1);
    if (!c || c.id !== op.construtoraId)
      throw new Error("Operação não pertence à sua construtora");
  }

  if (empreendimentoId) {
    const [e] = await db
      .select({ construtoraId: empreendimentos.construtoraId })
      .from(empreendimentos)
      .where(eq(empreendimentos.id, empreendimentoId))
      .limit(1);
    if (!e || e.construtoraId !== op.construtoraId)
      throw new Error(
        "Empreendimento não pertence à construtora desta operação",
      );
  }

  await db
    .update(operacoes)
    .set({ empreendimentoId, updatedAt: new Date() })
    .where(eq(operacoes.id, operacaoId));

  revalidatePath(`/admin/operacoes/${operacaoId}`);
  revalidatePath(`/painel/operacoes/${operacaoId}`);
  revalidatePath("/painel/empreendimentos");
}

/* =========================================================================
   COMPROVANTE DE PAGAMENTO
   ========================================================================= */

export type AnexarComprovanteState =
  | { ok: false; error: string }
  | { ok: true }
  | null;

export async function anexarComprovantePagamento(
  _prev: AnexarComprovanteState,
  formData: FormData,
): Promise<AnexarComprovanteState> {
  const { construtora } = await requireConstrutoraOwner();
  const parcelaId = String(formData.get("parcelaId") || "").trim();
  const url = String(formData.get("url") || "").trim();
  const nome = String(formData.get("nome") || "").trim();
  const valorPago = parseBRLNumber(String(formData.get("valorPago") || ""));
  const dataPagamento = String(formData.get("dataPagamento") || "").trim();

  if (!parcelaId || !url)
    return { ok: false, error: "Parcela ou URL ausente" };

  // Valida que a parcela é de uma op da construtora
  const [row] = await db
    .select({ parcela: parcelasComissao, operacao: operacoes })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(eq(parcelasComissao.id, parcelaId))
    .limit(1);
  if (!row) return { ok: false, error: "Parcela não encontrada" };
  if (row.operacao.construtoraId !== construtora.id)
    return { ok: false, error: "Parcela não pertence à sua construtora" };

  await db
    .update(parcelasComissao)
    .set({
      comprovanteUrl: url,
      comprovanteNome: nome || "comprovante",
      pagoNotificacaoEm: new Date(),
      pagoEm:
        dataPagamento || new Date().toISOString().slice(0, 10),
      pagoValor:
        Number.isFinite(valorPago) && valorPago > 0
          ? valorPago.toFixed(2)
          : row.parcela.valor,
    })
    .where(eq(parcelasComissao.id, parcelaId));

  // Notifica admin
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  for (const a of admins) {
    await notify({
      userId: a.id,
      type: "parcela_comprovante",
      title: `Comprovante de pagamento anexado · op ${row.operacao.numero}`,
      body: `Construtora ${construtora.razaoSocial} anexou comprovante na parcela ${row.parcela.numero}.`,
      link: `/admin/operacoes/${row.operacao.id}`,
    }).catch(() => undefined);
  }

  revalidatePath("/painel/duplicatas");
  return { ok: true };
}

/* =========================================================================
   PAGAMENTO EM LOTE
   ========================================================================= */

export async function notificarPagamentoLote(
  parcelaIds: string[],
  url: string,
  nome: string,
  dataPagamento: string,
) {
  const { construtora } = await requireConstrutoraOwner();
  if (parcelaIds.length === 0)
    throw new Error("Selecione ao menos uma parcela");
  if (!url) throw new Error("URL do comprovante ausente");

  // Filtra parcelas que pertencem à construtora
  const validas = await db
    .select({ parcela: parcelasComissao, operacao: operacoes })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(
      and(
        inArray(parcelasComissao.id, parcelaIds),
        eq(operacoes.construtoraId, construtora.id),
      ),
    );

  if (validas.length === 0)
    throw new Error("Nenhuma parcela válida pra construtora");

  const idsValidos = validas.map((v) => v.parcela.id);
  const data = dataPagamento || new Date().toISOString().slice(0, 10);

  await db
    .update(parcelasComissao)
    .set({
      comprovanteUrl: url,
      comprovanteNome: nome || "comprovante",
      pagoNotificacaoEm: new Date(),
      pagoEm: data,
    })
    .where(inArray(parcelasComissao.id, idsValidos));

  // Notifica admins
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  for (const a of admins) {
    await notify({
      userId: a.id,
      type: "parcela_comprovante_lote",
      title: `${idsValidos.length} parcela(s) com comprovante anexado`,
      body: `Construtora ${construtora.razaoSocial} pagou em lote.`,
      link: `/admin/relatorios/daily`,
    }).catch(() => undefined);
  }

  revalidatePath("/painel/duplicatas");
  return { qtd: idsValidos.length };
}

/* =========================================================================
   ANTECIPAÇÃO DE PAGAMENTO
   ========================================================================= */

export type SolicitarAntecipacaoState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

export async function solicitarAntecipacaoAction(
  _prev: SolicitarAntecipacaoState,
  formData: FormData,
): Promise<SolicitarAntecipacaoState> {
  const { user, construtora } = await requireConstrutoraOwner();
  const parcelaId = String(formData.get("parcelaId") || "").trim();
  const descontoRaw = String(formData.get("descontoPct") || "").trim();
  const dataPretendida = String(formData.get("dataPretendida") || "").trim();

  if (!parcelaId) return { ok: false, error: "parcelaId obrigatório" };
  if (!dataPretendida)
    return { ok: false, error: "Informe a data pretendida" };

  const desconto = parseFloat(
    descontoRaw.replace(",", ".").replace("%", ""),
  );
  if (!Number.isFinite(desconto) || desconto < 0)
    return { ok: false, error: "Desconto inválido" };
  const descontoPct = desconto >= 1 ? desconto / 100 : desconto;
  if (descontoPct > 0.5)
    return { ok: false, error: "Desconto > 50% inviável, ajuste" };

  const [row] = await db
    .select({ parcela: parcelasComissao, operacao: operacoes })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(eq(parcelasComissao.id, parcelaId))
    .limit(1);
  if (!row) return { ok: false, error: "Parcela não encontrada" };
  if (row.operacao.construtoraId !== construtora.id)
    return { ok: false, error: "Parcela não pertence à sua construtora" };
  if (row.parcela.status === "paga")
    return { ok: false, error: "Parcela já paga" };

  const valorOriginal = parseFloat(row.parcela.valor);
  const valorAntecipado = valorOriginal * (1 - descontoPct);

  const [created] = await db
    .insert(parcelaAntecipacoes)
    .values({
      parcelaId,
      solicitadoPorUserId: user.id,
      valorOriginal: valorOriginal.toFixed(2),
      valorAntecipado: valorAntecipado.toFixed(2),
      descontoPct: descontoPct.toFixed(4),
      dataPretendida,
      status: "pendente",
    })
    .returning();

  // Notifica admin + fundo
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  const destinatarios = [...admins.map((a) => a.id)];
  if (row.operacao.fundoId) {
    const [f] = await db
      .select({ ownerUserId: fundos.ownerUserId })
      .from(fundos)
      .where(eq(fundos.id, row.operacao.fundoId))
      .limit(1);
    if (f?.ownerUserId) destinatarios.push(f.ownerUserId);
  }
  for (const uid of destinatarios) {
    await notify({
      userId: uid,
      type: "antecipacao_solicitada",
      title: `Antecipação solicitada · op ${row.operacao.numero}`,
      body: `Construtora pediu pra antecipar a parcela ${row.parcela.numero} com ${(descontoPct * 100).toFixed(2)}% de desconto.`,
      link: `/admin/operacoes/${row.operacao.id}`,
    }).catch(() => undefined);
  }

  revalidatePath("/painel/duplicatas");
  return { ok: true, id: created.id };
}

export async function decidirAntecipacaoAction(
  antecipacaoId: string,
  aprovar: boolean,
  motivoRecusa?: string,
) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  if (user.role !== "admin" && user.role !== "fundo")
    throw new Error("Apenas admin ou fundo decide");

  const [a] = await db
    .select()
    .from(parcelaAntecipacoes)
    .where(eq(parcelaAntecipacoes.id, antecipacaoId))
    .limit(1);
  if (!a) throw new Error("Antecipação não encontrada");
  if (a.status !== "pendente")
    throw new Error("Antecipação já decidida");

  if (!aprovar && !motivoRecusa)
    throw new Error("Motivo da recusa obrigatório");

  await db
    .update(parcelaAntecipacoes)
    .set({
      status: aprovar ? "aprovada" : "recusada",
      motivoRecusa: aprovar ? null : motivoRecusa!,
      decidoPorUserId: user.id,
      decidoEm: new Date(),
    })
    .where(eq(parcelaAntecipacoes.id, antecipacaoId));

  // Notifica solicitante
  await notify({
    userId: a.solicitadoPorUserId,
    type: aprovar ? "antecipacao_aprovada" : "antecipacao_recusada",
    title: aprovar
      ? "Antecipação aprovada"
      : "Antecipação recusada",
    body: aprovar
      ? `Pode pagar R$ ${parseFloat(a.valorAntecipado).toFixed(2)} até ${a.dataPretendida}.`
      : `Motivo: ${motivoRecusa}`,
    link: "/painel/duplicatas",
  }).catch(() => undefined);

  // Webhook externo
  {
    const [pRow] = await db
      .select({
        parcelaId: parcelasComissao.id,
        parcelaNumero: parcelasComissao.numero,
        operacaoId: operacoes.id,
        operacaoNumero: operacoes.numero,
        fundoId: operacoes.fundoId,
        construtoraId: operacoes.construtoraId,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
      .where(eq(parcelasComissao.id, a.parcelaId))
      .limit(1);
    if (pRow) {
      const { enqueueWebhookEvento } = await import("@/lib/actions/webhooks");
      enqueueWebhookEvento({
        evento: "antecipacao_decisao",
        fundoId: pRow.fundoId,
        payload: {
          antecipacaoId,
          parcelaId: pRow.parcelaId,
          parcelaNumero: pRow.parcelaNumero,
          operacaoId: pRow.operacaoId,
          operacaoNumero: pRow.operacaoNumero,
          decisao: aprovar ? "aprovada" : "recusada",
          motivoRecusa: aprovar ? null : motivoRecusa ?? null,
          valorOriginal: parseFloat(a.valorOriginal),
          valorAntecipado: parseFloat(a.valorAntecipado),
          dataPretendida: a.dataPretendida,
          fundoId: pRow.fundoId,
          construtoraId: pRow.construtoraId,
        },
      }).catch((e) =>
        console.error("[webhook] decidirAntecipacao:", e),
      );
    }
  }

  revalidatePath("/painel/duplicatas");
  revalidatePath("/admin/operacoes");
}

/* =========================================================================
   RENEGOCIAÇÃO
   ========================================================================= */

export type SolicitarRenegociacaoState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

export async function solicitarRenegociacaoAction(
  _prev: SolicitarRenegociacaoState,
  formData: FormData,
): Promise<SolicitarRenegociacaoState> {
  const { user, construtora } = await requireConstrutoraOwner();
  const parcelaId = String(formData.get("parcelaId") || "").trim();
  const motivo = String(formData.get("motivo") || "").trim();
  const tipo = String(formData.get("tipo") || "prorrogar").trim();
  const novoVencimento =
    String(formData.get("novoVencimento") || "").trim() || null;
  const splitRaw = String(formData.get("splitParcelas") || "").trim();

  if (!parcelaId) return { ok: false, error: "parcelaId obrigatório" };
  if (!motivo) return { ok: false, error: "Justifique a renegociação" };
  if (tipo !== "prorrogar" && tipo !== "dividir")
    return { ok: false, error: "Tipo inválido" };

  const [row] = await db
    .select({ parcela: parcelasComissao, operacao: operacoes })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(eq(parcelasComissao.id, parcelaId))
    .limit(1);
  if (!row) return { ok: false, error: "Parcela não encontrada" };
  if (row.operacao.construtoraId !== construtora.id)
    return { ok: false, error: "Parcela não pertence à sua construtora" };
  if (row.parcela.status === "paga")
    return { ok: false, error: "Parcela já paga" };

  let splitParcelas: unknown = null;
  if (tipo === "prorrogar" && !novoVencimento)
    return { ok: false, error: "Informe o novo vencimento" };
  if (tipo === "dividir") {
    if (!splitRaw)
      return { ok: false, error: "Informe o split em JSON" };
    try {
      splitParcelas = JSON.parse(splitRaw);
      if (!Array.isArray(splitParcelas) || splitParcelas.length < 2)
        return { ok: false, error: "Split precisa ter ≥2 parcelas" };
    } catch {
      return { ok: false, error: "JSON inválido no split" };
    }
  }

  const [created] = await db
    .insert(parcelaRenegociacoes)
    .values({
      parcelaId,
      solicitadoPorUserId: user.id,
      motivo,
      tipo,
      novoVencimento: novoVencimento || null,
      splitParcelas: splitParcelas as never,
      status: "pendente",
    })
    .returning();

  const destinatarios: string[] = [];
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));
  destinatarios.push(...admins.map((a) => a.id));
  if (row.operacao.fundoId) {
    const [f] = await db
      .select({ ownerUserId: fundos.ownerUserId })
      .from(fundos)
      .where(eq(fundos.id, row.operacao.fundoId))
      .limit(1);
    if (f?.ownerUserId) destinatarios.push(f.ownerUserId);
  }
  for (const uid of destinatarios) {
    await notify({
      userId: uid,
      type: "renegociacao_solicitada",
      title: `Renegociação solicitada · op ${row.operacao.numero}`,
      body: `Construtora pediu pra ${tipo} a parcela ${row.parcela.numero}.`,
      link: `/admin/operacoes/${row.operacao.id}`,
    }).catch(() => undefined);
  }

  revalidatePath("/painel/duplicatas");
  return { ok: true, id: created.id };
}

export async function decidirRenegociacaoAction(
  renegociacaoId: string,
  aprovar: boolean,
  motivoRecusa?: string,
) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  if (user.role !== "admin" && user.role !== "fundo")
    throw new Error("Apenas admin ou fundo decide");

  const [r] = await db
    .select()
    .from(parcelaRenegociacoes)
    .where(eq(parcelaRenegociacoes.id, renegociacaoId))
    .limit(1);
  if (!r) throw new Error("Renegociação não encontrada");
  if (r.status !== "pendente")
    throw new Error("Renegociação já decidida");

  if (!aprovar && !motivoRecusa)
    throw new Error("Motivo da recusa obrigatório");

  await db
    .update(parcelaRenegociacoes)
    .set({
      status: aprovar ? "aprovada" : "recusada",
      motivoRecusa: aprovar ? null : motivoRecusa!,
      decidoPorUserId: user.id,
      decidoEm: new Date(),
    })
    .where(eq(parcelaRenegociacoes.id, renegociacaoId));

  // Se aprovou: aplica a mudança
  if (aprovar) {
    if (r.tipo === "prorrogar" && r.novoVencimento) {
      await db
        .update(parcelasComissao)
        .set({ vencimento: r.novoVencimento })
        .where(eq(parcelasComissao.id, r.parcelaId));
    } else if (r.tipo === "dividir" && Array.isArray(r.splitParcelas)) {
      // Pega a parcela original pra clonar metadados
      const [original] = await db
        .select()
        .from(parcelasComissao)
        .where(eq(parcelasComissao.id, r.parcelaId))
        .limit(1);
      if (original) {
        // Marca original como cancelada (status especial 'renegociada')
        await db
          .update(parcelasComissao)
          .set({ status: "cancelada" })
          .where(eq(parcelasComissao.id, r.parcelaId));
        // Cria parcelas novas
        const splits = r.splitParcelas as Array<{
          vencimento: string;
          valor: number;
        }>;
        let maxNumero = original.numero;
        const [{ max }] = await db
          .select({
            max: sql<number>`COALESCE(MAX(${parcelasComissao.numero}), 0)`,
          })
          .from(parcelasComissao)
          .where(eq(parcelasComissao.operacaoId, original.operacaoId));
        maxNumero = max ?? maxNumero;
        const novas = splits.map((s, i) => ({
          operacaoId: original.operacaoId,
          numero: maxNumero + i + 1,
          valor: s.valor.toFixed(2),
          vencimento: s.vencimento,
          status: "a_vencer" as const,
        }));
        if (novas.length > 0)
          await db.insert(parcelasComissao).values(novas);
      }
    }
    await db
      .update(parcelaRenegociacoes)
      .set({ status: "aplicada" })
      .where(eq(parcelaRenegociacoes.id, renegociacaoId));
  }

  // Notifica solicitante
  await notify({
    userId: r.solicitadoPorUserId,
    type: aprovar ? "renegociacao_aprovada" : "renegociacao_recusada",
    title: aprovar ? "Renegociação aprovada" : "Renegociação recusada",
    body: aprovar
      ? "A parcela foi atualizada com as novas condições."
      : `Motivo: ${motivoRecusa}`,
    link: "/painel/duplicatas",
  }).catch(() => undefined);

  // Webhook externo
  {
    const [pRow] = await db
      .select({
        parcelaId: parcelasComissao.id,
        parcelaNumero: parcelasComissao.numero,
        operacaoId: operacoes.id,
        operacaoNumero: operacoes.numero,
        fundoId: operacoes.fundoId,
        construtoraId: operacoes.construtoraId,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
      .where(eq(parcelasComissao.id, r.parcelaId))
      .limit(1);
    if (pRow) {
      const { enqueueWebhookEvento } = await import("@/lib/actions/webhooks");
      enqueueWebhookEvento({
        evento: "renegociacao_decisao",
        fundoId: pRow.fundoId,
        payload: {
          renegociacaoId,
          parcelaId: pRow.parcelaId,
          parcelaNumero: pRow.parcelaNumero,
          operacaoId: pRow.operacaoId,
          operacaoNumero: pRow.operacaoNumero,
          decisao: aprovar ? "aprovada" : "recusada",
          tipo: r.tipo,
          novoVencimento: r.novoVencimento ?? null,
          motivoRecusa: aprovar ? null : motivoRecusa ?? null,
          fundoId: pRow.fundoId,
          construtoraId: pRow.construtoraId,
        },
      }).catch((e) =>
        console.error("[webhook] decidirRenegociacao:", e),
      );
    }
  }

  revalidatePath("/painel/duplicatas");
  revalidatePath("/admin/operacoes");
}

/* =========================================================================
   CENTRAL DE DOCUMENTOS DA CONSTRUTORA
   ========================================================================= */

export async function listDocumentosConstrutora(opts?: {
  q?: string;
  tipo?: string;
  operacaoId?: string;
}) {
  const { construtora } = await requireConstrutoraOwner();

  // Docs anexados em ops da construtora OU anexados direto à construtora
  const conds = [] as ReturnType<typeof eq>[];
  conds.push(eq(operacoes.construtoraId, construtora.id));
  if (opts?.q)
    conds.push(
      sql`${documentos.nomeOriginal} ILIKE ${`%${opts.q}%`}` as never,
    );
  if (opts?.tipo)
    conds.push(eq(documentos.tipo, opts.tipo as never));
  if (opts?.operacaoId)
    conds.push(eq(documentos.operacaoId, opts.operacaoId));

  // Docs vinculados a operações da construtora
  const docsOp = await db
    .select({
      id: documentos.id,
      tipo: documentos.tipo,
      url: documentos.url,
      nome: documentos.nomeOriginal,
      sizeBytes: documentos.sizeBytes,
      mimeType: documentos.mimeType,
      validacaoStatus: documentos.validacaoStatus,
      createdAt: documentos.createdAt,
      operacaoId: documentos.operacaoId,
      operacaoNumero: operacoes.numero,
    })
    .from(documentos)
    .innerJoin(operacoes, eq(operacoes.id, documentos.operacaoId))
    .where(and(...conds))
    .orderBy(desc(documentos.createdAt));

  // Docs vinculados diretamente à construtora (sem op)
  const docsConst = await db
    .select({
      id: documentos.id,
      tipo: documentos.tipo,
      url: documentos.url,
      nome: documentos.nomeOriginal,
      sizeBytes: documentos.sizeBytes,
      mimeType: documentos.mimeType,
      validacaoStatus: documentos.validacaoStatus,
      createdAt: documentos.createdAt,
      operacaoId: documentos.operacaoId,
      operacaoNumero: sql<string | null>`NULL`,
    })
    .from(documentos)
    .where(eq(documentos.construtoraId, construtora.id))
    .orderBy(desc(documentos.createdAt));

  return [...docsOp, ...docsConst];
}

/* =========================================================================
   SOLICITAÇÕES DE DOCUMENTO (pendências)
   ========================================================================= */

export async function listMinhasSolicitacoesDocumento() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  let construtoraId: string | null = null;
  if (user.role === "construtora") {
    const [c] = await db
      .select({ id: construtoras.id })
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, user.id))
      .limit(1);
    construtoraId = c?.id ?? null;
  }

  const conds = [eq(documentoSolicitacoes.status, "pendente" as never)];
  if (construtoraId) {
    conds.push(
      sql`(${documentoSolicitacoes.destConstrutoraId} = ${construtoraId}::uuid OR ${documentoSolicitacoes.destUserId} = ${user.id})` as never,
    );
  } else {
    conds.push(eq(documentoSolicitacoes.destUserId, user.id));
  }

  return db
    .select({
      id: documentoSolicitacoes.id,
      tipoDocumento: documentoSolicitacoes.tipoDocumento,
      mensagem: documentoSolicitacoes.mensagem,
      operacaoId: documentoSolicitacoes.operacaoId,
      createdAt: documentoSolicitacoes.createdAt,
      solicitadoPorNome: users.nome,
      solicitadoPorEmail: users.email,
    })
    .from(documentoSolicitacoes)
    .leftJoin(users, eq(users.id, documentoSolicitacoes.solicitadoPorUserId))
    .where(and(...conds))
    .orderBy(desc(documentoSolicitacoes.createdAt));
}

export type CriarSolicitacaoState =
  | { ok: false; error: string }
  | { ok: true; id: string }
  | null;

/** Admin/fundo cria pendência de documento pra construtora ou user específico. */
export async function criarSolicitacaoDocumento(
  _prev: CriarSolicitacaoState,
  formData: FormData,
): Promise<CriarSolicitacaoState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "admin" && user.role !== "fundo")
    return { ok: false, error: "Apenas admin/fundo" };

  const destConstrutoraId =
    String(formData.get("destConstrutoraId") || "").trim() || null;
  const destUserId =
    String(formData.get("destUserId") || "").trim() || null;
  const operacaoId =
    String(formData.get("operacaoId") || "").trim() || null;
  const tipoDocumento = String(formData.get("tipoDocumento") || "").trim();
  const mensagem = String(formData.get("mensagem") || "").trim();

  if (!destConstrutoraId && !destUserId)
    return { ok: false, error: "Informe destinatário" };
  if (!tipoDocumento)
    return { ok: false, error: "Informe o tipo de documento" };
  if (!mensagem) return { ok: false, error: "Informe a mensagem" };

  const [created] = await db
    .insert(documentoSolicitacoes)
    .values({
      destConstrutoraId,
      destUserId,
      operacaoId,
      tipoDocumento,
      mensagem,
      solicitadoPorUserId: user.id,
      status: "pendente",
    })
    .returning();

  // Notifica destinatários
  const targets: string[] = [];
  if (destUserId) targets.push(destUserId);
  if (destConstrutoraId) {
    const [c] = await db
      .select({ ownerUserId: construtoras.ownerUserId })
      .from(construtoras)
      .where(eq(construtoras.id, destConstrutoraId))
      .limit(1);
    if (c?.ownerUserId) targets.push(c.ownerUserId);
  }
  for (const uid of targets) {
    await notify({
      userId: uid,
      type: "doc_solicitado",
      title: `Documento solicitado: ${tipoDocumento}`,
      body: mensagem.slice(0, 200),
      link: "/painel/pendencias",
    }).catch(() => undefined);
  }

  revalidatePath("/painel/pendencias");
  return { ok: true, id: created.id };
}

export async function marcarSolicitacaoAtendida(
  solicitacaoId: string,
  documentoId?: string,
) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  await db
    .update(documentoSolicitacoes)
    .set({
      status: "atendida",
      atendidaEm: new Date(),
      documentoIdAnexado: documentoId ?? null,
    })
    .where(eq(documentoSolicitacoes.id, solicitacaoId));
  revalidatePath("/painel/pendencias");
}

/* =========================================================================
   EXTRATO DA CONSTRUTORA
   ========================================================================= */

export type ExtratoLinha = {
  data: string;
  tipo: "parcela_paga" | "parcela_a_vencer" | "parcela_vencida";
  operacaoNumero: string;
  parcelaNumero: number;
  valor: number;
  valorPago: number | null;
};

export async function getExtratoConstrutora(opts?: {
  from?: string;
  to?: string;
}): Promise<{ linhas: ExtratoLinha[]; totais: { pago: number; aberto: number; vencido: number } }> {
  const { construtora } = await requireConstrutoraOwner();

  const conds = [eq(operacoes.construtoraId, construtora.id)];
  if (opts?.from)
    conds.push(gte(parcelasComissao.vencimento, opts.from));
  if (opts?.to)
    conds.push(lte(parcelasComissao.vencimento, opts.to));

  const rows = await db
    .select({
      vencimento: parcelasComissao.vencimento,
      pagoEm: parcelasComissao.pagoEm,
      valor: parcelasComissao.valor,
      pagoValor: parcelasComissao.pagoValor,
      status: parcelasComissao.status,
      operacaoNumero: operacoes.numero,
      parcelaNumero: parcelasComissao.numero,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(and(...conds))
    .orderBy(asc(parcelasComissao.vencimento));

  const hoje = new Date().toISOString().slice(0, 10);
  const linhas: ExtratoLinha[] = rows.map((r) => {
    const valor = parseFloat(r.valor);
    const valorPago = r.pagoValor ? parseFloat(r.pagoValor) : null;
    const tipo: ExtratoLinha["tipo"] =
      r.status === "paga"
        ? "parcela_paga"
        : r.vencimento < hoje
          ? "parcela_vencida"
          : "parcela_a_vencer";
    return {
      data: r.pagoEm ?? r.vencimento,
      tipo,
      operacaoNumero: r.operacaoNumero,
      parcelaNumero: r.parcelaNumero,
      valor,
      valorPago,
    };
  });

  const totais = linhas.reduce(
    (acc, l) => {
      if (l.tipo === "parcela_paga") acc.pago += l.valorPago ?? l.valor;
      else if (l.tipo === "parcela_vencida") acc.vencido += l.valor;
      else acc.aberto += l.valor;
      return acc;
    },
    { pago: 0, aberto: 0, vencido: 0 },
  );

  return { linhas, totais };
}
