"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, lt, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  fundos,
  webhooksSubscriptions,
  webhooksEventos,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import {
  EVENTOS_DISPONIVEIS,
  type WebhookEventoTipo,
} from "@/lib/webhooks-eventos";

function randomSecret(): string {
  return crypto.randomBytes(24).toString("base64url");
}

/** Listar webhooks que o user pode gerenciar:
 *  - admin: todos
 *  - fundo: só dele */
export async function listMeusWebhooks() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  if (user.role === "admin") {
    return db
      .select()
      .from(webhooksSubscriptions)
      .orderBy(desc(webhooksSubscriptions.createdAt));
  }

  if (user.role === "fundo") {
    const [f] = await db
      .select({ id: fundos.id })
      .from(fundos)
      .where(eq(fundos.ownerUserId, user.id))
      .limit(1);
    if (!f) return [];
    return db
      .select()
      .from(webhooksSubscriptions)
      .where(eq(webhooksSubscriptions.fundoId, f.id))
      .orderBy(desc(webhooksSubscriptions.createdAt));
  }

  return [];
}

export type CreateWebhookState =
  | { ok: false; error: string }
  | { ok: true; id: string; secret: string }
  | null;

export async function createWebhookAction(
  _prev: CreateWebhookState,
  formData: FormData,
): Promise<CreateWebhookState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "admin" && user.role !== "fundo")
    return { ok: false, error: "Apenas admin ou fundo" };

  const nome = String(formData.get("nome") || "").trim();
  const targetUrl = String(formData.get("targetUrl") || "").trim();
  const eventosRaw = formData.getAll("eventos").map(String);

  if (!nome) return { ok: false, error: "Informe um nome" };
  if (!targetUrl || !targetUrl.startsWith("http"))
    return { ok: false, error: "URL inválida" };
  if (eventosRaw.length === 0)
    return { ok: false, error: "Selecione ao menos um evento" };

  const eventos = eventosRaw.filter((e) =>
    (EVENTOS_DISPONIVEIS as readonly string[]).includes(e),
  );
  if (eventos.length === 0)
    return { ok: false, error: "Eventos inválidos" };

  let fundoId: string | null = null;
  if (user.role === "fundo") {
    const [f] = await db
      .select({ id: fundos.id })
      .from(fundos)
      .where(eq(fundos.ownerUserId, user.id))
      .limit(1);
    if (!f) return { ok: false, error: "Fundo não vinculado" };
    fundoId = f.id;
  }

  const secret = randomSecret();
  const [created] = await db
    .insert(webhooksSubscriptions)
    .values({
      nome,
      targetUrl,
      secret,
      eventos: eventos as never,
      ownerUserId: user.id,
      ownerRole: user.role,
      fundoId,
      isActive: true,
    })
    .returning();

  revalidatePath("/admin/webhooks");
  revalidatePath("/painel/webhooks");
  return { ok: true, id: created.id, secret };
}

export async function toggleWebhookAction(id: string, ativo: boolean) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  const [sub] = await db
    .select()
    .from(webhooksSubscriptions)
    .where(eq(webhooksSubscriptions.id, id))
    .limit(1);
  if (!sub) throw new Error("Webhook não encontrado");
  if (user.role !== "admin" && sub.ownerUserId !== user.id)
    throw new Error("Sem permissão");
  await db
    .update(webhooksSubscriptions)
    .set({ isActive: ativo })
    .where(eq(webhooksSubscriptions.id, id));
  revalidatePath("/admin/webhooks");
  revalidatePath("/painel/webhooks");
}

export async function deleteWebhookAction(id: string) {
  const user = await getCurrentDbUser();
  if (!user) throw new Error("Não autenticado");
  const [sub] = await db
    .select()
    .from(webhooksSubscriptions)
    .where(eq(webhooksSubscriptions.id, id))
    .limit(1);
  if (!sub) throw new Error("Webhook não encontrado");
  if (user.role !== "admin" && sub.ownerUserId !== user.id)
    throw new Error("Sem permissão");
  await db
    .delete(webhooksSubscriptions)
    .where(eq(webhooksSubscriptions.id, id));
  revalidatePath("/admin/webhooks");
  revalidatePath("/painel/webhooks");
}

/** Enfileira um evento pra todos os webhooks subscritos. Idempotente —
 *  pode chamar várias vezes; cada subscription recebe sua row. */
