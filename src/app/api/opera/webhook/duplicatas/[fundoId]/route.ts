/**
 * PEÇA 06 · Webhook de duplicatas da operação paga.
 *
 *   POST /api/opera/webhook/duplicatas/{fundoId}
 *   Header de assinatura: definido em fundos.integracaoContrato.assinatura
 *
 *   Corpo esperado (nomes configuráveis no contrato do fundo):
 *     {
 *       "eventoId": "evt_789",
 *       "operacaoId": "OPERA-1234",
 *       "duplicatas": [
 *         {
 *           "numero": "0001",
 *           "valor": 12500.00,
 *           "vencimento": "2026-09-10",
 *           "sacado": "Construtora X",
 *           "linhaDigitavel": "...",
 *           "link": "https://..."
 *         }
 *       ]
 *     }
 *
 *   Cada título é casado com a parcela de mesmo vencimento e publicado nos
 *   painéis da construtora e da imobiliária. O que não casar sozinho fica
 *   registrado e o admin resolve na aba OPERA da operação.
 */
import { NextResponse, type NextRequest } from "next/server";
import { receberWebhook } from "@/lib/opera/receber";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fundoId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { fundoId } = await params;
  const corpoCru = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k.toLowerCase()] = v;
  });

  const r = await receberWebhook({
    fundoId,
    tipo: "duplicatas",
    corpoCru,
    headers,
  });
  return NextResponse.json(r.corpo, { status: r.http });
}
