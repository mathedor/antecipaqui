/** Eventos disponíveis pra webhooks. Lista síncrona — separada do
 *  arquivo "use server" de actions porque "use server" só pode exportar
 *  funções async. */
export const EVENTOS_DISPONIVEIS = [
  "op_status_change",
  "op_aprovada",
  "op_recusada",
  "fundo_decisao",
  "parcela_paga",
  "antecipacao_decisao",
  "renegociacao_decisao",
] as const;

export type WebhookEventoTipo = (typeof EVENTOS_DISPONIVEIS)[number];
