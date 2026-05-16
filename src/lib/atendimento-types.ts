/** Tipos puros e constantes do CRM de atendimentos (cliente + servidor). */

export type AtendimentoStatus =
  | "contato_inicial"
  | "qualificado"
  | "visita"
  | "proposta"
  | "negociacao"
  | "fechado"
  | "perdido";

export const STATUS_ORDER: AtendimentoStatus[] = [
  "contato_inicial",
  "qualificado",
  "visita",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
];

export const STATUS_LABEL: Record<AtendimentoStatus, string> = {
  contato_inicial: "Contato inicial",
  qualificado: "Qualificado",
  visita: "Visita",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

export type EventoTipo =
  | "visita_agendada"
  | "visita_realizada"
  | "ligacao"
  | "whatsapp"
  | "email"
  | "proposta_enviada"
  | "contraproposta"
  | "documentacao"
  | "anotacao"
  | "status_change"
  | "score_consultado"
  | "encaminhado_antecipacao";

export const EVENTO_LABEL: Record<EventoTipo, string> = {
  visita_agendada: "Visita agendada",
  visita_realizada: "Visita realizada",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "Email",
  proposta_enviada: "Proposta enviada",
  contraproposta: "Contraproposta",
  documentacao: "Documentação",
  anotacao: "Anotação",
  status_change: "Mudança de status",
  score_consultado: "Score consultado",
  encaminhado_antecipacao: "Encaminhado p/ antecipação",
};

export const EVENTO_EMOJI: Record<EventoTipo, string> = {
  visita_agendada: "📅",
  visita_realizada: "🏠",
  ligacao: "📞",
  whatsapp: "💬",
  email: "✉",
  proposta_enviada: "📋",
  contraproposta: "🔁",
  documentacao: "📎",
  anotacao: "📝",
  status_change: "🔄",
  score_consultado: "📊",
  encaminhado_antecipacao: "→ ⚡",
};
