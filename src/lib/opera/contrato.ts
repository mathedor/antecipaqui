/**
 * CAMADA DE CONTRATO — OPERA CAPITAL (QPROF)
 *
 * Todo detalhe que depende da documentação do fundo mora aqui: rotas, nomes
 * de campo, formato dos arquivos e catálogo de status. Nenhum agente e
 * nenhum webhook conhece esses nomes diretamente.
 *
 * Quando a documentação da OPERA chegar, o ajuste é em DOIS lugares e só:
 *   1. DEFAULT_CONTRATO abaixo (o que vale pra todo fundo 'opera'), ou
 *   2. fundos.integracaoContrato no banco (sobrescreve por fundo, sem deploy).
 *
 * Arquivo síncrono de propósito — é importado por rotas de webhook e por
 * actions "use server", que só podem exportar funções async.
 */

/** Uma rota do fundo: método, caminho e onde ler a resposta. */
export type OperaRota = {
  metodo: "GET" | "POST" | "PUT" | "PATCH";
  /** Caminho relativo à URL base. `{cnpj}` e `{id}` são substituídos. */
  caminho: string;
  /** Como o corpo viaja: JSON puro (padrão) ou multipart/form-data com o
   *  JSON inteiro dentro do campo `payload` — é o formato do envio de
   *  operação da OPERA. */
  corpo?: "json" | "multipart";
};

export type OperaContrato = {
  rotas: {
    /** Troca usuário/senha por token JWT (credencial tipo 'usuario_senha'). */
    autenticar?: OperaRota;
    /** Peça 01 — existe esse CNPJ na base? */
    consultarCliente: OperaRota;
    /** Peça 02 — cria o cliente com a ficha e os documentos. */
    cadastrarCliente: OperaRota;
    /** Peça 04 — envia a operação inteira. */
    enviarOperacao: OperaRota;
    /** Opcional: consulta de status sob demanda (rede de segurança caso um
     *  webhook se perca). */
    consultarOperacao?: OperaRota;
    /** Opcional: ping de saúde pro painel de conexão. */
    saude?: OperaRota;
  };
  /** Identidade e campos fixos que a OPERA exige em toda chamada. Cada fundo
   *  tem os seus — é o que permite vários fundos OPERA no mesmo painel. */
  envio: {
    /** Nome do parceiro na base do fundo. Ex.: "ANTECIPAQUI". */
    parceiro: string;
    /** CNPJ da empresa DENTRO do fundo (campo cnpj_empresa do payload). */
    cnpjEmpresa: string;
    /** Campos fixos do envio de operação — combinados com o fundo. */
    operacaoPreCalculada: boolean;
    faseLiberacao: string;
    executaFiltro: string;
    tipoDocumento: string;
    /** O sacado (construtora) também precisa de cadastro no fundo? Na OPERA
     *  não: só o cedente é cadastrado, o sacado vai inline nos títulos. */
    cadastrarSacado: boolean;
  };
  /** Onde ler cada informação na resposta do fundo. Cada campo aceita uma
   *  lista de caminhos candidatos — o primeiro que existir vence. Isso
   *  absorve variação de nomenclatura sem quebrar. */
  leitura: {
    clienteExisteFlag: string[];
    clienteId: string[];
    protocolo: string[];
    operacaoId: string[];
    /** Webhooks */
    eventoId: string[];
    eventoData: string[];
    /** Como o fundo identifica, no webhook, de qual operação está falando —
     *  pelo ID dele ou pela referência que mandamos junto no envio. */
    refOperacaoExterna: string[];
    refOperacaoNossa: string[];
    /** Idem pro cadastro de cliente. */
    refClienteProtocolo: string[];
    refClienteExterno: string[];
    refClienteCnpj: string[];
    situacaoCadastro: string[];
    motivo: string[];
    statusOperacao: string[];
    observacao: string[];
    linkAssinatura: string[];
    /** Duplicatas — a lista e os campos de cada item. */
    duplicatasLista: string[];
    duplicataNumero: string[];
    duplicataValor: string[];
    duplicataVencimento: string[];
    duplicataLink: string[];
    duplicataLinhaDigitavel: string[];
    duplicataCodigoBarras: string[];
    duplicataSacadoNome: string[];
    duplicataSacadoDocumento: string[];
  };
  /** Como os arquivos vão no cadastro: 'url' manda link assinado nosso,
   *  'base64' embute cada arquivo, 'zip_base64' compacta tudo num ZIP e
   *  manda o base64 dele (formato da OPERA: documentos.doc_outros). */
  documentos: {
    modo: "url" | "base64" | "zip_base64";
    /** Nome do campo que carrega a lista de documentos. */
    campo: string;
    /** Tipos que consideramos obrigatórios antes de enviar um cadastro.
     *  Faltando qualquer um, o job fica 'bloqueado' e o cliente é avisado —
     *  nunca mandamos cadastro pela metade. */
    obrigatorios: string[];
  };
  /** Cabeçalho onde o fundo assina os webhooks que manda pra gente. */
  assinatura: {
    header: string;
    /** 'hex' | 'base64'; prefixo opcional tipo "sha256=". */
    formato: "hex" | "base64";
    prefixo: string;
  };
};

