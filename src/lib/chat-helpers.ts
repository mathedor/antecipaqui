/** Helpers síncronos do chat — separado de chat.ts (server actions) porque
 *  arquivo "use server" só aceita async exports. */

export type ChatCategoria =
  | "suporte"
  | "operacoes"
  | "negociacoes"
  | "confirmacao"
  | "documentos";

const CATEGORIA_LABEL: Record<ChatCategoria, string> = {
  suporte: "Suporte",
  operacoes: "Operações",
  negociacoes: "Negociações",
  confirmacao: "Confirmação",
  documentos: "Documentos",
};

export function chatCategoriaLabel(c: string) {
  return CATEGORIA_LABEL[c as ChatCategoria] ?? c;
}

/** Categorias permitidas pra cada role (origem). */
export function getCategoriasForRole(role: string): ChatCategoria[] {
  if (role === "fundo") return ["confirmacao", "documentos", "suporte"];
  if (role === "corretor" || role === "imobiliaria")
    return ["suporte", "operacoes", "negociacoes"];
  if (role === "construtora") return ["suporte", "operacoes", "negociacoes"];
  if (role === "comercial") return ["suporte", "operacoes", "negociacoes"];
  return [];
}

/** Categorias que precisam de operacaoId (têm contexto de op). */
export function categoriaPrecisaOperacao(c: ChatCategoria) {
  return c !== "suporte";
}