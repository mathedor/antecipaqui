/**
 * DIAGNÓSTICO DE SEGURANÇA & SAÚDE — tipos compartilhados.
 *
 * Cada "robô" é um check: roda ao vivo contra o estado real do sistema
 * (banco, env, integrações) e devolve um veredito por área. O painel
 * (admin e fundo) dispara todos com um clique e mostra área a área.
 */

/** ok = tudo certo · atencao = funciona mas precisa de olho · falha = quebrado
 *  ou vulnerável · erro = o próprio check não conseguiu rodar. */
export type Severidade = "ok" | "atencao" | "falha" | "erro";

export type Resultado = {
  status: Severidade;
  /** Frase curta pro card — o que foi constatado. */
  detalhe: string;
  /** O que fazer quando não está ok. */
  recomendacao?: string;
  /** Número/ú­nica linha de métrica ao lado do status (ex.: "142 ms"). */
  metrica?: string;
};

export type Escopo = "admin" | "fundo";

export type CheckCtx = {
  escopo: Escopo;
  /** Preenchido quando escopo = 'fundo' — escopa o check ao fundo logado. */
  fundoId?: string;
};

export type Check = {
  id: string;
  area: string;
  titulo: string;
  /** Quem enxerga o check. 'ambos' aparece nos dois painéis. */
  visibilidade: "admin" | "fundo" | "ambos";
  /** Peso do check no cálculo de saúde da área (padrão 1). Checks
   *  críticos (auth, segredos) podem pesar mais. */
  peso?: number;
  run: (ctx: CheckCtx) => Promise<Resultado>;
};

export type CheckResultado = {
  id: string;
  area: string;
  titulo: string;
  peso: number;
} & Resultado;

export type AreaResultado = {
  area: string;
  /** Pior status entre os checks da área — a cor do cabeçalho. */
  status: Severidade;
  checks: CheckResultado[];
  contagem: Record<Severidade, number>;
};

export type DiagnosticoResultado = {
  geradoEm: string;
  escopo: Escopo;
  /** Status agregado do sistema inteiro. */
  status: Severidade;
  areas: AreaResultado[];
  contagem: Record<Severidade, number>;
  duracaoMs: number;
};

/** Ordem de gravidade pra agregar (pior vence). */
const ORDEM: Record<Severidade, number> = { ok: 0, atencao: 1, erro: 2, falha: 3 };

export function pior(a: Severidade, b: Severidade): Severidade {
  return ORDEM[a] >= ORDEM[b] ? a : b;
}

export function agregar(severidades: Severidade[]): Severidade {
  return severidades.reduce<Severidade>((acc, s) => pior(acc, s), "ok");
}
