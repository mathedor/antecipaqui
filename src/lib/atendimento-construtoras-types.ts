/** Tipos e constantes do módulo atendimento_construtoras. Separado da
 *  action ("use server") porque server actions só podem exportar funções
 *  async. */

export type TipoOpiniao =
  | "aprovar_valor"
  | "aprovar_condicoes"
  | "liberar_desconto"
  | "confirmar_disponibilidade"
  | "opiniao_geral";

export const TIPO_OPINIAO_LABEL: Record<TipoOpiniao, string> = {
  aprovar_valor: "Aprovar valor",
  aprovar_condicoes: "Aprovar condições",
  liberar_desconto: "Liberar desconto",
  confirmar_disponibilidade: "Confirmar disponibilidade",
  opiniao_geral: "Opinião geral",
};

export type ConstrutoraVinculo = {
  id: string;
  construtoraId: string;
  construtoraNome: string;
  aguardandoOpiniao: boolean;
  tipoOpiniaoSolicitada: string | null;
  opiniaoSolicitadaEm: string | null;
  opiniaoSolicitadaTexto: string | null;
  opiniaoRecebidaEm: string | null;
  opiniaoTexto: string | null;
  opiniaoRecomenda: boolean | null;
  createdAt: string;
};

export type AtendimentoParaConstrutora = {
  vinculoId: string;
  atendimentoId: string;
  compradorNome: string;
  imovelDescricao: string | null;
  imovelEndereco: string | null;
  imovelValor: number | null;
  status: string;
  imobNome: string;
  corretorNome: string | null;
  corretorTelefone: string | null;
  aguardandoOpiniao: boolean;
  opiniaoSolicitadaEm: string | null;
  tipoOpiniaoSolicitada: string | null;
  opiniaoRecebidaEm: string | null;
  vinculadoEm: string;
};

export type TopParceiroImob = {
  imobiliariaId: string;
  razaoSocial: string;
  qtdAtendimentos: number;
  qtdFechados: number;
  qtdAguardando: number;
};

export type TopParceiroCorretor = {
  userId: string;
  nome: string;
  email: string;
  qtdAtendimentos: number;
  qtdFechados: number;
};
