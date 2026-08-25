import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy autenticado pra Vercel Blob (store private).
 *
 * Exige sessão logada (Clerk). Os pathnames são não-adivinháveis
 * (addRandomSuffix no upload), o que impede enumeração de arquivos.
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
