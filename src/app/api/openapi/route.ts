/** OpenAPI 3.1 spec da API externa do fundo.
 *  Endpoint público — qualquer um pode ler o schema (não vaza dados). */

import { buildOpenApiSpec } from "@/lib/openapi-spec";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  return Response.json(buildOpenApiSpec(), {
    headers: {
      "cache-control": "public, max-age=300, s-maxage=300",
      "access-control-allow-origin": "*",
    },
  });
}