/** Valores de partida — os caminhos reais da OperAPI (documentação recebida
 *  em 18/08/2026). O que varia por fundo (parceiro, cnpj_empresa, credencial)
 *  entra pelo painel em fundos.integracao_contrato / integracao_credenciais. */
export const DEFAULT_CONTRATO: OperaContrato = {
  rotas: {
    autenticar: { metodo: "POST", caminho: "/operapi/autenticacao/" },
    consultarCliente: {
      metodo: "POST",
      caminho: "/operapi/consulta-cliente-parceiro/",
    },
    cadastrarCliente: { metodo: "POST", caminho: "/operapi/criar-cliente/" },
    enviarOperacao: {
      metodo: "POST",
      caminho: "/operapi/enviar-operacao/",
      corpo: "multipart",
    },
    consultarOperacao: {
      metodo: "GET",
      caminho: "/operapi/consulta-integracao-operacao/?operacao_id={id}",
    },
  },
  envio: {
    // parceiro e cnpjEmpresa são POR FUNDO — sem eles configurados no
    // painel, os agentes ficam bloqueados com um motivo claro.
    parceiro: "",
    cnpjEmpresa: "",
    operacaoPreCalculada: true,
    faseLiberacao: "N",
    executaFiltro: "S",
    tipoDocumento: "D",
    cadastrarSacado: false,
  },
  leitura: {
    clienteExisteFlag: ["existe", "encontrado", "found", "data.existe"],
    clienteId: ["id", "clienteId", "cliente_id", "data.id", "data.clienteId"],
    protocolo: ["protocolo", "protocol", "data.protocolo"],
    operacaoId: [
      "id",
      "operacaoId",
      "operacao_id",
      "numero",
      "data.id",
      "data.operacaoId",
    ],
    eventoId: ["eventoId", "evento_id", "eventId", "idEvento"],
    eventoData: ["dataEvento", "ocorridoEm", "timestamp", "occurredAt", "data"],
    refOperacaoExterna: [
      "operacaoId",
      "operacao_id",
      "idOperacao",
      "externoId",
      "id",
    ],
    refOperacaoNossa: [
      "numero_operacao_parceiro",
      "referenciaExterna",
      "referencia_externa",
      "referencia",
      "externalId",
      "numeroAntecipaqui",
    ],
    refClienteProtocolo: ["protocolo", "protocol", "protocoloCadastro"],
    refClienteExterno: ["clienteId", "cliente_id", "idCliente", "id"],
    refClienteCnpj: ["cnpj", "documento", "cpfCnpj", "cnpjCliente"],
    situacaoCadastro: ["situacao", "status", "resultado", "data.situacao"],
    motivo: ["motivo", "observacao", "motivoRecusa", "reason", "message", "data.motivo"],
    statusOperacao: ["status", "situacao", "statusOperacao", "data.status"],
    observacao: [
      "observacao",
      "obs",
      "mensagem",
      "mensagem_erp",
      "status_detalhe",
      "message",
      "data.observacao",
    ],
    linkAssinatura: [
      "linkAssinatura",
      "urlAssinatura",
      "link_assinatura",
      "signUrl",
      "data.linkAssinatura",
    ],
    duplicatasLista: ["duplicatas", "titulos", "boletos", "data.duplicatas"],
    duplicataNumero: ["numero", "numeroTitulo", "id", "nossoNumero"],
    duplicataValor: ["valor", "valorTitulo", "amount"],
    duplicataVencimento: ["vencimento", "dataVencimento", "dueDate"],
    duplicataLink: ["link", "url", "pdf", "linkBoleto", "urlPdf"],
    duplicataLinhaDigitavel: ["linhaDigitavel", "linha_digitavel", "digitable"],
    duplicataCodigoBarras: ["codigoBarras", "codigo_barras", "barcode"],
    duplicataSacadoNome: ["sacado", "sacadoNome", "pagador", "pagadorNome"],
    duplicataSacadoDocumento: [
      "sacadoDocumento",
      "sacadoCnpj",
      "pagadorDocumento",
      "documento",
    ],
  },
  documentos: {
    // A OPERA recebe os documentos como base64 de um ZIP dentro de
    // documentos.doc_outros[0].outros_documentos.
    modo: "zip_base64",
    campo: "documentos",
    obrigatorios: ["contrato_social", "cartao_cnpj", "comprovante_endereco"],
  },
  assinatura: {
    // PROVISÓRIO — item 5 das pendências.
    header: "x-opera-signature",
    formato: "hex",
    prefixo: "sha256=",
  },
};

