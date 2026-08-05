/**
 * Ponte entre as telas e o widget do Cícero (tipos puros, sem "use server" —
 * importável do client).
 *
 * Qualquer tela pode chamar o Cícero pra oferecer ajuda:
 *   abrirCicero({ texto: "...", proposta: { tipo: "finalizar_operacao_pendente", ... } })
 *
 * O widget escuta o evento, abre sozinho e mostra a mensagem com o botão
 * de ação. Usado quando o usuário trava no cadastro por causa de anexo.
 */

export const CICERO_EVENTO_ABRIR = "cicero:abrir";

export type CiceroProposta = {
  tipo: "finalizar_operacao_pendente";
  /** Rótulo do botão que aceita a proposta. */
  aceitar: string;
  /** Rótulo pra recusar (só fecha). */
  recusar?: string;
  /** Documentos que ficariam pendentes — texto pronto pra exibir. */
  faltando: string[];
};

export type CiceroChamado = {
  /** Mensagem que o Cícero "fala" ao abrir. */
  texto: string;
  proposta?: CiceroProposta;
  /** Sugestões clicáveis. */
  respostas?: string[];
};

/** Dispara o Cícero a partir de qualquer componente client. */
export function abrirCicero(chamado: CiceroChamado) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CiceroChamado>(CICERO_EVENTO_ABRIR, { detail: chamado }),
  );
}

/**
 * Evento de volta: o usuário aceitou a proposta no chat.
 *
 * Quem executa é a TELA que abriu o chamado, não o widget — no caso do
 * cadastro, é o formulário que tem o FormData preenchido em mãos. O widget
 * só transporta o "sim".
 */
export const CICERO_EVENTO_ACEITAR = "cicero:aceitar";

export function aceitarPropostaCicero(tipo: CiceroProposta["tipo"]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ tipo: CiceroProposta["tipo"] }>(CICERO_EVENTO_ACEITAR, {
      detail: { tipo },
    }),
  );
}
