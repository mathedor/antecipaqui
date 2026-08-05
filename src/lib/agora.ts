/**
 * Leitura de relógio para componentes client.
 *
 * `Date.now()` chamado direto no corpo do render quebra a regra de pureza do
 * React Compiler (react-hooks/purity): o valor muda a cada chamada, então o
 * compilador não consegue memoizar com segurança — e, em página renderizada
 * no servidor, servidor e navegador leem horas diferentes, o que abre
 * divergência de hidratação.
 *
 * O padrão do projeto é tirar a leitura do render: chame `agoraMs()` de
 * dentro de um inicializador de estado (roda uma vez) ou de um efeito.
 *
 *   const [agora] = useState(() => agoraMs());
 */
export function agoraMs(): number {
  return Date.now();
}

/** Pseudo-aleatório determinístico a partir de um índice.
 *
 *  Serve pros mockups da apresentação, que só precisam de variação visual:
 *  `Math.random()` no render muda a cada repintura e diverge entre servidor
 *  e cliente. Com semente fixa o desenho fica estável. */
export function variacaoEstavel(indice: number, semente = 1): number {
  const x = Math.sin((indice + 1) * 12.9898 * semente) * 43758.5453;
  return x - Math.floor(x); // 0..1
}