/** Mescla o contrato salvo no fundo por cima do padrão. Mescla rasa por
 *  seção — o que o fundo define ganha, o resto continua valendo. */
export function resolverContrato(
  salvo: unknown,
): OperaContrato {
  if (!salvo || typeof salvo !== "object") return DEFAULT_CONTRATO;
  const s = salvo as Partial<OperaContrato>;
  return {
    rotas: { ...DEFAULT_CONTRATO.rotas, ...(s.rotas ?? {}) },
    envio: { ...DEFAULT_CONTRATO.envio, ...(s.envio ?? {}) },
    leitura: { ...DEFAULT_CONTRATO.leitura, ...(s.leitura ?? {}) },
    documentos: { ...DEFAULT_CONTRATO.documentos, ...(s.documentos ?? {}) },
    assinatura: { ...DEFAULT_CONTRATO.assinatura, ...(s.assinatura ?? {}) },
  };
}

/* ─────────────────────────────────────────────
   CATÁLOGO DE STATUS — a tradução entre os dois mundos
   ───────────────────────────────────────────── */

export type PapelNotificado = "cedente" | "imobiliaria" | "construtora";

export type StatusTraduzido = {
  /** Status interno pro qual a esteira anda. */
  interno:
    | "analise_final"
    | "recusada"
    | "enviada_para_assinatura"
    | "enviada_para_pagamento"
    | "realizada";
  /** Rótulo curto que o cliente vê. */
  label: string;
  /** Frase que vai na notificação. */
  descricao: string;
  /** Quem é avisado. */
  avisar: PapelNotificado[];
  /** Manda e-mail além da notificação no painel. */
  email: boolean;
  /** Manda SMS/WhatsApp — reservado pros momentos em que alguém precisa AGIR. */
  urgente: boolean;
  /** Ação que o cliente pode tomar na hora. */
  acao?: "assinar" | "confirmar" | "corrigir";
};

/** Normaliza o texto do fundo pra chave comparável: sem acento, minúsculo,
 *  separado por underscore. "Aguardando Confirmação do Cedente" e
 *  "AGUARDANDO_CONFIRMACAO_CEDENTE" caem na mesma chave. */
export function normalizarStatus(raw: string): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Os sete estados da esteira da OPERA. As chaves extras são apelidos —
 *  variações de escrita que caem no mesmo destino. */
export const CATALOGO_STATUS: Record<string, StatusTraduzido> = {
  aguardando_aprovacao: {
    interno: "analise_final",
    label: "Em análise no fundo",
    descricao:
      "Sua operação foi recebida pelo fundo e está em análise. Assim que houver retorno, você é avisado por aqui.",
    avisar: ["cedente", "imobiliaria"],
    email: true,
    urgente: false,
  },
  reprovado: {
    interno: "recusada",
    label: "Recusada pelo fundo",
    descricao: "O fundo não aprovou esta operação.",
    avisar: ["cedente", "imobiliaria", "construtora"],
    email: true,
    urgente: true,
    acao: "corrigir",
  },
  preparando_documentacao: {
    interno: "analise_final",
    label: "Documentação em preparo",
    descricao:
      "A operação foi aceita e o fundo está preparando a documentação para assinatura.",
    avisar: ["cedente", "imobiliaria"],
    email: false,
    urgente: false,
  },
  aguardando_confirmacao_do_cedente: {
    interno: "analise_final",
    label: "Aguardando sua confirmação",
    descricao:
      "O fundo precisa da sua confirmação para seguir. A operação fica parada até você confirmar.",
    avisar: ["cedente", "imobiliaria"],
    email: true,
    urgente: true,
    acao: "confirmar",
  },
  enviado_para_assinatura: {
    interno: "enviada_para_assinatura",
    label: "Enviada para assinatura",
    descricao:
      "O contrato está pronto para assinatura. Use o link abaixo para assinar — ele vale só para você.",
    avisar: ["cedente", "imobiliaria", "construtora"],
    email: true,
    urgente: true,
    acao: "assinar",
  },
  aguardando_pagamento: {
    interno: "enviada_para_pagamento",
    label: "Aguardando pagamento",
    descricao:
      "Contrato assinado. O fundo está com o pagamento na fila de liberação.",
    avisar: ["cedente", "imobiliaria", "construtora"],
    email: true,
    urgente: false,
  },
  pago: {
    interno: "realizada",
    label: "Paga",
    descricao:
      "Pagamento liberado pelo fundo. As duplicatas ficam disponíveis no painel assim que forem emitidas.",
    avisar: ["cedente", "imobiliaria", "construtora"],
    email: true,
    urgente: true,
  },
};

