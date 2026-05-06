"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  custosOperacao,
  fundos,
  operacaoEvents,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { notify } from "@/lib/notify";
import { generateContractForOperacao } from "@/lib/actions/contract";
import { audit } from "@/lib/audit";
import { valorPresente } from "@/lib/format";

type ChangeStatusInput = {
  operacaoId: string;
  newStatus:
    | "documentos_incompletos"
    | "pre_aprovada"
    | "analise_final"
    | "recusada"
    | "enviada_para_assinatura"
    | "enviada_para_pagamento"
    | "realizada"
    | "cancelada"
    | "aguardando_aprovacao";
  motivo?: string;
  /** Nova taxa mensal (decimal: 0.06 = 6%). Usada quando admin/fundo aprova
   *  e quer ajustar a taxa específica daquela operação. Recalcula VP +
   *  deságio. Validada server-side (0,5%–20%). */
  novaTaxaMensal?: number;
  /** Cashback pra construtora (decimal, 0.02 = 2%). Aplicado quando
   *  admin marca como enviada_para_pagamento (aprovação final).
   *  Limites: 0 < x <= 0.20. NÃO é visível pra corretor/imobiliária. */
  cashbackPercent?: number;
  /** Fundo selecionado pra esta operação. Setado pelo admin na
   *  pré-aprovação (calculadora comparativa). */
  fundoId?: string;
  /** Custos de operação cadastrados na aprovação final. Cada item vira
   *  uma row em custos_operacao; os existentes da operação são substituídos. */
  custos?: Array<{ titulo: string; valor: number }>;
};

/** Quem pode mudar status: admin sempre; fundo só nas próprias operações. */
async function authorizeStatusChange(operacaoId: string) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Unauthorized");
  if (!user.isActive) throw new Error("Conta bloqueada");
  if (user.role === "admin") return user;
  if (user.role === "fundo") {
    const [f] = await db
      .select({ id: fundos.id })
      .from(fundos)
      .where(eq(fundos.ownerUserId, user.id))
      .limit(1);
    if (!f) throw new Error("Fundo não vinculado");
    const [op] = await db
      .select({ fundoId: operacoes.fundoId })
      .from(operacoes)
      .where(eq(operacoes.id, operacaoId))
      .limit(1);
    if (!op) throw new Error("Operação não encontrada");
    if (op.fundoId !== f.id)
      throw new Error("Operação não pertence ao seu fundo");
    return user;
  }
  throw new Error("Apenas admin ou fundo");
}

function monthsBetween(from: Date, to: Date) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return Math.max(years * 12 + months + dayFrac, 0);
}

