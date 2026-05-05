import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy autenticado pra Vercel Blob (store private).
 *
 * Qualquer arquivo enviado via @vercel/blob/client.upload() com
 * `access: "private"` só é acessível via Authorization Bearer com o
 * BLOB_READ_WRITE_TOKEN. Esse endpoint faz `get()` server-side e
 * stream o conteúdo pro client autenticado.
 *
 * Autorização: por enquanto qualquer usuário logado. Quando precisar
 * de regras finas (corretor X só vê seus docs, etc), adicionar lookup
 * no DB pelo pathname e checar relação user→arquivo.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ pathname: string[] }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { pathname: parts } = await params;
  const pathname = parts.join("/");
  if (!pathname) {
    return new NextResponse("Pathname vazio", { status: 400 });
  }

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || !result.stream) {
      return new NextResponse("Arquivo não encontrado", { status: 404 });
    }

    const download = req.nextUrl.searchParams.get("download") === "1";
    const filename = pathname.split("/").pop() ?? "arquivo";
    const headers = new Headers();
    headers.set(
      "content-type",
      result.blob.contentType ?? "application/octet-stream",
    );
    if (result.blob.size) {
      headers.set("content-length", String(result.blob.size));
    }
    headers.set(
      "content-disposition",
      `${download ? "attachment" : "inline"}; filename="${filename}"`,
    );
    headers.set("cache-control", "private, max-age=300");

    return new NextResponse(result.stream as ReadableStream, {
      status: 200,
      headers,
    });
  } catch (e) {
    console.error("[blob-proxy] erro", { pathname, error: (e as Error).message });
    return new NextResponse(
      `Erro ao baixar arquivo: ${(e as Error).message}`,
      { status: 500 },
    );
  }
}