/** Apelidos: escritas alternativas que caem no mesmo estado. Barato de
 *  ampliar quando aparecer uma variação nova em produção. */
const APELIDOS: Record<string, string> = {
  aguardando_analise: "aguardando_aprovacao",
  em_analise: "aguardando_aprovacao",
  analise: "aguardando_aprovacao",
  // Estados do pipeline de integração da OperAPI: pra quem antecipou, a
  // operação segue "em análise no fundo" até a esteira deles decidir.
  processando: "aguardando_aprovacao",
  recebida: "aguardando_aprovacao",
  concluida: "aguardando_aprovacao",
  concluido: "aguardando_aprovacao",
  recusado: "reprovado",
  reprovada: "reprovado",
  negado: "reprovado",
  preparando_documentos: "preparando_documentacao",
  documentacao: "preparando_documentacao",
  aguardando_confirmacao_cedente: "aguardando_confirmacao_do_cedente",
  aguardando_cedente: "aguardando_confirmacao_do_cedente",
  confirmacao_do_cedente: "aguardando_confirmacao_do_cedente",
  enviada_para_assinatura: "enviado_para_assinatura",
  em_assinatura: "enviado_para_assinatura",
  assinatura: "enviado_para_assinatura",
  aguardando_pagto: "aguardando_pagamento",
  liberacao_pagamento: "aguardando_pagamento",
  pago_confirmado: "pago",
  liquidado: "pago",
};

/** Traduz o status cru do fundo. Devolve null quando o estado é desconhecido:
 *  quem chama grava o cru, avisa o admin e NÃO mexe na esteira do cliente. */
export function traduzirStatus(raw: string): StatusTraduzido | null {
  const chave = normalizarStatus(raw);
  const alvo = APELIDOS[chave] ?? chave;
  return CATALOGO_STATUS[alvo] ?? null;
}

/* ─────────────────────────────────────────────
   LEITURA TOLERANTE DE RESPOSTA
   ───────────────────────────────────────────── */

/** Lê `a.b.c` dentro de um objeto desconhecido, sem estourar. */
function lerCaminho(obj: unknown, caminho: string): unknown {
  const partes = caminho.split(".");
  let atual: unknown = obj;
  for (const p of partes) {
    if (atual === null || typeof atual !== "object") return undefined;
    atual = (atual as Record<string, unknown>)[p];
  }
  return atual;
}

/** Primeiro caminho que existir vence. É o que absorve variação de
 *  nomenclatura do fundo sem quebrar a integração. */
export function ler(obj: unknown, caminhos: string[]): unknown {
  for (const c of caminhos) {
    const v = lerCaminho(obj, c);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

export function lerTexto(obj: unknown, caminhos: string[]): string | null {
  const v = ler(obj, caminhos);
  if (v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

export function lerNumero(obj: unknown, caminhos: string[]): number | null {
  const v = ler(obj, caminhos);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    // Aceita "1.234,56" (BR) e "1234.56" (US).
    const limpo = v.includes(",")
      ? v.replace(/\./g, "").replace(",", ".")
      : v;
    const n = parseFloat(limpo.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Datas: aceita ISO e dd/mm/aaaa. Devolve YYYY-MM-DD (formato de `date`). */
export function lerData(obj: unknown, caminhos: string[]): string | null {
  const v = lerTexto(obj, caminhos);
  if (!v) return null;
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function lerTimestamp(obj: unknown, caminhos: string[]): Date | null {
  const v = lerTexto(obj, caminhos);
  if (!v) return null;
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const d = new Date(br ? `${br[3]}-${br[2]}-${br[1]}` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** true/false tolerante: aceita booleano, "true"/"sim"/"S"/1 e a simples
 *  presença de um ID de cliente na resposta. */
export function lerFlag(obj: unknown, caminhos: string[]): boolean | null {
  const v = ler(obj, caminhos);
  if (v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = normalizarStatus(v);
    if (["true", "sim", "s", "1", "encontrado", "existe", "ativo"].includes(s))
      return true;
    if (["false", "nao", "n", "0", "nao_encontrado", "inexistente"].includes(s))
      return false;
  }
  return null;
}

/** Monta o caminho final trocando {cnpj} e {id}. */
export function montarCaminho(
  rota: OperaRota,
  vars: { cnpj?: string; id?: string } = {},
): string {
  return rota.caminho
    .replace("{cnpj}", encodeURIComponent(vars.cnpj ?? ""))
    .replace("{id}", encodeURIComponent(vars.id ?? ""));
}
