/**
 * PEÇA 03 · Webhook de resposta do cadastro do cliente.
 *
 *   POST /api/opera/webhook/cadastro/{fundoId}
 *   Header de assinatura: definido em fundos.integracaoContrato.assinatura
 *                         (padrão: x-opera-signature, HMAC-SHA256 hex do corpo)
 *
 *   Corpo esperado (nomes configuráveis no contrato do fundo):
 *     {
 *       "eventoId": "evt_123",
 *       "protocolo": "PROTO-9988",       // ou clienteId, ou cnpj
 *       "situacao": "aprovado",          // ou "reprovado"
 *       "motivo": "Documento X ilegível" // obrigatório quando reprovado
 *     }
 *
 *   Respostas: 200 processado · 401 assinatura inválida · 422 não localizado
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
    tipo: "cadastro",
    corpoCru,
    headers,
  });
  return NextResponse.json(r.corpo, { status: r.http });
}
