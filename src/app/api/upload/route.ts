import { auth } from "@clerk/nextjs/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Endpoint de upload pro Vercel Blob.
 * Cliente chama via @vercel/blob/client `upload()` — a função abaixo
 * autentica o usuário, gera o token de upload e devolve.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const { userId } = await auth();
        if (!userId) {
          throw new Error("Não autorizado");
        }
        return {
          allowedContentTypes: [
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
          ],
          maximumSizeInBytes: 15 * 1024 * 1024, // 15MB
          tokenPayload: JSON.stringify({ userId, pathname }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Hook pra pós-upload — por enquanto só log; persistência
        // do documento acontece via server action quando o form é submitido
        console.log("[blob] uploaded", { url: blob.url, tokenPayload });
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
