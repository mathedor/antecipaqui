import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { DOC_UNLOCK_COOKIE, cookieValido } from "@/lib/seguranca/doc-unlock";

/**
 * Proxy autenticado pra Vercel Blob (store private).
 *
 * Além de estar logado, exige DESBLOQUEIO por senha (step-up): a pessoa
 * confirma a senha de login e ganha um cookie de 8h atrelado a ela. Sem esse
 * cookie válido, respondemos 401 com código `doc_locked` — o cliente abre o
 * modal de senha. Isso impede que uma sessão roubada baixe documentos.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ pathname: string[] }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const unlock = (await cookies()).get(DOC_UNLOCK_COOKIE)?.value;
  if (!cookieValido(unlock, userId)) {
    return NextResponse.json(
      { error: "Documentos bloqueados — confirme sua senha", code: "doc_locked" },
      { status: 401 },
    );
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
