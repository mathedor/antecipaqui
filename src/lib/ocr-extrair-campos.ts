/** Extração de campos-chave de documento via Claude vision.
 *
 *  Usado quando o corretor sobe um contrato e quer auto-preencher o form
 *  com dados extraídos (data da venda, valor da venda, valor da comissão,
 *  número de parcelas etc).
 *
 *  Fail-open: se a IA falhar, retorna `{ ok: false }` e o corretor preenche
 *  manualmente.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const SYSTEM_PROMPT = `Você extrai campos-chave de contratos imobiliários brasileiros (compra e venda, contrato de comissionamento/corretagem, nota fiscal) para uma fintech que antecipa a COMISSÃO do corretor. Precisão é crítica — leia com atenção e não confunda os valores.

Extraia:

1. valorVenda (R$): preço TOTAL de venda do imóvel — o valor do negócio (normalmente o maior valor do contrato).

2. COMISSÃO de corretagem (a remuneração do corretor/imobiliária pela intermediação — NUNCA confunda com o valor da venda nem com a entrada do comprador):
   - valorComissao (R$): valor da comissão em reais, SE o documento trouxer um valor explícito em R$.
   - comissaoPercentual: SE a comissão vier como porcentagem (ex: "comissão de 5%", "6% sobre o valor da venda"), retorne como FRAÇÃO DECIMAL — 5% vira 0.05, 6% vira 0.06. NUNCA retorne 5 ou 6.
   - A comissão tipicamente é 3% a 6% do valor da venda. Se um suposto "valor de comissão" ficar maior que o valor da venda ou perto dele, você pegou o campo errado.
   - Pode retornar os dois (valor e percentual). Se só houver um, deixe o outro null. NÃO invente.

3. numeroParcelas: em quantas parcelas a COMISSÃO será paga AO CORRETOR. NÃO é o parcelamento do financiamento/venda do imóvel (que pode ser 24x, 60x). A comissão costuma ser à vista ou em poucas parcelas — quase sempre de 1 a 4. Se não estiver claro o parcelamento da comissão, use 1.

4. dataVenda (YYYY-MM-DD): data de assinatura/celebração do contrato.

5. construtora (a VENDEDORA/incorporadora que DEVE a comissão — NÃO o comprador, NÃO o corretor/imobiliária):
   - construtoraNome: razão social ou nome da construtora/incorporadora.
   - construtoraCnpj: CNPJ dela, se visível (pode manter a pontuação).

Princípios:
- Se um campo não estiver claro, deixe null. NÃO invente.
- Valores monetários SEMPRE como número puro, sem R$ nem separador de milhar. Ex: "1.234.567,89" → 1234567.89.
- comissaoPercentual SEMPRE como fração decimal (0.05 = 5%).
- Datas em ISO YYYY-MM-DD. Se só vir mês/ano, use dia 1.
- confianca: 0-1, sua certeza geral. observacao: nota curta do que identificou ou de qualquer dúvida.`;

const ExtracaoSchema = z.object({
  valorVenda: z.number().nullable(),
  valorComissao: z.number().nullable(),
  comissaoPercentual: z.number().nullable(),
  dataVenda: z.string().nullable(),
  numeroParcelas: z.number().int().min(1).max(120).nullable(),
  construtoraNome: z.string().nullable(),
  construtoraCnpj: z.string().nullable(),
  confianca: z.number().min(0).max(1),
  observacao: z.string(),
});

export type ExtracaoCampos = z.infer<typeof ExtracaoSchema>;

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) {
    // Timeout abaixo do maxDuration (60s) + sem retry, pra não pendurar a
    // função em PDF grande. Fail-open: o corretor preenche manual se falhar.
    cachedClient = new Anthropic({ timeout: 45_000, maxRetries: 0 });
  }
  return cachedClient;
}

export async function extrairCamposContrato(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<
  | { ok: true; data: ExtracaoCampos }
  | { ok: false; error: string }
> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "Extração desabilitada (sem ANTHROPIC_API_KEY)" };
  }

  const { buffer, mimeType } = input;
  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");
  if (!isPdf && !isImage) {
    return { ok: false, error: `Tipo ${mimeType} não suportado pelo OCR` };
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

  try {
    const client = getClient();
    const response = await client.messages.parse({
      // Sonnet (não Haiku): extração de comissão/parcelas exige leitura mais
      // cuidadosa do contrato. É um uso pontual (uma importação por vez).
      model: "claude-sonnet-4-6",
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
              text: "Extraia os campos do documento. Atenção especial à COMISSÃO (valor em R$ e/ou percentual como fração decimal) e ao número de parcelas DA COMISSÃO (não do financiamento do imóvel).",
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ExtracaoSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      return { ok: false, error: "Sem retorno estruturado da IA" };
    }
    return { ok: true, data: parsed };
  } catch (e) {
    console.error("[ocr] falha na extração:", e);
    return { ok: false, error: (e as Error).message };
  }
}
