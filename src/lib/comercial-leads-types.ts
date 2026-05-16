export type LeadStatus =
  | "prospect"
  | "contato"
  | "reuniao"
  | "proposta"
  | "fechado"
  | "perdido";

export const STATUS_ORDER: LeadStatus[] = [
  "prospect",
  "contato",
  "reuniao",
  "proposta",
  "fechado",
  "perdido",
];

export const STATUS_LABEL: Record<LeadStatus, string> = {
  prospect: "Prospect",
  contato: "Contato feito",
  reuniao: "Reunião",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};