export async function enqueueWebhookEvento(input: {
  evento: WebhookEventoTipo;
  fundoId?: string | null;
  payload: Record<string, unknown>;
}) {
  // Acha todas as subscriptions interessadas
  const subs = await db
    .select()
    .from(webhooksSubscriptions)
    .where(eq(webhooksSubscriptions.isActive, true));

  const relevantes = subs.filter((s) => {
    const eventos = (s.eventos as string[]) ?? [];
    if (!eventos.includes(input.evento)) return false;
    // Se webhook tem fundoId, filtra
    if (s.fundoId && input.fundoId !== s.fundoId) return false;
    return true;
  });

  if (relevantes.length === 0) return;

  await db.insert(webhooksEventos).values(
    relevantes.map((s) => ({
      subscriptionId: s.id,
      evento: input.evento,
      payload: input.payload as never,
      status: "pendente" as const,
      proximaTentativaEm: new Date(),
    })),
  );
}

/** Processa fila — chamado pelo cron. Tenta entregar cada evento pendente.
 *  Retry exponencial: 1, 5, 25, 125 min. Após 4 falhas, marca "desistido". */
export async function processarFilaWebhooks(opts?: { limit?: number }) {
  const limit = opts?.limit ?? 50;
  const now = new Date();

  // Pega eventos pendentes ou com retry agendado
  const pendentes = await db
    .select({
      evento: webhooksEventos,
      sub: webhooksSubscriptions,
    })
    .from(webhooksEventos)
    .innerJoin(
      webhooksSubscriptions,
      eq(webhooksSubscriptions.id, webhooksEventos.subscriptionId),
    )
    .where(
      and(
        or(
          eq(webhooksEventos.status, "pendente"),
          eq(webhooksEventos.status, "falhou"),
        ),
        eq(webhooksSubscriptions.isActive, true),
        or(
          isNull(webhooksEventos.proximaTentativaEm),
          lt(webhooksEventos.proximaTentativaEm, now),
        ),
      ),
    )
    .limit(limit);

  let entregues = 0;
  let falhas = 0;

  for (const { evento: ev, sub } of pendentes) {
    const body = JSON.stringify({
      evento: ev.evento,
      payload: ev.payload,
      enqueuedAt: ev.createdAt,
      deliveryId: ev.id,
    });
    const signature = crypto
      .createHmac("sha256", sub.secret)
      .update(body)
      .digest("hex");

    try {
      const res = await fetch(sub.targetUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-antecipaqui-signature": `sha256=${signature}`,
          "x-antecipaqui-event": ev.evento,
        },
        body,
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        entregues++;
        await db
          .update(webhooksEventos)
          .set({
            status: "entregue",
            deliveredAt: new Date(),
            tentativas: ev.tentativas + 1,
            ultimoErro: null,
          })
          .where(eq(webhooksEventos.id, ev.id));
        await db
          .update(webhooksSubscriptions)
          .set({
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: `${res.status}`,
          })
          .where(eq(webhooksSubscriptions.id, sub.id));
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      falhas++;
      const tentativas = ev.tentativas + 1;
      const desistido = tentativas >= 4;
      const proximaTentativaMin = Math.min(
        125,
        Math.pow(5, tentativas - 1),
      );
      await db
        .update(webhooksEventos)
        .set({
          status: desistido ? "desistido" : "falhou",
          tentativas,
          ultimoErro: (e as Error).message.slice(0, 500),
          proximaTentativaEm: desistido
            ? null
            : new Date(Date.now() + proximaTentativaMin * 60 * 1000),
        })
        .where(eq(webhooksEventos.id, ev.id));
      await db
        .update(webhooksSubscriptions)
        .set({
          lastDeliveryAt: new Date(),
          lastDeliveryStatus: `erro: ${(e as Error).message.slice(0, 60)}`,
        })
        .where(eq(webhooksSubscriptions.id, sub.id));
    }
  }

  return { entregues, falhas, total: pendentes.length };
}

export async function listEventosWebhook(subscriptionId: string, limit = 20) {
  const user = await getCurrentDbUser();
  if (!user) return [];
  const [sub] = await db
    .select()
    .from(webhooksSubscriptions)
    .where(eq(webhooksSubscriptions.id, subscriptionId))
    .limit(1);
  if (!sub) return [];
  if (user.role !== "admin" && sub.ownerUserId !== user.id) return [];
  return db
    .select()
    .from(webhooksEventos)
    .where(eq(webhooksEventos.subscriptionId, subscriptionId))
    .orderBy(desc(webhooksEventos.createdAt))
    .limit(limit);
}
