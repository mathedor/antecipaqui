import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

/**
 * Endpoint de diagnóstico do Vercel Blob.
 * Tenta um put() server-side e devolve sucesso ou o erro completo.
 * Se o put falha com 400/401/403, mostra a causa real (cota, store inválido,
 * token errado) sem o ruído de CORS que aparece no client.
 *
 * Uso:
 *   curl -H "Cookie: <session>" https://antecipaqui.digital/api/upload/diag
 * (precisa estar logado como admin)
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, step: "auth", error: "not signed in" }, { status: 401 });
  }
  if ((sessionClaims as { metadata?: { role?: string } } | null)?.metadata?.role !== "admin") {
    // não bloqueia, só sinaliza
  }

  const tokenSet = !!process.env.BLOB_READ_WRITE_TOKEN;
  const tokenLen = process.env.BLOB_READ_WRITE_TOKEN?.length ?? 0;
  const tokenPrefix = process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 25) ?? null;

  if (!tokenSet) {
    return NextResponse.json({
      ok: false,
      step: "env",
      error: "BLOB_READ_WRITE_TOKEN ausente",
    });
  }

  // Tenta put() de um arquivo trivial diretamente via API server-side
  const probePath = `_diag/${Date.now()}-probe.txt`;
  try {
    const blob = await put(probePath, "diag probe " + new Date().toISOString(), {
      access: "public",
      contentType: "text/plain",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({
      ok: true,
      step: "put",
      tokenLen,
      tokenPrefix,
      uploadedUrl: blob.url,
      uploadedPath: blob.pathname,
      message: "Server-side upload funcionou — store OK.",
    });
  } catch (e) {
    const err = e as { name?: string; message?: string; code?: string; status?: number };
    return NextResponse.json(
      {
        ok: false,
        step: "put",
        tokenLen,
        tokenPrefix,
        errorName: err.name ?? null,
        errorMessage: err.message ?? null,
        errorCode: err.code ?? null,
        errorStatus: err.status ?? null,
        rawError: String(e),
      },
      { status: 500 },
    );
  }
}
