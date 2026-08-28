/**
 * FICHA DE CONEXÃO DO FUNDO
 *
 * Tudo que o time técnico do outro lado precisa pra plugar no Antecipaqui,
 * num lugar só: o ID do fundo (que vai na URL de todo webhook de entrada),
 * os endereços, o cabeçalho onde a assinatura viaja e quais chaves já estão
 * configuradas.
 *
 * Helper puro (sem "use server") de propósito: é montado dentro de páginas
 * server e também importado pelas actions que revelam/geram as chaves.
 * NUNCA carrega o valor das chaves — aqui só diz se existe ou não. Revelar
 * é ato explícito, passa por `lib/actions/fundo-conexao.ts` e fica no audit.
 */
import type { Fundo } from "@/db/schema";
import { resolverContrato } from "@/lib/opera/contrato";

export const CHAVES_CONEXAO = [
  "integracao",
  "cobranca",
  "contrato_assinatura",
] as const;
export type ChaveConexaoId = (typeof CHAVES_CONEXAO)[number];

export type ChaveConexao = {
  id: ChaveConexaoId;
  nome: string;
  /** Pra que serve, em uma linha. */
  desc: string;
  configurada: boolean;
  /** Faz sentido pro modo de operação atual deste fundo? */
  necessaria: boolean;
};

export type EndpointConexao = {
  id: string;
  nome: string;
  desc: string;
  /** "03", "05", "06" na numeração das peças da OperAPI; vazio nos demais. */
  peca?: string;
  metodo: "POST";
  url: string;
  /** Cabeçalho onde o fundo assina o corpo (HMAC-SHA256). */
  header: string;
  /** Prefixo aceito na assinatura ("sha256=" ou vazio). */
  prefixo: string;
  formato: "hex" | "base64";
  /** Qual das chaves assina este endereço. */
  chave: ChaveConexaoId;
  /** Ligado pro modo de operação atual do fundo. */
  ativo: boolean;
  /** Por que está desligado (quando ativo = false). */
  motivo?: string;
};

export type FichaConexao = {
  fundoId: string;
  fundoNome: string;
  baseUrl: string;
  integracaoTipo: string;
  integracaoAmbiente: string;
  integracaoApiUrl: string | null;
  /** Cabeçalho da assinatura que NÓS mandamos nos webhooks de saída. */
  headerSaida: string;
  /** Base da API REST de leitura/escrita (autenticada por Bearer aq_…). */
  apiBaseUrl: string;
  chaves: ChaveConexao[];
  endpoints: EndpointConexao[];
};

/** Cabeçalho fixo dos webhooks genéricos (cobrança e assinatura de contrato).
 *  Está escrito nas rotas em src/app/api/{cobranca,contrato-assinatura}. */
export const HEADER_WEBHOOK_GENERICO = "x-webhook-signature";
/** Cabeçalho que assina os webhooks de SAÍDA (nós → sistema do fundo). */
export const HEADER_SAIDA = "x-antecipaqui-signature";

export function baseUrlPublica(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.antecipaqui.digital"
  ).replace(/\/+$/, "");
}

