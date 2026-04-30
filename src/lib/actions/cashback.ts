"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  operacaoEvents,
  operacoes,
  ticketMessages,
  tickets,
  users,
} from "@/db/schema";
import { getCurrentDbUser, requireAdmin } from "@/lib/auth-user";
import { notify } from "@/lib/notify";

/* ============================================================
   CONSTRUTORA — visualizar cashback acumulado + extrato
   ============================================================ */

/**
 * Resumo de cashback da construtora autenticada.
 * - saldoDisponivel: soma de cashback_valor onde sacado_em IS NULL
 * - totalAcumulado: soma sempre (independente de saque)
 * - totalSacado: soma de cashback_valor com sacado_em definido
 * - operacoes: lista de operações com cashback (concedido)
 */
export async function getCashbackSummaryForCurrentConstrutora() {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "construtora") return null;

  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return null;

  const ops = await db
    .select({
      id: operacoes.id,
      numero: operacoes.numero,
      valorComissao: operacoes.valorComissao,
      valorPresente: operacoes.valorPresente,
      cashbackPercent: operacoes.cashbackPercent,
      cashbackValor: operacoes.cashbackValor,
      cashbackSacadoEm: operacoes.cashbackSacadoEm,
      cashbackSacadoTicketId: operacoes.cashbackSacadoTicketId,
      createdAt: operacoes.createdAt,
      status: operacoes.status,
    })
    .from(operacoes)
    .where(
      and(
        eq(operacoes.construtoraId, c.id),
        sql`${operacoes.cashbackValor} IS NOT NULL`,
      ),
    )
    .orderBy(operacoes.createdAt);

  let saldoDisponivel = 0;
  let totalAcumulado = 0;
  let totalSacado = 0;
  for (const op of ops) {
    const v = parseFloat(op.cashbackValor ?? "0");
    totalAcumulado += v;
    if (op.cashbackSacadoEm) totalSacado += v;
    else saldoDisponivel += v;
  }

  return {
    construtora: c,
    operacoes: ops,
    saldoDisponivel,
    totalAcumulado,
    totalSacado,
  };
}

/* ============================================================
   ADMIN — definir cashback (chamado direto pelo status flow)
   ============================================================ */

/**
 * Calcula o valor de cashback dado um percentual e a base (valor presente
 * que efetivamente foi liberado pra o cedente).
 */
function computeCashbackValor(percent: number, basePresente: number) {
  return Math.round(basePresente * percent * 100) / 100;
}

/**
 * Aplica cashback numa operação. Chamado pelo status_flow durante
 * pré-aprovação ou aprovação final. Validação:
 *  - 0 < percent <= 0.20 (20% max)
 *  - operação tem que existir
 *  - se cashback já foi sacado, não permite alterar
 */
export async function setOperacaoCashbackInternal(
  operacaoId: string,
  percent: number,
): Promise<{ percent: number; valor: number }> {
  if (percent <= 0 || percent > 0.2) {
    throw new Error("Cashback inválido (limite 20%)");
  }
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) throw new Error("Operação não encontrada");
  if (op.cashbackSacadoEm) {
    throw new Error("Cashback já foi sacado, não pode ser alterado");
  }

  const valor = computeCashbackValor(percent, parseFloat(op.valorPresente));
  await db
    .update(operacoes)
    .set({
      cashbackPercent: String(percent),
      cashbackValor: String(valor.toFixed(2)),
      updatedAt: new Date(),
    })
    .where(eq(operacoes.id, operacaoId));

  return { percent, valor };
}

/* ============================================================
   CONSTRUTORA — solicitar saque (cria ticket cashback)
   ============================================================ */

export type SolicitarSaqueState =
  | { ok: false; error: string }
  | { ok: true; ticketId: string }
  | null;

