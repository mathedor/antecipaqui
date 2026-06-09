/**
 * Webhook de retorno de assinatura — para fundos que ENVIAM o contrato pra
 * assinatura no próprio sistema (fundos.contratoAssinaturaEnviadaPor = 'fundo').
 *
 *  POST /api/contrato-assinatura/webhook/{fundoId}
 *  Headers: x-webhook-signature (HMAC-SHA256 do corpo com
 *           fundo.contratoAssinaturaWebhookSecret). Aceita "<hmac>" ou
 *           "sha256=<hmac>".
 *  Body (JSON):
 *    {
 *      "operacaoId": "<uuid>",        // OU "contratoId": "<uuid>"
 *      "linkAssinado": "https://...", // link do documento assinado
 *      "evento": "assinado"           // ou "recusado"
 *    }
 *
 *  Ao receber "assinado": marca o contrato como totalmente assinado, guarda o
 *  link, avança a operação pra 'enviada_para_pagamento' e notifica cedente
 *  (corretor), construtora, imobiliária e comercial.
 */
import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  fundos,
  contratos,
  operacoes,
  users,
  construtoras,
  imobiliarias,
  comerciais,
} from "@/db/schema";
import { notify } from "@/lib/notify";
import { sendContratoToZapsign } from "@/lib/actions/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ fundoId: string }> };

