import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-user";

export const dynamic = "force-dynamic";

/**
 * Health check da Google Places API. Bate na endpoint Nearby Search
 * com uma busca de teste e retorna status + sample.
 *
 * Uso: logado como admin, acessar /api/admin/test-google-places
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Apenas admin" },
      { status: 401 },
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      step: "env",
      error:
        "GOOGLE_PLACES_API_KEY não está configurada no ambiente atual. Confira Vercel → Settings → Environment Variables e refaz o redeploy.",
    });
  }

  const keyHint = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars)`;

  // Busca teste: imobiliárias num raio de 2km de Av Paulista, SP
  const lat = -23.5613;
  const lng = -46.6557;
  const radius = 2000;
  const type = "real_estate_agency";

  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: String(radius),
    type,
    key: apiKey,
  });

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;

  let httpStatus = 0;
  let payload: {
    status?: string;
    error_message?: string;
    results?: Array<{
      name: string;
      vicinity?: string;
      rating?: number;
    }>;
  } = {};
  try {
    const res = await fetch(url);
    httpStatus = res.status;
    payload = await res.json();
  } catch (e) {
    return NextResponse.json({
      ok: false,
      step: "fetch",
      keyHint,
      error: (e as Error).message,
    });
  }

  if (payload.status === "OK" || payload.status === "ZERO_RESULTS") {
    const sample = (payload.results ?? []).slice(0, 3).map((r) => ({
      nome: r.name,
      endereco: r.vicinity,
      rating: r.rating,
    }));
    return NextResponse.json({
      ok: true,
      step: "complete",
      keyHint,
      googleStatus: payload.status,
      qtdResultados: payload.results?.length ?? 0,
      sample,
      testQuery: {
        location: "Av Paulista, São Paulo",
        radius: `${radius}m`,
        type,
      },
    });
  }

  return NextResponse.json({
    ok: false,
    step: "google_api",
    keyHint,
    httpStatus,
    googleStatus: payload.status,
    googleError: payload.error_message,
    hint:
      payload.status === "REQUEST_DENIED"
        ? "API key inválida OU Places API não habilitada OU restrita pra outra API. Confira no Google Cloud Console."
        : payload.status === "OVER_QUERY_LIMIT"
          ? "Limite de quota estourado OU billing não ativo no projeto Google."
          : payload.status === "INVALID_REQUEST"
            ? "Parâmetros inválidos (erro improvável nesse teste)."
            : "Erro desconhecido — veja googleError.",
  });
}
