"use server";

/**
 * Saúde da entrega de e-mail.
 *
 * Existe por um motivo concreto: o domínio `antecipaqui.digital` ficou com o
 * DKIM faltando no DNS, o Resend recusou todo envio com 403 e a plataforma
 * passou um tempo sem mandar e-mail nenhum sem ninguém perceber. Aqui o
 * estado do domínio fica visível, junto com as falhas registradas.
 */

import { desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { emailFalhas } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";

const RESEND_API = "https://api.resend.com";

export type RegistroDns = {
  tipo: string;
  nome: string;
  status: string;
  valor: string;
};

export type EmailHealth = {
  apiKeyConfigurada: boolean;
  remetente: string;
  /** Domínio extraído do remetente. */
  dominio: string | null;
  /** verified | pending | failed | not_started | desconhecido */
  statusDominio: string;
  /** Mensagem quando não deu pra consultar o Resend. */
  erroConsulta: string | null;
  registros: RegistroDns[];
  falhasAbertas: number;
  ultimasFalhas: Array<{
    id: string;
    destinatario: string;
    assunto: string;
    erro: string;
    contexto: string | null;
    createdAt: string;
  }>;
};

function remetente() {
  return process.env.RESEND_FROM || "Antecipaqui <noreply@antecipaqui.digital>";
}

function dominioDoRemetente(from: string): string | null {
  const m = from.match(/@([^\s>]+)/);
  return m ? m[1].toLowerCase() : null;
}

type ResendDomain = {
  id: string;
  name: string;
  status: string;
  records?: Array<{
    record?: string;
    type?: string;
    name?: string;
    status?: string;
    value?: string;
  }>;
};

async function resend<T>(rota: string, metodo = "GET"): Promise<T> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY não configurada");
  const res = await fetch(`${RESEND_API}${rota}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Resend ${metodo} ${rota} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function acharDominio(nome: string): Promise<ResendDomain | null> {
  const lista = await resend<{ data?: ResendDomain[] }>("/domains");
  return (lista.data ?? []).find((d) => d.name === nome) ?? null;
}

export async function getEmailHealth(): Promise<EmailHealth> {
  await requireAdmin();

  const from = remetente();
  const dominio = dominioDoRemetente(from);
  const apiKeyConfigurada = !!process.env.RESEND_API_KEY;

  const [{ abertas }] = await db
    .select({ abertas: sql<number>`count(*)::int` })
    .from(emailFalhas)
    .where(isNull(emailFalhas.resolvidoEm));

  const ultimas = await db
    .select()
    .from(emailFalhas)
    .where(isNull(emailFalhas.resolvidoEm))
    .orderBy(desc(emailFalhas.createdAt))
    .limit(30);

  let statusDominio = "desconhecido";
  let registros: RegistroDns[] = [];
  let erroConsulta: string | null = null;

  if (!apiKeyConfigurada) {
    erroConsulta = "RESEND_API_KEY não configurada — nenhum e-mail sai daqui.";
  } else if (!dominio) {
    erroConsulta = `Não consegui extrair o domínio de RESEND_FROM ("${from}").`;
  } else {
    try {
      const d = await acharDominio(dominio);
      if (!d) {
        statusDominio = "not_started";
        erroConsulta = `O domínio ${dominio} não está cadastrado no Resend.`;
      } else {
        const det = await resend<ResendDomain>(`/domains/${d.id}`);
        statusDominio = det.status ?? d.status ?? "desconhecido";
        registros = (det.records ?? []).map((r) => ({
          tipo: r.type ?? "—",
          nome: r.name ?? "—",
          status: r.status ?? "—",
          valor: r.value ?? "",
        }));
      }
    } catch (e) {
      erroConsulta = e instanceof Error ? e.message : String(e);
    }
  }

  return {
    apiKeyConfigurada,
    remetente: from,
    dominio,
    statusDominio,
    erroConsulta,
    registros,
    falhasAbertas: abertas,
    ultimasFalhas: ultimas.map((f) => ({
      id: f.id,
      destinatario: f.destinatario,
      assunto: f.assunto,
      erro: f.erro,
      contexto: f.contexto,
      createdAt: f.createdAt.toISOString(),
    })),
  };
}

/** Pede ao Resend pra revalidar o DNS do domínio. A verificação é
 *  assíncrona: passa por `pending` e leva ~1 min pra virar `verified`. */
export async function revalidarDominioEmail(): Promise<{
  ok: boolean;
  status?: string;
  error?: string;
}> {
  await requireAdmin();
  const dominio = dominioDoRemetente(remetente());
  if (!dominio) return { ok: false, error: "Domínio do remetente inválido" };
  try {
    const d = await acharDominio(dominio);
    if (!d) return { ok: false, error: `${dominio} não está no Resend` };
    await resend(`/domains/${d.id}/verify`, "POST");
    const det = await resend<ResendDomain>(`/domains/${d.id}`);
    revalidatePath("/admin/entregabilidade");
    return { ok: true, status: det.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function marcarFalhaResolvida(id: string) {
  await requireAdmin();
  await db
    .update(emailFalhas)
    .set({ resolvidoEm: new Date() })
    .where(eq(emailFalhas.id, id));
  revalidatePath("/admin/entregabilidade");
  return { ok: true };
}

export async function limparFalhasResolvidas() {
  await requireAdmin();
  const r = await db
    .update(emailFalhas)
    .set({ resolvidoEm: new Date() })
    .where(isNull(emailFalhas.resolvidoEm))
    .returning({ id: emailFalhas.id });
  revalidatePath("/admin/entregabilidade");
  return { ok: true, total: r.length };
}
