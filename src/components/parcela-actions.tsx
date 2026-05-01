"use client";

import { useTransition } from "react";
import {
  notificarParcelaPorEmailAction,
  gerarBoletoParcelaAction,
} from "@/lib/actions/daily";
import { useFeedback } from "@/components/feedback-provider";
import { buildWhatsappLink, normalizePhoneBR } from "@/lib/whatsapp";
import { formatBRL } from "@/lib/format";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

export type ParcelaContext = {
  parcelaId: string;
  parcelaNumero: number;
  vencimento: string;
  valorParcela: number;
  diasAtraso: number;
  taxaMensal: number;
  operacaoNumero: string;
  construtoraNome: string | null;
  construtoraTelefone: string | null;
  construtoraEmail: string | null;
  imobiliariaNome: string | null;
  imobiliariaTelefone: string | null;
  corretorNome: string | null;
  corretorEmail: string | null;
  corretorTelefone: string | null;
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function calcEncargosClient(valor: number, taxa: number, dias: number) {
  if (dias <= 0) return 0;
  return valor * 0.02 + valor * taxa * (dias / 30);
}

function buildWhatsappMessageConstrutora(r: ParcelaContext) {
  const dias = Math.max(r.diasAtraso, 0);
  const valorAtual = r.valorParcela + calcEncargosClient(r.valorParcela, r.taxaMensal, dias);
  const lines = [
    `Olá ${r.construtoraNome ?? ""}, aqui é da Antecipaqui.`,
    "",
    dias > 0
      ? `Estamos passando sobre a parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (cedente: ${r.imobiliariaNome ?? r.corretorNome ?? "—"}), com vencimento em *${fmtDate(r.vencimento)}* e *${dias} dia(s) de atraso*.`
      : `Lembrete da parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (cedente: ${r.imobiliariaNome ?? r.corretorNome ?? "—"}), com vencimento em *${fmtDate(r.vencimento)}*.`,
    "",
    `Valor original: *${formatBRL(r.valorParcela)}*.`,
    dias > 0 ? `Valor atualizado (com encargos): *${formatBRL(valorAtual)}*.` : "",
    "",
    `Acesse: ${SITE_URL}/painel/duplicatas`,
  ].filter(Boolean);
  return lines.join("\n");
}

function buildWhatsappMessageImobiliaria(r: ParcelaContext) {
  const nome = (r.corretorNome ?? "").split(" ")[0] ?? "";
  const dias = Math.max(r.diasAtraso, 0);
  const lines = [
    `Olá ${nome}, aqui é da Antecipaqui.`,
    "",
    dias > 0
      ? `A parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (construtora: ${r.construtoraNome ?? "—"}) venceu em *${fmtDate(r.vencimento)}* e está com *${dias} dia(s) de atraso*. Estamos em contato com a construtora pra regularizar.`
      : `Lembrete: parcela #${String(r.parcelaNumero).padStart(2, "0")} da operação *${r.operacaoNumero}* (construtora: ${r.construtoraNome ?? "—"}) vence em *${fmtDate(r.vencimento)}*.`,
    "",
    `Valor: *${formatBRL(r.valorParcela)}*.`,
    "",
    `Acesse: ${SITE_URL}/painel/operacoes`,
  ];
  return lines.join("\n");
}

export function ParcelaActions({ parcela }: { parcela: ParcelaContext }) {
  const { confirm, alertSuccess, alertError } = useFeedback();
  const [pending, start] = useTransition();

  function handleWhatsConstrutora() {
    const phone = normalizePhoneBR(parcela.construtoraTelefone);
    if (!phone) {
      alertError(
        "Construtora sem telefone cadastrado.",
        "Não foi possível abrir o WhatsApp",
      );
      return;
    }
    const link = buildWhatsappLink(
      parcela.construtoraTelefone,
      buildWhatsappMessageConstrutora(parcela),
    );
    if (link) window.open(link, "_blank", "noopener");
  }

  function handleWhatsImobiliaria() {
    const phone = normalizePhoneBR(
      parcela.imobiliariaTelefone ?? parcela.corretorTelefone,
    );
    if (!phone) {
      alertError(
        "Imobiliária / corretor sem telefone cadastrado.",
        "Não foi possível abrir o WhatsApp",
      );
      return;
    }
    const link = buildWhatsappLink(
      parcela.imobiliariaTelefone ?? parcela.corretorTelefone,
      buildWhatsappMessageImobiliaria(parcela),
    );
    if (link) window.open(link, "_blank", "noopener");
  }

  async function handleEmail() {
    const ok = await confirm({
      title: "Notificar por email",
      message: `Enviar email pra construtora (${parcela.construtoraEmail ?? "sem email"}) e pro corretor (${parcela.corretorEmail ?? "sem email"}) sobre a parcela ${parcela.parcelaNumero} da operação ${parcela.operacaoNumero}?`,
      confirmLabel: "Enviar emails",
    });
    if (!ok) return;
    start(async () => {
      try {
        const res = await notificarParcelaPorEmailAction(parcela.parcelaId);
        const msg: string[] = [];
        msg.push(
          res.enviados.construtora
            ? "✓ Construtora notificada"
            : "✕ Construtora sem email cadastrado",
        );
        msg.push(
          res.enviados.imobiliaria
            ? "✓ Imobiliária / corretor notificada"
            : "✕ Sem email da imobiliária / corretor",
        );
        await alertSuccess(msg.join("\n"), "Emails processados");
      } catch (e) {
        await alertError((e as Error).message, "Erro ao notificar por email");
      }
    });
  }

  async function handleBoleto() {
    start(async () => {
      try {
        const res = await gerarBoletoParcelaAction(parcela.parcelaId);
        const ok2 = await confirm({
          title: "Abrir API de boletos",
          message: `Vamos abrir a URL da API do banco emissor configurado no fundo "${res.fundoNome}" (${res.bancoNome ?? "—"}).\n\nDados pra preencher:\n• Parcela: ${res.parcela.numero}\n• Operação: ${res.parcela.operacaoNumero}\n• Vencimento: ${fmtDate(res.parcela.vencimento)}\n• Valor: ${formatBRL(res.parcela.valor)}\n\nContinuar?`,
          confirmLabel: "Abrir API",
        });
        if (ok2) {
          window.open(res.apiUrl, "_blank", "noopener");
        }
      } catch (e) {
        await alertError((e as Error).message, "Erro ao gerar boleto");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionBtn
        title="Gerar boleto"
        onClick={handleBoleto}
        disabled={pending}
        icon={<DocIcon />}
        tone="accent"
      />
      <ActionBtn
        title={`WhatsApp construtora · ${parcela.construtoraTelefone ?? "sem telefone"}`}
        onClick={handleWhatsConstrutora}
        icon={<WhatsIcon />}
        tone="success"
      />
      <ActionBtn
        title={`WhatsApp imobiliária / corretor · ${parcela.imobiliariaTelefone ?? parcela.corretorTelefone ?? "sem telefone"}`}
        onClick={handleWhatsImobiliaria}
        icon={<WhatsIcon />}
        tone="success"
        outline
      />
      <ActionBtn
        title="Notificar por email"
        onClick={handleEmail}
        disabled={pending}
        icon={<MailIcon />}
      />
    </div>
  );
}

function ActionBtn({
  title,
  onClick,
  disabled = false,
  icon,
  tone = "default",
  outline = false,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  tone?: "default" | "accent" | "success";
  outline?: boolean;
}) {
  const styles =
    tone === "accent"
      ? "border-accent/40 text-accent hover:bg-accent-soft"
      : tone === "success"
        ? outline
          ? "border-success/40 text-success hover:bg-green-50"
          : "border-success/60 bg-green-50 text-success hover:bg-green-100"
        : "border-border text-fg-muted hover:border-accent hover:text-accent";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center size-8 rounded-lg border ${styles} transition-colors disabled:opacity-50`}
    >
      {icon}
    </button>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function WhatsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