const STATUS_LABELS: Record<string, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  documentos_incompletos: "Documentos incompletos",
  pre_aprovada: "Pré-aprovada",
  analise_final: "Análise final",
  recusada: "Recusada",
  enviada_para_assinatura: "Enviada para assinatura",
  enviada_para_pagamento: "Enviada para pagamento",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export async function changeOperacaoStatusAction(input: ChangeStatusInput) {
  const actor = await authorizeStatusChange(input.operacaoId);

  // Carrega operação + cedente + construtora
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, input.operacaoId))
    .limit(1);
  if (!op) throw new Error("Operação não encontrada");

  // Updates por status
  const updates: Partial<typeof operacoes.$inferInsert> = {
    status: input.newStatus,
    updatedAt: new Date(),
  };

  if (input.newStatus === "documentos_incompletos") {
    if (!input.motivo)
      throw new Error("Motivo da pendência é obrigatório");
    updates.motivoPendencia = input.motivo;
    updates.motivoRecusa = null;
  }
  if (input.newStatus === "recusada" || input.newStatus === "cancelada") {
    if (!input.motivo)
      throw new Error("Motivo é obrigatório pra recusar/cancelar");
    updates.motivoRecusa = input.motivo;
  }
  if (
    input.newStatus === "pre_aprovada" ||
    input.newStatus === "analise_final" ||
    input.newStatus === "enviada_para_assinatura"
  ) {
    updates.aprovadoPorUserId = actor.id;
    updates.aprovadoEm = new Date();
    updates.motivoPendencia = null;

    // Vincula fundo se passado
    if (input.fundoId) {
      updates.fundoId = input.fundoId;
    }

    // Se o admin enviou nova taxa, recalcula VP + deságio das parcelas
    if (typeof input.novaTaxaMensal === "number") {
      if (input.novaTaxaMensal < 0.005 || input.novaTaxaMensal > 0.2) {
        throw new Error(
          "Taxa mensal fora dos limites permitidos (0,5% a 20%)",
        );
      }
      const parcelas = await db
        .select()
        .from(parcelasComissao)
        .where(eq(parcelasComissao.operacaoId, input.operacaoId))
        .orderBy(parcelasComissao.numero);
      const today = new Date();
      const arr = parcelas.map((p) => ({
        valor: parseFloat(p.valor),
        mesesAteVencimento: monthsBetween(
          today,
          new Date(p.vencimento + "T00:00:00"),
        ),
      }));
      const novoVp = valorPresente(arr, input.novaTaxaMensal);
      const novoDesagio = parseFloat(op.valorComissao) - novoVp;
      updates.taxaMensal = String(input.novaTaxaMensal);
      updates.valorPresente = String(novoVp.toFixed(2));
      updates.desagio = String(novoDesagio.toFixed(2));
    }
  }
  if (input.newStatus === "aguardando_aprovacao") {
    // Quando admin reverte/corretor reenviou docs, limpa motivo
    updates.motivoPendencia = null;
  }
  if (input.newStatus === "realizada") {
    updates.liquidadoEm = new Date();
  }

  // Cashback pra construtora — aplicado SÓ na aprovação final
  // (transição pra enviada_para_pagamento). Visível só pra construtora.
  if (
    input.newStatus === "enviada_para_pagamento" &&
    typeof input.cashbackPercent === "number" &&
    input.cashbackPercent > 0
  ) {
    if (input.cashbackPercent > 0.2) {
      throw new Error("Cashback inválido (limite 20%)");
    }
    const valorPresenteAtual = parseFloat(op.valorPresente);
    const cashbackValor =
      Math.round(valorPresenteAtual * input.cashbackPercent * 100) / 100;
    updates.cashbackPercent = String(input.cashbackPercent);
    updates.cashbackValor = String(cashbackValor.toFixed(2));
  }

  await db
    .update(operacoes)
    .set(updates)
    .where(eq(operacoes.id, input.operacaoId));

  // Se o fundo mudou, sincroniza participantes dos chats vinculados
  if (
    typeof updates.fundoId === "string" &&
    updates.fundoId !== op.fundoId
  ) {
    const { syncChatsOnFundoChange } = await import("@/lib/actions/chat");
    await syncChatsOnFundoChange(input.operacaoId, updates.fundoId).catch(
      (e) => console.error("[chat] sync on fundo change failed:", e),
    );
  }

  // Custos de operação: substitui o conjunto atual pelo enviado.
  // Aceito em qualquer transição de aprovação (final ou cashback).
  if (Array.isArray(input.custos)) {
    const validos = input.custos
      .map((c) => ({
        titulo: String(c.titulo ?? "").trim(),
        valor:
          typeof c.valor === "number" && Number.isFinite(c.valor) ? c.valor : 0,
      }))
      .filter((c) => c.titulo.length > 0 && c.valor > 0);
    await db
      .delete(custosOperacao)
      .where(eq(custosOperacao.operacaoId, input.operacaoId));
    if (validos.length > 0) {
      await db.insert(custosOperacao).values(
        validos.map((c) => ({
          operacaoId: input.operacaoId,
          titulo: c.titulo,
          valor: String(c.valor.toFixed(2)),
          createdByUserId: actor.id,
        })),
      );
    }
  }

  // Audit log (operação + sistema-wide)
  await db.insert(operacaoEvents).values({
    operacaoId: input.operacaoId,
    userId: actor.id,
    type: `status_changed_to_${input.newStatus}`,
    payload: {
      from: op.status,
      to: input.newStatus,
      motivo: input.motivo ?? null,
      actorId: actor.id,
      actorRole: actor.role,
    },
  });
  audit({
    action: "change_status",
    targetType: "operacao",
    targetId: input.operacaoId,
    targetLabel: `${op.numero} → ${input.newStatus}`,
    metadata: {
      from: op.status,
      to: input.newStatus,
      motivo: input.motivo ?? null,
      novaTaxaMensal: input.novaTaxaMensal ?? null,
      cashbackPercent: input.cashbackPercent ?? null,
    },
  }).catch(() => undefined);

  // Carrega usuários envolvidos pra notificações
  const [cedente] = await db
    .select()
    .from(users)
    .where(eq(users.id, op.corretorUserId))
    .limit(1);

  const [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);

  const construtoraOwner = construtora?.ownerUserId
    ? (
        await db
          .select()
          .from(users)
          .where(eq(users.id, construtora.ownerUserId))
          .limit(1)
      )[0]
    : null;

  const linkCorretor = `/painel/operacoes/${op.id}`;
  const linkConstrutora = `/painel/operacoes/${op.id}`;
  const numero = op.numero;

  // ─── Disparos por status ───
  switch (input.newStatus) {
    case "documentos_incompletos":
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_documentos_incompletos",
          title: `Operação ${numero} · documentos incompletos`,
          body:
            (input.motivo ?? "Verifique a operação no seu painel.") +
            "\nReenvie os documentos pra continuar a análise.",
          link: linkCorretor,
          operacaoId: op.id,
          email: {
            to: cedente.email,
            subject: `Antecipaqui · Operação ${numero} precisa de correção`,
            body: `Olá ${cedente.nome ?? ""}, sua operação ${numero} foi devolvida com a seguinte pendência:\n\n${input.motivo}\n\nAcesse seu painel pra reenviar.`,
          },
        });
      }
      break;

    case "pre_aprovada":
      if (construtoraOwner) {
        await notify({
          userId: construtoraOwner.id,
          type: "operacao_pre_aprovada_construtora",
          title: `Operação ${numero} aguarda sua confirmação`,
          body: `A Antecipaqui pré-aprovou uma operação envolvendo sua construtora. Acesse o painel pra revisar.`,
          link: linkConstrutora,
          operacaoId: op.id,
          email: {
            to: construtoraOwner.email,
            subject: `Antecipaqui · Operação ${numero} aguarda sua confirmação`,
            body: `Sua confirmação é necessária pra a operação ${numero} prosseguir. Acesse o painel pra revisar a documentação.`,
          },
          sms: construtoraOwner.telefone
            ? {
                to: construtoraOwner.telefone,
                message: `Antecipaqui: Operação ${numero} aguarda sua aprovação. Acesse o painel.`,
              }
            : undefined,
        });
      } else if (construtora?.email) {
        // Construtora sem owner ainda — registra notificação no admin pra fazer outreach
        console.log(
          "[status] construtora sem owner, email manual necessário:",
          construtora.email,
        );
      }
      // Notifica também o cedente
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_pre_aprovada_cedente",
          title: `Operação ${numero} pré-aprovada`,
          body: `Sua operação foi pré-aprovada pela Antecipaqui e está aguardando confirmação da construtora.`,
          link: linkCorretor,
          operacaoId: op.id,
          email: {
            to: cedente.email,
            subject: `Antecipaqui · Operação ${numero} pré-aprovada`,
            body: `Sua operação ${numero} foi pré-aprovada e agora aguarda confirmação da construtora.`,
          },
        });
      }
      break;

    case "analise_final":
      // Notifica cedente que voltou pra admin
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_analise_final",
          title: `Operação ${numero} em análise final`,
          body: `A construtora confirmou. Sua operação está em análise final pela Antecipaqui.`,
          link: linkCorretor,
          operacaoId: op.id,
        });
      }
      break;

    case "recusada":
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_recusada",
          title: `Operação ${numero} recusada`,
          body: input.motivo ?? "Veja o motivo no seu painel.",
          link: linkCorretor,
          operacaoId: op.id,
          email: {
            to: cedente.email,
            subject: `Antecipaqui · Operação ${numero} recusada`,
            body: `Sua operação ${numero} foi recusada. Motivo: ${input.motivo ?? "não informado"}.`,
          },
        });
      }
      if (construtoraOwner) {
        await notify({
          userId: construtoraOwner.id,
          type: "operacao_recusada_construtora",
          title: `Operação ${numero} recusada`,
          body: input.motivo ?? "",
          link: linkConstrutora,
          operacaoId: op.id,
        });
      }
      break;

    case "enviada_para_assinatura":
      // Gera contrato (se não existir) e dispara notificações de "vai assinar"
      try {
        await generateContractForOperacao(op.id);
        await db.insert(operacaoEvents).values({
          operacaoId: op.id,
          userId: actor.id,
          type: "contract_generated",
          payload: {},
        });
      } catch (e) {
        console.error("[status] contract generation failed:", e);
      }
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_enviada_assinatura",
          title: `Operação ${numero} enviada para assinatura`,
          body: `O contrato foi gerado e está sendo encaminhado pra assinatura.`,
          link: linkCorretor,
          operacaoId: op.id,
          email: {
            to: cedente.email,
            subject: `Antecipaqui · Operação ${numero} pronta pra assinatura`,
            body: `O contrato da operação ${numero} foi gerado e em breve você receberá o link pra assinar.`,
          },
        });
      }
      if (construtoraOwner) {
        await notify({
          userId: construtoraOwner.id,
          type: "operacao_enviada_assinatura",
          title: `Operação ${numero} aguarda sua assinatura`,
          body: `O contrato foi gerado e em breve será encaminhado.`,
          link: linkConstrutora,
          operacaoId: op.id,
          email: {
            to: construtoraOwner.email,
            subject: `Antecipaqui · Contrato da operação ${numero} pra assinatura`,
            body: `O contrato da operação ${numero} está pronto. Em breve você receberá o link pra assinar.`,
          },
        });
      }
      break;

    case "enviada_para_pagamento":
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_enviada_pagamento",
          title: `Operação ${numero} aprovada — pagamento em processamento`,
          body: `Seu valor entra na conta em até 1 dia útil.`,
          link: linkCorretor,
          operacaoId: op.id,
          email: {
            to: cedente.email,
            subject: `Antecipaqui · Pagamento da operação ${numero} em andamento`,
            body: `Boa notícia! Sua operação ${numero} foi totalmente assinada e o pagamento foi liberado.`,
          },
        });
      }
      // Cashback (privado pra construtora) — só notifica se foi concedido
      if (
        construtoraOwner &&
        typeof input.cashbackPercent === "number" &&
        input.cashbackPercent > 0
      ) {
        const valorCashback =
          Math.round(
            parseFloat(op.valorPresente) * input.cashbackPercent * 100,
          ) / 100;
        await notify({
          userId: construtoraOwner.id,
          type: "cashback_concedido",
          title: `Cashback concedido · operação ${numero}`,
          body: `A Antecipaqui creditou R$ ${valorCashback.toFixed(2)} de cashback (${(input.cashbackPercent * 100).toFixed(2).replace(".", ",")}%) na operação ${numero}. Veja o saldo e solicite saque na aba Cashback.`,
          link: "/painel/cashback",
          operacaoId: op.id,
        });
      }
      break;

    case "realizada":
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_realizada",
          title: `Operação ${numero} realizada`,
          body: `Pagamento confirmado.`,
          link: linkCorretor,
          operacaoId: op.id,
          email: {
            to: cedente.email,
            subject: `Antecipaqui · Operação ${numero} concluída`,
            body: `Sua operação ${numero} foi concluída com sucesso. Obrigado por usar a Antecipaqui!`,
          },
        });
      }
      break;

    case "aguardando_aprovacao":
      // Quando admin volta pra aguardando (ex: corretor reenviou docs)
      if (cedente) {
        await notify({
          userId: cedente.id,
          type: "operacao_em_analise",
          title: `Operação ${numero} em análise`,
          body: `Recebemos seus documentos e vamos analisar. Te avisamos em breve.`,
          link: linkCorretor,
          operacaoId: op.id,
        });
      }
      break;
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/operacoes/${op.id}`);
  revalidatePath("/admin/operacoes");
  revalidatePath(`/painel/operacoes/${op.id}`);
  revalidatePath("/painel/operacoes");
  revalidatePath("/painel");

  return { ok: true, newStatus: input.newStatus, label: STATUS_LABELS[input.newStatus] };
}