type WebhookPayload = {
  operacaoId?: string;
  contratoId?: string;
  /** Link do contrato ASSINADO (quando o fundo também coleta a assinatura). */
  linkAssinado?: string;
  /** Link do contrato GERADO mas ainda sem assinatura (quem assina é a AQ). */
  linkContrato?: string;
  /** "contrato_gerado" | "contrato_assinado" | "recusado". Sinônimos aceitos:
   *  "gerado", "assinado". Default: assinado (compat). */
  evento?: string;
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

  // Valida HMAC. Sem segredo configurado, recusamos — esse fluxo exige segredo.
  if (!fundo.contratoAssinaturaWebhookSecret) {
    return NextResponse.json(
      { error: "Webhook de assinatura não configurado para este fundo" },
      { status: 403 },
    );
  }
  const signature = req.headers.get("x-webhook-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente" }, { status: 401 });
  }
  const expected = crypto
    .createHmac("sha256", fundo.contratoAssinaturaWebhookSecret)
    .update(rawBody)
    .digest("hex");
  if (signature !== expected && signature !== `sha256=${expected}`) {
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Localiza o contrato — por contratoId direto ou pelo contrato mais recente
  // da operação informada.
  let contrato:
    | typeof contratos.$inferSelect
    | undefined;
  if (payload.contratoId) {
    [contrato] = await db
      .select()
      .from(contratos)
      .where(eq(contratos.id, payload.contratoId))
      .limit(1);
  } else if (payload.operacaoId) {
    [contrato] = await db
      .select()
      .from(contratos)
      .where(eq(contratos.operacaoId, payload.operacaoId))
      .orderBy(desc(contratos.createdAt))
      .limit(1);
  }
  if (!contrato) {
    return NextResponse.json(
      { error: "Contrato não encontrado para a operação informada" },
      { status: 404 },
    );
  }

  // Garante que o contrato pertence a uma operação DESSE fundo.
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, contrato.operacaoId))
    .limit(1);
  if (!op || op.fundoId !== fundoId) {
    return NextResponse.json(
      { error: "Contrato não pertence a este fundo" },
      { status: 403 },
    );
  }

  // Normaliza o tipo de retorno do fundo.
  const ev = (payload.evento ?? "").toLowerCase();
  const tipo: "recusado" | "gerado" | "assinado" = ev.includes("recus")
    ? "recusado"
    : ev.includes("gerad")
      ? "gerado"
      : "assinado";
  const link = `/painel/operacoes/${op.id}`;

  if (tipo === "recusado") {
    await db
      .update(contratos)
      .set({ status: "cancelado", updatedAt: new Date() })
      .where(eq(contratos.id, contrato.id));
  } else if (tipo === "gerado") {
    // Fundo GEROU o contrato (ainda sem assinatura) — a Antecipaqui coleta a
    // assinatura. Guarda o PDF e manda pro ZapSign reusando o fluxo padrão.
    const pdf = payload.linkContrato ?? payload.linkAssinado;
    if (!pdf) {
      return NextResponse.json(
        { error: "linkContrato ausente para evento 'contrato_gerado'" },
        { status: 400 },
      );
    }
    try {
      await sendContratoToZapsign(op.id, pdf);
    } catch (e) {
      console.error("[contrato-assinatura/webhook] zapsign falhou", e);
      // Guarda ao menos o PDF gerado pelo fundo pra reprocessar depois.
      await db
        .update(contratos)
        .set({ pdfUrl: pdf, updatedAt: new Date() })
        .where(eq(contratos.id, contrato.id));
    }
  } else {
    // Fundo já devolveu o contrato ASSINADO.
    await db
      .update(contratos)
      .set({
        status: "totalmente_assinado",
        completedAt: new Date(),
        assinaturaExternaUrl: payload.linkAssinado ?? contrato.assinaturaExternaUrl,
        updatedAt: new Date(),
      })
      .where(eq(contratos.id, contrato.id));

    // Avança a operação pra pagamento (só se ainda estava em assinatura).
    if (op.status === "enviada_para_assinatura") {
      await db
        .update(operacoes)
        .set({ status: "enviada_para_pagamento", updatedAt: new Date() })
        .where(eq(operacoes.id, op.id));
    }
  }

  // Resolve os destinatários: corretor, construtora, imobiliária, comercial.
  const destinatarios: { userId: string; email: string | null }[] = [];

  if (op.corretorUserId) {
    const [cedente] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, op.corretorUserId))
      .limit(1);
    if (cedente) destinatarios.push({ userId: cedente.id, email: cedente.email });
  }

  if (op.construtoraId) {
    const [c] = await db
      .select({ ownerUserId: construtoras.ownerUserId })
      .from(construtoras)
      .where(eq(construtoras.id, op.construtoraId))
      .limit(1);
    if (c?.ownerUserId) {
      const [u] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, c.ownerUserId))
        .limit(1);
      if (u) destinatarios.push({ userId: u.id, email: u.email });
    }
  }

  if (op.imobiliariaId) {
    const [i] = await db
      .select({ ownerUserId: imobiliarias.ownerUserId })
      .from(imobiliarias)
      .where(eq(imobiliarias.id, op.imobiliariaId))
      .limit(1);
    if (i?.ownerUserId) {
      const [u] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, i.ownerUserId))
        .limit(1);
      if (u) destinatarios.push({ userId: u.id, email: u.email });
    }
  }

  if (op.comercialId) {
    const [com] = await db
      .select({ ownerUserId: comerciais.ownerUserId })
      .from(comerciais)
      .where(eq(comerciais.id, op.comercialId))
      .limit(1);
    if (com?.ownerUserId) {
      const [u] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, com.ownerUserId))
        .limit(1);
      if (u) destinatarios.push({ userId: u.id, email: u.email });
    }
  }

  const title =
    tipo === "recusado"
      ? `Contrato da operação ${op.numero} recusado`
      : tipo === "gerado"
        ? `Contrato da operação ${op.numero} pronto para assinatura`
        : `Contrato da operação ${op.numero} assinado`;
  const body =
    tipo === "recusado"
      ? "O fundo informou que a assinatura foi recusada. Verifique a operação."
      : tipo === "gerado"
        ? "O fundo gerou o contrato e ele foi encaminhado para assinatura."
        : "O fundo concluiu a assinatura. A operação seguiu para pagamento.";
  const notifyType =
    tipo === "recusado"
      ? "contrato_recusado"
      : tipo === "gerado"
        ? "operacao_enviada_assinatura"
        : "contrato_totalmente_assinado";

  // Dedup por userId pra não notificar 2x quando papéis se sobrepõem.
  const vistos = new Set<string>();
  for (const d of destinatarios) {
    if (vistos.has(d.userId)) continue;
    vistos.add(d.userId);
    try {
      await notify({
        userId: d.userId,
        type: notifyType,
        title,
        body,
        link,
        operacaoId: op.id,
        email: d.email
          ? {
              to: d.email,
              subject: `Antecipaqui · ${title}`,
              body: `${body}${
                payload.linkAssinado ? `\n\nDocumento: ${payload.linkAssinado}` : ""
              }`,
            }
          : undefined,
      });
    } catch (e) {
      console.error("[contrato-assinatura/webhook] notify falhou", e);
    }
  }

  return NextResponse.json({
    ok: true,
    operacaoId: op.id,
    contratoId: contrato.id,
    status:
      tipo === "recusado"
        ? "cancelado"
        : tipo === "gerado"
          ? "enviado_assinatura"
          : "totalmente_assinado",
  });
}

// GET pra teste manual (browser)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook de retorno de assinatura — POST only",
  });
}
