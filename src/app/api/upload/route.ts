import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Endpoint de upload pro Vercel Blob.
 * Cliente chama via @vercel/blob/client `upload()` — a função abaixo
 * autentica o usuário, gera o token de upload e devolve.
 *
 * Erros comuns:
 * - 401 não autenticado (sessão Clerk expirou)
 * - 500 BLOB_READ_WRITE_TOKEN ausente no env (config Vercel)
 * - 413 arquivo > 15MB
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verifica config crítica primeiro pra dar erro útil
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("[upload] BLOB_READ_WRITE_TOKEN ausente no env");
    return NextResponse.json(
      {
        error:
          "Storage de arquivos não configurado (BLOB_READ_WRITE_TOKEN ausente). Avise o admin.",
      },
      { status: 500 },
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch (e) {
    return NextResponse.json(
      { error: "Payload inválido: " + (e as Error).message },
      { status: 400 },
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();
        if (!userId) {
          throw new Error(
            "Sessão expirada — faça login novamente pra enviar arquivos.",
          );
        }
        return {
          access: "private",
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/pjpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 15 * 1024 * 1024,
          tokenPayload: JSON.stringify({ userId, pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log("[blob] uploaded", { url: blob.url, tokenPayload });
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const msg = (e as Error).message || "Erro desconhecido no upload";
    console.error("[upload] erro:", msg, e);
    const status = msg.toLowerCase().includes("sessão") ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
