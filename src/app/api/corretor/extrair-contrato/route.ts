/** OCR de contrato — extrai campos pra pré-preencher o cadastro de operação.
 *
 *  ⚠️ O arquivo NÃO é recebido no corpo da requisição (igual /api/upload-validado):
 *  funções serverless da Vercel têm teto rígido de 4,5 MB no corpo, e foto de
 *  contrato do iPhone/iPad passa disso → 413 antes do código rodar. Por isso o
 *  cliente sobe o arquivo direto pro Blob e aqui recebemos só a URL/pathname.
 *
 *  O arquivo aqui é apenas SCRATCH pro OCR — apagamos do Blob depois de extrair
 *  (os documentos definitivos da operação são enviados à parte no formulário).
 */

import { auth } from "@clerk/nextjs/server";
import { del, get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import { extrairCamposContrato } from "@/lib/ocr-extrair-campos";
import { consumir } from "@/lib/seguranca/rate-limit";

// OCR chama modelo pago por request. Teto por usuário pra conter dreno de
// custo (loop de uploads) sem atrapalhar o uso normal de cadastro.
const OCR_LIMITE = 8;
const OCR_JANELA_MS = 60_000;

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SIZE = 15 * 1024 * 1024;
const ACEITOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const limite = consumir(`ocr:${userId}`, OCR_LIMITE, OCR_JANELA_MS);
  if (!limite.ok) {
    return NextResponse.json(
      { error: "Muitas extrações seguidas. Aguarde um instante e tente de novo." },
      { status: 429, headers: { "retry-after": String(limite.retryEmSeg) } },
    );
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Storage não configurado — avise o admin." },
      { status: 500 },
    );
  }

  // Corpo é só JSON com a referência do blob já enviado — nunca o arquivo.
  let body: { url?: string; pathname?: string };
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { error: "Payload inválido: " + (e as Error).message },
      { status: 400 },
    );
  }
  const ref = String(body.pathname || body.url || "").trim();
  if (!ref) {
    return NextResponse.json(
      { error: "Referência do arquivo ausente." },
      { status: 400 },
    );
  }

  // Trava anti-IDOR: só operamos em arquivos de scratch de OCR (ocr-temp/…),
  // que é onde o cliente sobe o arquivo transitório. Sem isso, um pathname
  // arbitrário (ex.: fundos/<id>/contrato/…) seria LIDO e DELETADO daqui —
  // exfiltração e destruição de documento definitivo de outro tenant.
  const caminhoBlob = (() => {
    try {
      return ref.startsWith("http") ? new URL(ref).pathname.replace(/^\/+/, "") : ref;
    } catch {
      return ref;
    }
  })();
  if (!caminhoBlob.startsWith("ocr-temp/") || caminhoBlob.includes("..")) {
    return NextResponse.json(
      { error: "Referência de arquivo não permitida." },
      { status: 403 },
    );
  }

  // Lê o arquivo de volta do Blob (private, origem direta).
  let result;
  try {
    result = await get(caminhoBlob, { access: "private", useCache: false });
  } catch (e) {
    console.error("[extrair-contrato] falha ao ler blob", {
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
  if (size > MAX_SIZE) {
    await del(caminhoBlob).catch(() => {});
    return NextResponse.json({ error: "Arquivo > 15MB" }, { status: 413 });
  }
  if (!ACEITOS.has(mimeType)) {
    await del(caminhoBlob).catch(() => {});
    return NextResponse.json(
      { error: `Tipo ${mimeType} não suportado` },
      { status: 415 },
    );
  }

  const arrayBuffer = await new Response(result.stream).arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const r = await extrairCamposContrato({ buffer, mimeType });

  // Scratch — apaga sempre depois de extrair (sucesso ou não).
  await del(caminhoBlob).catch(() => {});

  if (!r.ok) {
    return NextResponse.json({ error: r.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...r.data });
}
