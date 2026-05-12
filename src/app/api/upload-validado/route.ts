/** Upload com validação prévia por IA.
 *
 *  Fluxo:
 *  1. Recebe multipart/form-data: { file, tipo }
 *  2. Valida conteúdo via Claude Haiku 4.5 (vision)
 *  3. Se Claude diz que não bate com o tipo → 422 com motivo
 *  4. Se bate → faz upload pro Vercel Blob e retorna URL + resultado
 *
 *  Cliente recebe:
 *    200 { url, status: 'ok' | 'revisao', motivo, confianca }
 *    422 { error, motivo }   ← rejeitado, mostrar mensagem ao user
 *    400/401/500            ← erros operacionais
 */

import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import {
  decidirStatusDocumento,
  validarConteudoDocumento,
  type DocumentoTipo,
} from "@/lib/validar-documento-upload";

export const runtime = "nodejs";
export const maxDuration = 60; // 60s suficiente pra Haiku (~3s) + upload

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

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch (e) {
    return NextResponse.json(
      { error: "Payload inválido: " + (e as Error).message },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const tipo = String(form.get("tipo") || "").trim();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (!TIPOS_VALIDOS.includes(tipo as DocumentoTipo)) {
    return NextResponse.json(
      { error: `Tipo de documento inválido: "${tipo}".` },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Arquivo maior que 15MB.` },
      { status: 413 },
    );
  }
  const mimeType = file.type || "application/octet-stream";
  if (!MIME_TYPES_ACEITOS.has(mimeType)) {
    return NextResponse.json(
      { error: `Tipo de arquivo não suportado: ${mimeType}.` },
      { status: 415 },
    );
  }

  // Lê o arquivo em memória pra mandar pra IA + pro Blob
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Validação IA
  const validacao = await validarConteudoDocumento({
    buffer,
    mimeType,
    tipoEsperado: tipo as DocumentoTipo,
  });
  const status = decidirStatusDocumento(validacao);

  if (status === null) {
    // Recusa
    return NextResponse.json(
      {
        error: "Arquivo não bate com o tipo declarado.",
        motivo: validacao.motivo,
        confianca: validacao.confianca,
      },
      { status: 422 },
    );
  }

  // Aprovado — faz upload pro Blob (server-side, server gerencia o token)
  // Pathname inclui userId pra separar uploads por usuário
  const ext = mimeType.split("/")[1]?.split("+")[0] ?? "bin";
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const pathname = `${userId}/${tipo}/${Date.now()}_${cleanName || `upload.${ext}`}`;

  const blob = await put(pathname, buffer, {
    access: "private",
    contentType: mimeType,
    addRandomSuffix: true,
  });

  return NextResponse.json(
    {
      url: blob.url,
      pathname: blob.pathname,
      contentType: mimeType,
      sizeBytes: file.size,
      status,
      motivo: validacao.motivo,
      confianca: validacao.confianca,
    },
    { status: 200 },
  );
}
