/**
 * Helpers pra montar links de WhatsApp Web / app (wa.me).
 *
 * Não envia mensagens automaticamente — apenas abre uma conversa pré-
 * preenchida no WhatsApp do operador. Sem API, sem custo.
 */

import { formatBRL } from "@/lib/format";

/** Normaliza telefone pra formato wa.me — só dígitos, com DDI 55 (BR). */
export function normalizePhoneBR(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // 13 dígitos começando com 55 → ok
  if (digits.length === 13 && digits.startsWith("55")) return digits;
  // 12 dígitos começando com 55 (sem o 9 do celular antigo) → adiciona o 9
  if (digits.length === 12 && digits.startsWith("55")) {
    return `55${digits.slice(2, 4)}9${digits.slice(4)}`;
  }
  // 10 ou 11 dígitos (DDD + número) → prefixa 55
  return `55${digits}`;
}

/** Monta URL https://wa.me/<numero>?text=<msg> */
export function buildWhatsappLink(
  rawPhone: string | null | undefined,
  message: string,
): string | null {
  const phone = normalizePhoneBR(rawPhone);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/* =============================================================
   TEMPLATES — mensagens pré-formatadas pro contexto Antecipaqui
   ============================================================= */

const STATUS_TEXT: Record<string, string> = {
  rascunho: "está em rascunho",
  aguardando_aprovacao: "está aguardando análise da Antecipaqui",
  documentos_incompletos: "está com documentação incompleta",
  pre_aprovada: "foi pré-aprovada",
  analise_final: "está em análise final",
  enviada_para_assinatura: "foi enviada para assinatura digital",
  enviada_para_pagamento: "foi aprovada e está em processamento de pagamento",
  realizada: "foi finalizada com sucesso",
  recusada: "foi recusada",
  cancelada: "foi cancelada",
};

type OpMessageData = {
  numero: string;
  status: string;
  valorPresente: number;
  valorComissao: number;
  construtoraNome: string | null;
  corretorNome: string | null;
  motivoPendencia?: string | null;
  motivoRecusa?: string | null;
};

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital"
  );
}

/** Mensagem pra corretor / cedente. */
export function buildOperacaoMessageForCorretor(
  data: OpMessageData,
  greetingName?: string | null,
): string {
  const nome = greetingName?.split(" ")[0] ?? "";
  const statusTxt = STATUS_TEXT[data.status] ?? `está com status ${data.status}`;
  const valor = formatBRL(data.valorPresente);
  const link = `${siteUrl()}/painel/operacoes`;

  const linhas = [
    `Olá${nome ? ` ${nome}` : ""}, aqui é da Antecipaqui!`,
    "",
    `Sua operação *${data.numero}* (${data.construtoraNome ?? "construtora"}) ${statusTxt}.`,
    `Valor a antecipar: *${valor}*.`,
  ];
  if (data.motivoPendencia) {
    linhas.push("", `Pendência: ${data.motivoPendencia}`);
  }
  if (data.motivoRecusa) {
    linhas.push("", `Motivo: ${data.motivoRecusa}`);
  }
  linhas.push("", `Acesse seu painel: ${link}`);
  return linhas.join("\n");
}

/** Mensagem pra responsável da construtora. */
export function buildOperacaoMessageForConstrutora(
  data: OpMessageData,
  greetingName?: string | null,
): string {
  const nome = greetingName?.split(" ")[0] ?? "";
  const statusTxt = STATUS_TEXT[data.status] ?? `está com status ${data.status}`;
  const link = `${siteUrl()}/painel/operacoes`;

  const linhas = [
    `Olá${nome ? ` ${nome}` : ""}, aqui é da Antecipaqui!`,
    "",
    `A operação *${data.numero}* envolvendo o cedente ${data.corretorNome ?? ""} ${statusTxt}.`,
    `Comissão envolvida: *${formatBRL(data.valorComissao)}*.`,
  ];
  if (data.motivoPendencia) {
    linhas.push("", `Pendência: ${data.motivoPendencia}`);
  }
  linhas.push("", `Acesse o painel: ${link}`);
  return linhas.join("\n");
}
