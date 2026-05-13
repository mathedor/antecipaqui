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

const SYSTEM_PROMPT = `Você é um assistente que extrai campos-chave de contratos imobiliários brasileiros (compra e venda, comissionamento, nota fiscal).

Sua tarefa: ler o documento (imagem ou PDF) e extrair:
- valor da venda (R$)
- valor da comissão (R$ ou %)
- data da venda (YYYY-MM-DD)
- número de parcelas da comissão
- razão social ou nome da construtora/incorporadora
- CNPJ da construtora se visível

Princípios:
- Se um campo não estiver claro, deixe como null. NÃO invente.
- Valores monetários: SEMPRE em número (sem R$, sem separadores). Ex: "1.234.567,89" → 1234567.89
- Datas: ISO YYYY-MM-DD. Se só vir mês e ano, use dia 1.
- Confiança: 0-1, sua certeza geral da extração.`;

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
  if (!cachedClient) cachedClient = new Anthropic();
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
              text: "Extraia os campos do documento.",
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