export async function solicitarSaqueAction(
  _prev: SolicitarSaqueState,
  formData: FormData,
): Promise<SolicitarSaqueState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "construtora")
    return { ok: false, error: "Apenas construtora pode solicitar saque" };

  const summary = await getCashbackSummaryForCurrentConstrutora();
  if (!summary || summary.saldoDisponivel <= 0)
    return { ok: false, error: "Sem saldo disponível pra saque" };

  const banco = String(formData.get("banco") || "").trim();
  const agencia = String(formData.get("agencia") || "").trim();
  const conta = String(formData.get("conta") || "").trim();
  const titular = String(formData.get("titular") || "").trim();
  const docTitular = String(formData.get("docTitular") || "").trim();
  const obs = String(formData.get("obs") || "").trim() || null;

  if (!banco || !agencia || !conta || !titular || !docTitular) {
    return {
      ok: false,
      error: "Preencha banco, agência, conta, titular e CPF/CNPJ do titular",
    };
  }

  const valorSolicitado = summary.saldoDisponivel;
  const opsIds = summary.operacoes
    .filter((o) => !o.cashbackSacadoEm)
    .map((o) => o.id);

  const [ticket] = await db
    .insert(tickets)
    .values({
      userId: user.id,
      assunto: `Solicitação de saque · ${formatBRL(valorSolicitado)}`,
      status: "aberto",
      categoria: "cashback",
      extra: {
        valorSolicitado,
        opsIds,
        construtoraId: summary.construtora.id,
        construtoraNome: summary.construtora.razaoSocial,
        banco,
        agencia,
        conta,
        titular,
        docTitular,
        obs,
        solicitadoEm: new Date().toISOString(),
      },
    })
    .returning({ id: tickets.id });

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    fromUserId: user.id,
    fromRole: user.role,
    body: `Saque de cashback solicitado.\n\nValor: ${formatBRL(valorSolicitado)}\nBanco: ${banco}\nAgência: ${agencia}\nConta: ${conta}\nTitular: ${titular} (${docTitular})${obs ? `\nObs: ${obs}` : ""}\n\n${opsIds.length} operação(ões) referenciada(s).`,
  });

  // Notifica admins
  const adminUsers = await db
    .select()
    .from(users)
    .where(eq(users.role, "admin"));
  for (const a of adminUsers) {
    await notify({
      userId: a.id,
      type: "cashback_saque_solicitado",
      title: `Saque de cashback solicitado · ${summary.construtora.razaoSocial}`,
      body: `Valor: ${formatBRL(valorSolicitado)} · ${opsIds.length} operação(ões)`,
      link: `/admin/tickets/${ticket.id}`,
      email: {
        to: a.email,
        subject: "Antecipaqui · Solicitação de saque de cashback",
        body: `${summary.construtora.razaoSocial} solicitou saque de cashback.\n\nValor: ${formatBRL(valorSolicitado)}\nBanco: ${banco} / Ag ${agencia} / Cc ${conta}\nTitular: ${titular} (${docTitular})\n\nVer detalhes: /admin/tickets/${ticket.id}`,
      },
    });
  }

  revalidatePath("/painel/cashback");
  revalidatePath("/admin/tickets");
  return { ok: true, ticketId: ticket.id };
}

/* ============================================================
   ADMIN — confirmar pagamento do saque
   ============================================================ */

/**
 * Quando admin marca o ticket de saque como pago: registra a data,
 * marca todas as operações referenciadas como cashbackSacadoEm e
 * notifica a construtora.
 */
export async function confirmarSaqueAction(
  ticketId: string,
  comprovante?: string | null,
) {
  const admin = await requireAdmin();
  const [t] = await db
    .select()
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!t) throw new Error("Ticket não encontrado");
  if (t.categoria !== "cashback")
    throw new Error("Ticket não é de saque de cashback");
  if (t.status === "finalizado")
    throw new Error("Ticket já finalizado");

  const extra = (t.extra ?? {}) as {
    opsIds?: string[];
    valorSolicitado?: number;
  };
  const opsIds = extra.opsIds ?? [];
  const valor = extra.valorSolicitado ?? 0;

  // Marca cada operação como sacada
  if (opsIds.length > 0) {
    await db
      .update(operacoes)
      .set({
        cashbackSacadoEm: new Date(),
        cashbackSacadoTicketId: ticketId,
        updatedAt: new Date(),
      })
      .where(
        and(
          sql`${operacoes.id} = ANY(${opsIds})`,
          isNull(operacoes.cashbackSacadoEm),
        ),
      );

    // Audit log em cada operação
    for (const opId of opsIds) {
      await db.insert(operacaoEvents).values({
        operacaoId: opId,
        userId: admin.id,
        type: "cashback_pago",
        payload: {
          ticketId,
          valorTotalSaque: valor,
          comprovante: comprovante ?? null,
        },
      });
    }
  }

  // Atualiza ticket
  const updatedExtra = {
    ...extra,
    pagoEm: new Date().toISOString(),
    pagoPorAdminId: admin.id,
    comprovante: comprovante ?? null,
  };
  await db
    .update(tickets)
    .set({
      status: "finalizado",
      finalizadoEm: new Date(),
      updatedAt: new Date(),
      extra: updatedExtra,
    })
    .where(eq(tickets.id, ticketId));

  await db.insert(ticketMessages).values({
    ticketId,
    fromUserId: admin.id,
    fromRole: admin.role,
    body: `✓ Saque pago em ${new Date().toLocaleString("pt-BR")}.\nValor: ${formatBRL(valor)}\nOperações marcadas como sacadas: ${opsIds.length}${comprovante ? `\nComprovante: ${comprovante}` : ""}`,
  });

  // Notifica construtora
  await notify({
    userId: t.userId,
    type: "cashback_saque_pago",
    title: "Saque de cashback pago",
    body: `${formatBRL(valor)} foi creditado na sua conta.`,
    link: `/painel/cashback`,
  });

  revalidatePath(`/admin/tickets/${ticketId}`);
  revalidatePath("/admin/tickets");
  revalidatePath("/painel/cashback");
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}
