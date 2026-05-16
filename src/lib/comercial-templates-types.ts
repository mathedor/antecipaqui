/** Tipos e helpers síncronos de templates do comercial. Separado da
 *  action ("use server") porque server actions só podem exportar
 *  funções assíncronas. */

export type TemplateTipo =
  | "reativar"
  | "empurrar"
  | "parabenizar"
  | "investigar"
  | "followup"
  | "livre";

export const TIPO_LABEL: Record<TemplateTipo, string> = {
  reativar: "Reativar (dormida)",
  empurrar: "Empurrar (op travada)",
  parabenizar: "Parabenizar (1ª op)",
  investigar: "Investigar (recusas)",
  followup: "Follow-up",
  livre: "Livre",
};

export const VARIAVEIS_DISPONIVEIS = [
  { key: "nome", desc: "nome do contato/empresa alvo" },
  { key: "empresa", desc: "nome da empresa alvo" },
  { key: "dias_inativa", desc: "dias sem operar (para reativar)" },
  { key: "numero_op", desc: "número da operação (para empurrar)" },
  { key: "valor_op", desc: "valor R$ da operação (formatado)" },
] as const;

/** Aplica substituições simples de {variavel}. */
export function aplicarTemplate(
  template: string,
  vars: Record<string, string | number | undefined>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v != null ? String(v) : `{${key}}`;
  });
}
