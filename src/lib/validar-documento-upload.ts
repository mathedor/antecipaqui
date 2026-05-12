/** Validação de conteúdo de upload via Claude Haiku 4.5 com vision.
 *
 *  Lê o arquivo (PDF ou imagem) e classifica se bate com o tipo de
 *  documento declarado pelo usuário. Retorna JSON estruturado:
 *    { valido, confianca, motivo }
 *
 *  - valido=false  → upload deve ser RECUSADO; motivo é a mensagem ao user
 *  - valido=true   → aceita; se confianca < 0.7, marca pra revisão admin
 *
 *  Usa structured outputs via zodOutputFormat pra garantir o shape do retorno
 *  e prompt caching no template do system pra reusar entre validações.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export type DocumentoTipo =
  | "cartao_cnpj"
  | "contrato_social"
  | "comprovante_endereco"
  | "rg"
  | "cpf"
  | "creci"
  | "contrato_venda"
  | "contrato_comissao"
  | "nota_fiscal"
  | "comprovante_entrada"
  | "outro";

const CRITERIOS_POR_TIPO: Record<DocumentoTipo, string> = {
  cartao_cnpj:
    "CARTÃO CNPJ (Comprovante de Inscrição) emitido pela Receita Federal do Brasil. Deve conter: número de CNPJ (XX.XXX.XXX/XXXX-XX), Razão Social, Nome Fantasia opcional, Data de Abertura, Situação Cadastral (ATIVA/INAPTA), Atividade Econômica Principal (CNAE), Endereço completo. Layout típico em formato de relatório, com cabeçalho da Receita Federal e watermark 'comprovante de inscrição'.",
  contrato_social:
    "CONTRATO SOCIAL ou ESTATUTO de pessoa jurídica. Documento que define a constituição da empresa, com cláusulas, sócios, capital social, atividades. Pode ser escritura, alteração contratual, ou requerimento de empresário individual. Geralmente registrado na Junta Comercial.",
  comprovante_endereco:
    "COMPROVANTE DE ENDEREÇO recente (últimos 90 dias). Conta de luz, água, gás, telefone fixo, internet, IPTU, ou correspondência de instituição financeira/governamental. Deve ter: nome do titular ou da empresa, endereço completo, data de emissão recente.",
  rg: "RG (CARTEIRA DE IDENTIDADE) brasileira. Frente e/ou verso com nome, RG, CPF (em algumas versões), data de nascimento, filiação, foto. Aceitar CNH também como equivalente (com nome, foto, número de habilitação).",
  cpf: "CPF (CADASTRO DE PESSOA FÍSICA) — comprovante de inscrição emitido pela Receita Federal, OU documento oficial que contenha o CPF visível (RG com CPF, CNH, ou cartão de CPF físico).",
  creci:
    "CRECI (Conselho Regional de Corretores de Imóveis) — carteira ou certidão de inscrição como corretor de imóveis. Deve conter: número de inscrição CRECI, estado, nome do corretor, foto (na carteira), validade.",
  contrato_venda:
    "CONTRATO DE COMPRA E VENDA de imóvel. Deve conter: identificação das partes (vendedor e comprador), descrição do imóvel (endereço, matrícula), valor da venda, condições de pagamento (à vista, parcelado), assinaturas (ou indicação de onde serão). Pode ser instrumento particular ou escritura pública.",
  contrato_comissao:
    "CONTRATO DE COMISSIONAMENTO ou CONTRATO DE CORRETAGEM. Define a remuneração do corretor/imobiliária pela intermediação de uma venda. Deve conter: partes (corretor/imobiliária e construtora/vendedor), referência ao imóvel ou empreendimento, percentual ou valor da comissão, prazo e condições de pagamento da comissão.",
  nota_fiscal:
    "NOTA FISCAL (NF) ou NFS-e (Nota Fiscal de Serviço Eletrônica). Documento fiscal com: emitente (com CNPJ), tomador, descrição do serviço/produto, valor, número da nota, data de emissão, tributos. Tipicamente em formato padronizado da prefeitura ou da Receita.",
  comprovante_entrada:
    "COMPROVANTE DE ENTRADA — recibo, comprovante de transferência bancária, depósito, PIX, ou documento similar comprovando o pagamento da entrada de uma compra de imóvel. Deve ter: valor, data, pagador, beneficiário (ou referência ao imóvel/operação).",
  outro:
    "Tipo genérico — aceitar qualquer documento que pareça oficial e legível. Recusar apenas se for imagem irrelevante (foto pessoal, screenshot aleatório, meme, etc.).",
};

const SYSTEM_PROMPT = `Você é um classificador de documentos brasileiros para uma fintech de antecipação de comissão imobiliária (Antecipaqui).

Sua tarefa: dado um arquivo (imagem ou PDF) e um TIPO ESPERADO declarado pelo usuário, decidir se o arquivo bate com o tipo.

Princípios:
- Seja TOLERANTE: aceite qualquer documento que seja PLAUSIVELMENTE do tipo declarado, mesmo que com qualidade ruim, parcialmente recortado, ou rotacionado.
- Recuse SÓ se o arquivo claramente NÃO é do tipo (ex: foto de gato no campo "cartão CNPJ", screenshot de planilha no campo "contrato").
- Se o arquivo é o tipo certo mas está ilegível/borrado/cortado a ponto de impedir leitura dos campos principais, considere VÁLIDO mas com confiança baixa (ex: 0.3-0.5) — o admin revisará.
- "outro" deve ser bem permissivo: aceitar qualquer documento que pareça oficial.

Retorne JSON com:
- valido (bool): true se bate com o tipo, false se claramente não bate
- confianca (number entre 0 e 1): seu grau de certeza
- motivo (string em PORTUGUÊS, curto, direto ao user):
    Se valido=true: descreva BREVEMENTE o que você identificou (ex: "Cartão CNPJ identificado. Razão Social: X. CNPJ: Y. Situação: ATIVA.").
    Se valido=false: explique gentilmente o que viu e peça versão mais clara do documento correto. Ex: "Esse arquivo parece ser uma [coisa X], não um [tipo esperado]. Envie [tipo esperado] — preciso ver [campos principais]."`;

const ValidationResultSchema = z.object({
  valido: z.boolean(),
  confianca: z.number().min(0).max(1),
  motivo: z.string().min(1).max(500),
});

export type ValidacaoResultado = z.infer<typeof ValidationResultSchema>;

/** Se ANTHROPIC_API_KEY ausente, validação fica desativada (sempre aceita). */
function isEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export async function validarConteudoDocumento(input: {
  buffer: Buffer;
  mimeType: string;
  tipoEsperado: DocumentoTipo;
}): Promise<ValidacaoResultado> {
  if (!isEnabled()) {
    return {
      valido: true,
      confianca: 0,
      motivo: "Validação por IA desabilitada (ANTHROPIC_API_KEY ausente).",
    };
  }

  const { buffer, mimeType, tipoEsperado } = input;
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    return {
      valido: true,
      confianca: 0,
      motivo: `Tipo de arquivo ${mimeType} não suportado pela validação por IA — aceito sem checagem.`,
    };
  }

  const base64 = buffer.toString("base64");
  const sourceBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mimeType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: base64,
        },
      };

  const criterio = CRITERIOS_POR_TIPO[tipoEsperado] ?? CRITERIOS_POR_TIPO.outro;

  const client = getClient();

  try {
    const response = await client.messages.parse({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            sourceBlock,
            {
              type: "text",
              text: `Tipo esperado: ${tipoEsperado}\n\nCritério: ${criterio}\n\nEsse arquivo bate com esse tipo?`,
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ValidationResultSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return {
        valido: true,
        confianca: 0,
        motivo:
          "Validação por IA não retornou um resultado estruturado — aceito sem checagem.",
      };
    }
    return parsed;
  } catch (e) {
    // Fail-open: se IA falhar (timeout, erro de rede, etc.), aceita o upload
    // pra não bloquear o user. Log pra investigação.
    console.error("[validacao-doc] falha na validação por IA:", e);
    return {
      valido: true,
      confianca: 0,
      motivo:
        "Validação por IA indisponível no momento — aceito sem checagem.",
    };
  }
}

/** Decisão de status do documento baseado no resultado da validação.
 *  - 'ok'      : valido + confianca >= 0.7
 *  - 'revisao' : valido + confianca < 0.7 OU validação desabilitada
 *  - null      : conteúdo não bate (caller deve recusar upload) */
export function decidirStatusDocumento(
  r: ValidacaoResultado,
): "ok" | "revisao" | null {
  if (!r.valido) return null;
  if (r.confianca >= 0.7) return "ok";
  return "revisao";
}
