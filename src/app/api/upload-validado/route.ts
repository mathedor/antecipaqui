/** Validação de conteúdo de upload por IA — SEM passar o arquivo pela função.
 *
 *  ⚠️ Por que não recebemos mais o arquivo no corpo:
 *  Funções serverless da Vercel têm limite RÍGIDO de 4,5 MB no corpo da
 *  requisição. Fotos de contrato tiradas no iPhone/iPad passam disso e a
 *  Vercel devolvia 413 ANTES do código rodar ("Erro 413 no upload"). Por isso
 *  o arquivo agora sobe direto do navegador pro Blob (client-side, via
 *  @vercel/blob/client → /api/upload) e aqui só recebemos a URL/pathname.
 *
 *  Fluxo:
 *  1. Cliente já subiu o arquivo pro Blob (private) e manda JSON { url, pathname, tipo }
 *  2. Lemos o arquivo de volta do Blob (get private) → buffer
 *  3. Validamos o conteúdo via Claude Haiku 4.5 (vision)
 *  4. Se não bate com o tipo → apaga o blob e retorna 422 com motivo
 *  5. Se bate → mantém o blob e retorna URL + resultado da validação
 *
 *  Cliente recebe:
 *    200 { url, status: 'ok' | 'revisao', motivo, confianca }
 *    422 { error, motivo }   ← rejeitado, mostrar mensagem ao user
 *    400/401/500            ← erros operacionais
 */

import { auth } from "@clerk/nextjs/server";
import { del, get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import {
  decidirStatusDocumento,
  validarConteudoDocumento,
  type DocumentoTipo,
} from "@/lib/validar-documento-upload";

export const runtime = "nodejs";
export const maxDuration = 60; // 60s suficiente pra ler do Blob + Haiku (~3s)

const TIPOS_VALIDOS: DocumentoTipo[] = [
  "cartao_cnpj",
  "contrato_social",
  "comprovante_endereco",
  "rg",
  "cpf",
  "creci",
  "contrato_venda",
  "contrato_comissao",
  "nota_fiscal",
  "comprovante_entrada",
  "outro",
];

const MIME_TYPES_ACEITOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB (backstop; o token de upload já limita)

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Sessão expirada — faça login novamente." },
      { status: 401 },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Storage não configurado — avise o admin." },
      { status: 500 },
    );
  }

  // Corpo é só JSON com a referência do blob já enviado — nunca o arquivo.
  let body: { url?: string; pathname?: string; tipo?: string };
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { error: "Payload inválido: " + (e as Error).message },
      { status: 400 },
    );
  }

  const tipo = String(body.tipo || "").trim();
  const pathname = String(body.pathname || "").trim();
  const url = String(body.url || "").trim();
  const ref = pathname || url;

  if (!ref) {
    return NextResponse.json(
      { error: "Referência do arquivo ausente." },
      { status: 400 },
    );
  }
  if (!TIPOS_VALIDOS.includes(tipo as DocumentoTipo)) {
    return NextResponse.json(
      { error: `Tipo de documento inválido: "${tipo}".` },
      { status: 400 },
    );
  }

  // Lê o arquivo de volta do Blob (private). useCache:false → origem direta,
  // evita atraso de propagação do CDN logo após o upload.
  let result;
  try {
    result = await get(ref, { access: "private", useCache: false });
  } catch (e) {
    console.error("[upload-validado] falha ao ler blob", {
      ref,
      error: (e as Error).message,
    });
    return NextResponse.json(
      { error: "Não consegui ler o arquivo enviado. Tente de novo." },
      { status: 500 },
    );
  }
  if (!result || result.statusCode !== 200 || !result.stream) {
    return NextResponse.json(
      { error: "Arquivo enviado não foi encontrado no storage." },
      { status: 404 },
    );
  }

  const mimeType = result.blob.contentType || "application/octet-stream";
  const size = result.blob.size ?? 0;

  // Backstop de tamanho (o token de upload já limita a 15MB no upload direto)
  if (size > MAX_SIZE) {
    await del(ref).catch(() => {});
    return NextResponse.json({ error: "Arquivo maior que 15MB." }, { status: 413 });
  }
  if (!MIME_TYPES_ACEITOS.has(mimeType)) {
    await del(ref).catch(() => {});
    return NextResponse.json(
      { error: `Tipo de arquivo não suportado: ${mimeType}.` },
      { status: 415 },
    );
  }

  // Materializa o stream em buffer pra mandar pra IA
  const arrayBuffer = await new Response(result.stream).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validação IA
  const validacao = await validarConteudoDocumento({
    buffer,
    mimeType,
    tipoEsperado: tipo as DocumentoTipo,
  });
  const status = decidirStatusDocumento(validacao);

  if (status === null) {
    // Recusa — apaga o blob pra não acumular lixo no storage
    await del(ref).catch(() => {});
    return NextResponse.json(
      {
        error: "Arquivo não bate com o tipo declarado.",
        motivo: validacao.motivo,
        confianca: validacao.confianca,
      },
      { status: 422 },
    );
  }

  // Aprovado — blob já está no storage; devolve a URL canônica
  return NextResponse.json(
    {
      url: result.blob.url,
      pathname: result.blob.pathname,
      contentType: mimeType,
      sizeBytes: size,
      status,
      motivo: validacao.motivo,
      confianca: validacao.confianca,
    },
    { status: 200 },
  );
}
