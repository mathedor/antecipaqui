"use client";

import { useFeedback } from "@/components/feedback-provider";
import { buildWhatsappLink, buildOutreachMessage } from "@/lib/whatsapp";

type Props = {
  /** Telefone bruto (com ou sem máscara). Se nulo/inválido, botão fica desabilitado. */
  telefone: string | null | undefined;
  /** Nome pra usar no "Olá fulano". */
  nome?: string | null;
  /** Texto do botão. */
  label?: string;
  /** Variant visual. */
  variant?: "primary" | "ghost";
  /** Tamanho. */
  size?: "md" | "sm";
};

export function IniciarContatoButton({
  telefone,
  nome,
  label = "Iniciar contato",
  variant = "primary",
  size = "md",
}: Props) {
  const { alertError } = useFeedback();
  const message = buildOutreachMessage(nome);
  const href = buildWhatsappLink(telefone, message);

  const baseSize =
    size === "sm" ? "h-9 px-3 text-xs" : "h-11 px-5 text-sm";
  const baseStyle =
    variant === "primary"
      ? "bg-success text-white hover:bg-green-700"
      : "border border-success/40 text-success hover:bg-green-50";

  if (!href) {
    return (
      <button
        type="button"
        onClick={() =>
          alertError(
            "Telefone não cadastrado. Edite o cadastro e adicione um telefone válido pra iniciar o contato via WhatsApp.",
            "Sem telefone",
          )
        }
        title="Sem telefone cadastrado"
        className={`inline-flex items-center gap-2 ${baseSize} rounded-xl border border-border text-fg-dim cursor-not-allowed font-semibold`}
      >
        <WhatsappIcon /> {label}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-2 ${baseSize} rounded-xl ${baseStyle} font-semibold transition-colors`}
    >
      <WhatsappIcon /> {label}
    </a>
  );
}

function WhatsappIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
