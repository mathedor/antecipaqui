import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contratos, operacoes, users, construtoras } from "@/db/schema";
import type { ContratoSigner } from "@/db/schema";
import { notify } from "@/lib/notify";

/**
 * Webhook ZapSign — configurar no painel apontando pra
 *   https://<DOMINIO>/api/zapsign/webhook
 *
 * Eventos esperados:
 *  - "doc_signed"     → 1 signer assinou
 *  - "auto_finished"  → todos assinaram → contrato fechado
 *  - "doc_refused"    → algum signer recusou
 *
 * Payload tem `token` (do doc) e `signers[]` com `signed_at` preenchido.
 */

type ZapsignWebhookPayload = {
  event_type: string;
  token: string;
  status: string;
  signers?: Array<{
    token: string;
    email: string;
    signed_at?: string | null;
    status?: string;
  }>;
};

export async function POST(req: NextRequest) {
  let payload: ZapsignWebhookPayload;
  try {
    payload = (await req.json()) as ZapsignWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!payload.token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  console.log("[zapsign/webhook]", {
    event: payload.event_type,
    token: payload.token,
    status: payload.status,
  });

  // Busca contrato pelo zapsignDocumentToken
  const [contrato] = await db
    .select()
    .from(contratos)
    .where(eq(contratos.zapsignDocumentToken, payload.token))
    .limit(1);

  if (!contrato) {
    console.warn("[zapsign/webhook] contrato não encontrado pra token:", payload.token);
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Atualiza signers locais com signed_at vindo do payload
  const updatedSigners: ContratoSigner[] = (contrato.signers ?? []).map(
    (local) => {
      const remote = payload.signers?.find(
        (s) => s.token === local.zapsignToken,
      );
      if (!remote) return local;
      return {
        ...local,
        signedAt: remote.signed_at ?? local.signedAt,
      };
    },
  );

  // Calcula timestamps por role
  const cedenteSigner = updatedSigners.find((s) => s.role === "cedente");
  const construtoraSigner = updatedSigners.find(
    (s) => s.role === "construtora",
  );

  const allSigned = updatedSigners.every((s) => !!s.signedAt);
  const anyRefused = payload.event_type === "doc_refused";

  let newStatus = contrato.status;
  let completedAt = contrato.completedAt;
  if (anyRefused) {
    newStatus = "cancelado";
  } else if (allSigned) {
    newStatus = "totalmente_assinado";
    completedAt = new Date();
  } else if (updatedSigners.some((s) => !!s.signedAt)) {
    newStatus = "parcialmente_assinado";
  }

  await db
    .update(contratos)
    .set({
      signers: updatedSigners,
      corretorSignedAt: cedenteSigner?.signedAt
        ? new Date(cedenteSigner.signedAt)
        : contrato.corretorSignedAt,
      construtoraSignedAt: construtoraSigner?.signedAt
        ? new Date(construtoraSigner.signedAt)
        : contrato.construtoraSignedAt,
      status: newStatus,
      completedAt,
      updatedAt: new Date(),
    })
    .where(eq(contratos.id, contrato.id));

  // Carrega operação + envolvidos pra notificar
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, contrato.operacaoId))
    .limit(1);
  if (!op) return NextResponse.json({ ok: true });

  const [cedente] = await db
    .select()
    .from(users)
    .where(eq(users.id, op.corretorUserId))
    .limit(1);

  const [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);

  const construtoraOwner =
    construtora?.ownerUserId
      ? (
          await db
            .select()
            .from(users)
            .where(eq(users.id, construtora.ownerUserId))
            .limit(1)
        )[0]
      : null;

  const link = `/painel/operacoes/${op.id}`;

  if (allSigned) {
    if (cedente) {
      await notify({
        userId: cedente.id,
        type: "contrato_totalmente_assinado",
        title: `Contrato da operação ${op.numero} totalmente assinado`,
        body: "Todos assinaram. A Antecipaqui vai liberar o pagamento.",
        link,
        operacaoId: op.id,
        email: {
          to: cedente.email,
          subject: `Antecipaqui · Contrato ${op.numero} assinado`,
          body: `O contrato da operação ${op.numero} foi totalmente assinado. Pagamento será liberado em breve.`,
        },
      });
    }
    if (construtoraOwner) {
      await notify({
        userId: construtoraOwner.id,
        type: "contrato_totalmente_assinado",
        title: `Contrato da operação ${op.numero} totalmente assinado`,
        body: "Todas as partes assinaram.",
        link,
        operacaoId: op.id,
        email: {
          to: construtoraOwner.email,
          subject: `Antecipaqui · Contrato ${op.numero} assinado`,
          body: `O contrato da operação ${op.numero} foi totalmente assinado.`,
        },
      });
    }
  } else if (payload.event_type === "doc_signed") {
    // notifica admin (ou o cedente — depende do caso). por simplicidade,
    // só logamos. se quiser notificar admin, cria notify pra admin email.
    console.log("[zapsign/webhook] signer assinou parcialmente:", op.numero);
  } else if (anyRefused) {
    if (cedente) {
      await notify({
        userId: cedente.id,
        type: "contrato_recusado",
        title: `Contrato da operação ${op.numero} recusado`,
        body: "Um dos signatários recusou. Entre em contato com a Antecipaqui.",
        link,
        operacaoId: op.id,
        email: {
          to: cedente.email,
          subject: `Antecipaqui · Contrato ${op.numero} recusado`,
          body: `O contrato da operação ${op.numero} foi recusado por um dos signatários.`,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

// GET pra teste manual (browser)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "ZapSign webhook endpoint — POST only",
  });
}
