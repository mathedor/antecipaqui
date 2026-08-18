import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-user";

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
  // Gate real de admin (a checagem antiga por sessionClaims era no-op — nosso
  // papel de admin vive no banco, não no metadata do Clerk).
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, step: "auth", error: "admin only" }, { status: 403 });
  }

  const tokenSet = !!process.env.BLOB_READ_WRITE_TOKEN;
  const tokenLen = process.env.BLOB_READ_WRITE_TOKEN?.length ?? 0;

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
      access: "private",
      contentType: "text/plain",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return NextResponse.json({
      ok: true,
      step: "put",
      tokenLen,
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
