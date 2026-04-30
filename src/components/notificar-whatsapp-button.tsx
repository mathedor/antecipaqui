import {
  buildOperacaoMessageForConstrutora,
  buildOperacaoMessageForCorretor,
  buildWhatsappLink,
  normalizePhoneBR,
} from "@/lib/whatsapp";

type Target = "corretor" | "construtora";

type OpData = {
  numero: string;
  status: string;
  valorPresente: number;
  valorComissao: number;
  construtoraNome: string | null;
  corretorNome: string | null;
  motivoPendencia?: string | null;
  motivoRecusa?: string | null;
};

type Props = {
  target: Target;
  /** Telefone bruto do destinatário (será normalizado pra DDI 55) */
  phone: string | null | undefined;
  /** Nome usado no greeting da mensagem */
  destinatarioNome?: string | null;
  /** Dados da operação pra montar o template */
  operacao: OpData;
  /** "icon" pequeno na listagem · "button" grande no detalhe */
  variant?: "icon" | "button";
};

const LABEL: Record<Target, string> = {
  corretor: "Notificar imobiliária / corretor",
  construtora: "Notificar construtora",
};

const SHORT_LABEL: Record<Target, string> = {
  corretor: "WhatsApp · cedente",
  construtora: "WhatsApp · construtora",
};

export function NotificarWhatsappButton({
  target,
  phone,
  destinatarioNome,
  operacao,
  variant = "button",
}: Props) {
  const message =
    target === "corretor"
      ? buildOperacaoMessageForCorretor(operacao, destinatarioNome)
      : buildOperacaoMessageForConstrutora(operacao, destinatarioNome);
  const link = buildWhatsappLink(phone, message);
  const normalized = normalizePhoneBR(phone);

  if (!link || !normalized) {
    if (variant === "icon") return null;
    return (
      <button
        type="button"
        disabled
        title="Sem telefone cadastrado"
        className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border bg-bg-card text-fg-dim font-medium text-sm cursor-not-allowed opacity-60"
      >
        <WhatsappIcon />
        <span>{LABEL[target]} — sem telefone</span>
      </button>
    );
  }

  if (variant === "icon") {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener"
        title={`${LABEL[target]} (${formatPhonePretty(normalized)})`}
        aria-label={LABEL[target]}
        className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-success hover:text-success transition-colors"
      >
        <WhatsappIcon />
      </a>
    );
  }

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-success/40 text-success hover:bg-green-50 font-medium text-sm transition-colors"
    >
      <WhatsappIcon />
      <span>{LABEL[target]}</span>
    </a>
  );
}

/* Botão composto: na listagem, mostra os 2 ícones lado a lado quando
   há dados pra ambos. Some em silêncio se nem corretor nem construtora
   têm telefone. */
export function NotificarWhatsappRowActions({
  operacao,
  corretor,
  construtora,
}: {
  operacao: OpData;
  corretor: { phone: string | null | undefined; nome: string | null | undefined };
  construtora: {
    phone: string | null | undefined;
    nome: string | null | undefined;
  };
}) {
  const corretorLink = buildWhatsappLink(
    corretor.phone,
    buildOperacaoMessageForCorretor(operacao, corretor.nome),
  );
  const construtoraLink = buildWhatsappLink(
    construtora.phone,
    buildOperacaoMessageForConstrutora(operacao, construtora.nome),
  );
  if (!corretorLink && !construtoraLink) return null;

  return (
    <div className="flex items-center gap-1.5">
      {corretorLink && (
        <a
          href={corretorLink}
          target="_blank"
          rel="noopener"
          title={`WhatsApp imobiliária / corretor (${formatPhonePretty(normalizePhoneBR(corretor.phone)!)})`}
          aria-label="WhatsApp imobiliária / corretor"
          className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-success hover:text-success transition-colors"
        >
          <WhatsappIcon />
          <span className="sr-only">corretor</span>
        </a>
      )}
      {construtoraLink && (
        <a
          href={construtoraLink}
          target="_blank"
          rel="noopener"
          title={`WhatsApp construtora (${formatPhonePretty(normalizePhoneBR(construtora.phone)!)})`}
          aria-label="WhatsApp construtora"
          className="inline-flex items-center justify-center size-8 rounded-lg border border-border text-fg-muted hover:border-success hover:text-success transition-colors relative"
        >
          <WhatsappIcon />
          <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-accent border border-bg-elev" />
          <span className="sr-only">construtora</span>
        </a>
      )}
    </div>
  );
}

function formatPhonePretty(digits: string) {
  // 55 11 99999-9999 → "(11) 99999-9999"
  if (digits.length !== 13) return digits;
  const ddd = digits.slice(2, 4);
  const part1 = digits.slice(4, 9);
  const part2 = digits.slice(9, 13);
  return `(${ddd}) ${part1}-${part2}`;
}

function WhatsappIcon() {
  return (
    <svg
      width="14"
      height="14"
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

export { LABEL as WHATSAPP_BUTTON_LABEL, SHORT_LABEL };
