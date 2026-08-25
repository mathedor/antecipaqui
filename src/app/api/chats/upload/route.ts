import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/octet-stream",
];

const MAX_SIZE_BYTES = 15 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Storage não configurado (BLOB_READ_WRITE_TOKEN ausente)." },
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
          throw new Error("Sessão expirada — faça login pra enviar anexos.");
        }
        return {
          access: "private",
          // Pathname não-adivinhável (impede enumeração de arquivos).
          addRandomSuffix: true,
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_SIZE_BYTES,
          tokenPayload: JSON.stringify({ userId, pathname, scope: "chat" }),
        };
      },
      onUploadCompleted: async () => {
        // sem side-effect; client registra a URL na próxima mensagem
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    const msg = (e as Error).message || "Erro desconhecido no upload";
    const status = msg.toLowerCase().includes("sessão") ? 401 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
