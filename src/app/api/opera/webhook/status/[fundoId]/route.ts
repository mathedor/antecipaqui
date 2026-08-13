/**
 * PEÇA 05 · Webhook de status da operação — o coração da integração.
 *
 *   POST /api/opera/webhook/status/{fundoId}
 *   Header de assinatura: definido em fundos.integracaoContrato.assinatura
 *
 *   Corpo esperado (nomes configuráveis no contrato do fundo):
 *     {
 *       "eventoId": "evt_456",
 *       "operacaoId": "OPERA-1234",              // ou referenciaExterna (id nosso)
 *       "status": "enviado para assinatura",
 *       "observacao": "aguardando o cedente",
 *       "linkAssinatura": "https://...",         // quando houver
 *       "dataEvento": "2026-08-13T14:02:00Z"
 *     }
 *
 *   Cada evento aceito vira: esteira atualizada, registro na linha do tempo
 *   da operação e notificação para todos os envolvidos. Status fora do
 *   catálogo é registrado e sinalizado ao admin, sem mexer no que o cliente vê.
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
    tipo: "status",
    corpoCru,
    headers,
  });
  return NextResponse.json(r.corpo, { status: r.http });
}