export function montarFichaConexao(
  fundo: Fundo,
  baseUrl: string = baseUrlPublica(),
): FichaConexao {
  const contrato = resolverContrato(fundo.integracaoContrato);
  const assin = contrato.assinatura;

  const integracaoLigada = fundo.integracaoTipo !== "nenhuma";
  const cobrancaPorApi = fundo.boletosModo === "api";
  const contratoPeloFundo =
    fundo.contratoGeradoPor === "fundo" ||
    fundo.contratoAssinaturaEnviadaPor === "fundo";

  const endpoints: EndpointConexao[] = [
    {
      id: "opera_cadastro",
      nome: "Cadastro do cliente",
      desc: "O fundo avisa que o cadastro do cedente foi aprovado, recusado ou ficou pendente.",
      peca: "03",
      metodo: "POST",
      url: `${baseUrl}/api/opera/webhook/cadastro/${fundo.id}`,
      header: assin.header,
      prefixo: assin.prefixo,
      formato: assin.formato,
      chave: "integracao",
      ativo: integracaoLigada,
      motivo: "Integração ponta a ponta desligada neste fundo.",
    },
    {
      id: "opera_status",
      nome: "Status da operação",
      desc: "Cada passo da esteira lá dentro vira status, linha do tempo e aviso pro cliente aqui.",
      peca: "05",
      metodo: "POST",
      url: `${baseUrl}/api/opera/webhook/status/${fundo.id}`,
      header: assin.header,
      prefixo: assin.prefixo,
      formato: assin.formato,
      chave: "integracao",
      ativo: integracaoLigada,
      motivo: "Integração ponta a ponta desligada neste fundo.",
    },
    {
      id: "opera_duplicatas",
      nome: "Duplicatas",
      desc: "Boletos gerados pelo fundo — número, valor, vencimento, linha digitável e link.",
      peca: "06",
      metodo: "POST",
      url: `${baseUrl}/api/opera/webhook/duplicatas/${fundo.id}`,
      header: assin.header,
      prefixo: assin.prefixo,
      formato: assin.formato,
      chave: "integracao",
      ativo: integracaoLigada,
      motivo: "Integração ponta a ponta desligada neste fundo.",
    },
    {
      id: "cobranca",
      nome: "Retorno de cobrança",
      desc: "Liquidação de parcela: o banco/fundo avisa que o boleto foi pago e a parcela baixa aqui.",
      metodo: "POST",
      url: `${baseUrl}/api/cobranca/webhook/${fundo.id}`,
      header: HEADER_WEBHOOK_GENERICO,
      prefixo: "sha256=",
      formato: "hex",
      chave: "cobranca",
      ativo: cobrancaPorApi,
      motivo: `Cobrança deste fundo está no modo "${fundo.boletosModo}" — só o modo "api" usa este endereço.`,
    },
    {
      id: "contrato_assinatura",
      nome: "Contrato gerado / assinado",
      desc: "Quando o contrato nasce ou é assinado no sistema do fundo, o retorno entra por aqui.",
      metodo: "POST",
      url: `${baseUrl}/api/contrato-assinatura/webhook/${fundo.id}`,
      header: HEADER_WEBHOOK_GENERICO,
      prefixo: "sha256=",
      formato: "hex",
      chave: "contrato_assinatura",
      ativo: contratoPeloFundo,
      motivo: "Contrato deste fundo é gerado e enviado pelo Antecipaqui.",
    },
  ];

  const chaves: ChaveConexao[] = [
    {
      id: "integracao",
      nome: "Chave de conexão (integração)",
      desc: "Assina os três webhooks da esteira: cadastro, status e duplicatas.",
      configurada: Boolean(fundo.integracaoWebhookSecret),
      necessaria: integracaoLigada,
    },
    {
      id: "cobranca",
      nome: "Chave de cobrança",
      desc: "Assina o retorno de liquidação de boleto.",
      configurada: Boolean(fundo.cobrancaWebhookSecret),
      necessaria: cobrancaPorApi,
    },
    {
      id: "contrato_assinatura",
      nome: "Chave de assinatura de contrato",
      desc: "Assina o retorno de contrato gerado/assinado pelo fundo.",
      configurada: Boolean(fundo.contratoAssinaturaWebhookSecret),
      necessaria: contratoPeloFundo,
    },
  ];

  return {
    fundoId: fundo.id,
    fundoNome: fundo.nomeFantasia ?? fundo.razaoSocial,
    baseUrl,
    integracaoTipo: fundo.integracaoTipo,
    integracaoAmbiente: fundo.integracaoAmbiente,
    integracaoApiUrl: fundo.integracaoApiUrl,
    headerSaida: HEADER_SAIDA,
    apiBaseUrl: `${baseUrl}/api/external/fundo`,
    chaves,
    endpoints,
  };
}
