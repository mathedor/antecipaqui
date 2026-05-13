/**
 * Webhook genérico de retorno de cobrança (modo API).
 *
 *  POST /api/cobranca/webhook/{fundoId}
 *  Headers: x-webhook-signature (HMAC-SHA256 do body com fundo.cobrancaWebhookSecret)
 *  Body (JSON):
 *    {
 *      "evento": "liquidacao",
 *      "nossoNumero": "0000000001",     // OU "cobrancaIntegracaoId": "..."
 *      "cobrancaIntegracaoId": "...",
 *      "valorPago": 1234.56,
 *      "dataPagamento": "2026-05-13"
 *    }
 *
 *  Implementação genérica: bancos têm payloads diferentes; o adapter
 *  específico (a implementar quando integrar com banco X) deve transformar
 *  o webhook do banco neste formato OU este endpoint deve ser substituído
 *  por um específico do banco.
 */
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { fundos, operacoes, parcelasComissao } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fundoId: string }> };

type WebhookPayload = {
  evento?: string;
  nossoNumero?: string;
  cobrancaIntegracaoId?: string;
  valorPago?: number;
  dataPagamento?: string;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { fundoId } = await params;

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  if (!fundo) {
    return NextResponse.json({ error: "Fundo não encontrado" }, { status: 404 });
  }

  const rawBody = await req.text();

  // Valida assinatura HMAC se segredo configurado
  if (fundo.cobrancaWebhookSecret) {
    const signature = req.headers.get("x-webhook-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Assinatura ausente" },
        { status: 401 },
      );
    }
    const expected = crypto
      .createHmac("sha256", fundo.cobrancaWebhookSecret)
      .update(rawBody)
      .digest("hex");
    if (signature !== expected && signature !== `sha256=${expected}`) {
      return NextResponse.json(
        { error: "Assinatura inválida" },
        { status: 401 },
      );
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json(
      { error: "JSON inválido" },
      { status: 400 },
    );
  }

  if (payload.evento && payload.evento !== "liquidacao") {
    // Outros eventos (cancelamento, vencimento, etc) — ignorar por ora
    return NextResponse.json({ ok: true, ignored: payload.evento });
  }

  const valorPago =
    typeof payload.valorPago === "number"
      ? payload.valorPago
      : NaN;
  if (!Number.isFinite(valorPago) || valorPago <= 0) {
    return NextResponse.json(
      { error: "valorPago inválido" },
      { status: 400 },
    );
  }

  // Localiza parcela por nosso_numero OU cobranca_integracao_id, garantindo
  // que pertence a uma op do fundo
  const conds = [] as ReturnType<typeof eq>[];
  if (payload.nossoNumero)
    conds.push(eq(parcelasComissao.nossoNumero, payload.nossoNumero));
  if (payload.cobrancaIntegracaoId)
    conds.push(
      eq(parcelasComissao.cobrancaIntegracaoId, payload.cobrancaIntegracaoId),
    );
  if (conds.length === 0) {
    return NextResponse.json(
      { error: "Forneça nossoNumero ou cobrancaIntegracaoId" },
      { status: 400 },
    );
  }

  const [match] = await db
    .select({ parcela: parcelasComissao })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(and(eq(operacoes.fundoId, fundoId), or(...conds)))
    .limit(1);

  if (!match) {
    return NextResponse.json(
      { error: "Parcela não encontrada pra esse fundo" },
      { status: 404 },
    );
  }

  if (match.parcela.status === "paga") {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  await db
    .update(parcelasComissao)
    .set({
      status: "paga",
      pagoEm:
        payload.dataPagamento ?? new Date().toISOString().slice(0, 10),
      pagoValor: valorPago.toFixed(2),
      cobrancaStatus: "paga",
    })
    .where(eq(parcelasComissao.id, match.parcela.id));

  return NextResponse.json({ ok: true });
}
