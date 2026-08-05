import "server-only";

/**
 * Checagem de saúde da entrega de e-mail — sem auth, pra ser usada tanto
 * pela tela do admin quanto pelo cron diário.
 *
 * Existe porque o domínio ficou sem DKIM no DNS, o provedor recusou 100%
 * dos envios e ninguém percebeu por meses.
 */

import { isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { emailFalhas, systemSettings } from "@/db/schema";

const RESEND_API = "https://api.resend.com";

/** Chave em system_settings onde fica o resultado da última checagem. */
export const CHAVE_ULTIMO_CHECK = "email_saude_ultimo_check";

export type RegistroDns = {
  tipo: string;
  nome: string;
  status: string;
  valor: string;
};

/** critico = nada está sendo entregue · atencao = entrega ok mas houve falha */
export type NivelSaude = "ok" | "atencao" | "critico";

export type SaudeEmail = {
  apiKeyConfigurada: boolean;
  remetente: string;
  dominio: string | null;
  /** verified | pending | failed | not_started | desconhecido */
  statusDominio: string;
  erroConsulta: string | null;
  registros: RegistroDns[];
  falhasAbertas: number;
  falhas24h: number;
  nivel: NivelSaude;
  /** Frase pronta explicando o estado — usada no alerta e na tela. */
  resumo: string;
};

export type UltimoCheck = {
  em: string;
  nivel: NivelSaude;
  statusDominio: string;
  falhas24h: number;
};

export function remetentePadrao() {
  return process.env.RESEND_FROM || "Antecipaqui <noreply@antecipaqui.digital>";
}

export function dominioDoRemetente(from: string): string | null {
  const m = from.match(/@([^\s>]+)/);
  return m ? m[1].toLowerCase() : null;
}

type ResendDomain = {
  id: string;
  name: string;
  status: string;
  records?: Array<{
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

export async function acharDominioNoResend(
  nome: string,
): Promise<ResendDomain | null> {
  const lista = await resend<{ data?: ResendDomain[] }>("/domains");
  return (lista.data ?? []).find((d) => d.name === nome) ?? null;
}

export async function pedirVerificacaoDominio(id: string) {
  await resend(`/domains/${id}/verify`, "POST");
  return resend<ResendDomain>(`/domains/${id}`);
}

export async function checarSaudeEmail(): Promise<SaudeEmail> {
  const remetente = remetentePadrao();
  const dominio = dominioDoRemetente(remetente);
  const apiKeyConfigurada = !!process.env.RESEND_API_KEY;

  const [{ abertas }] = await db
    .select({ abertas: sql<number>`count(*)::int` })
    .from(emailFalhas)
    .where(isNull(emailFalhas.resolvidoEm));

  const [{ recentes }] = await db
    .select({ recentes: sql<number>`count(*)::int` })
    .from(emailFalhas)
    .where(sql`${emailFalhas.createdAt} > now() - interval '24 hours'`);

  let statusDominio = "desconhecido";
  let registros: RegistroDns[] = [];
  let erroConsulta: string | null = null;

  if (!apiKeyConfigurada) {
    erroConsulta = "RESEND_API_KEY não configurada — nenhum e-mail sai daqui.";
  } else if (!dominio) {
    erroConsulta = `Não consegui extrair o domínio de RESEND_FROM ("${remetente}").`;
  } else {
    try {
      const d = await acharDominioNoResend(dominio);
      if (!d) {
        statusDominio = "not_started";
        erroConsulta = `O domínio ${dominio} não está cadastrado no provedor.`;
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

  // Domínio não verificado = provedor recusa tudo. Isso é crítico mesmo sem
  // nenhuma falha registrada ainda (pode ser que ninguém tenha tentado hoje).
  const entregando = apiKeyConfigurada && statusDominio === "verified";
  const nivel: NivelSaude = !entregando
    ? "critico"
    : recentes > 0
      ? "atencao"
      : "ok";

  const resumo = !apiKeyConfigurada
    ? "A chave do provedor de e-mail não está configurada — nenhum e-mail está sendo entregue."
    : statusDominio !== "verified"
      ? `O domínio ${dominio ?? "remetente"} está com status "${statusDominio}" no provedor — todos os envios estão sendo recusados.`
      : recentes > 0
        ? `${recentes} e-mail(s) falharam nas últimas 24h.`
        : "Domínio verificado e nenhum envio falhou nas últimas 24h.";

  return {
    apiKeyConfigurada,
    remetente,
    dominio,
    statusDominio,
    erroConsulta,
    registros,
    falhasAbertas: abertas,
    falhas24h: recentes,
    nivel,
    resumo,
  };
}

/** Guarda o resultado pra tela mostrar "última verificação". */
export async function registrarCheck(s: SaudeEmail) {
  const payload: UltimoCheck = {
    em: new Date().toISOString(),
    nivel: s.nivel,
    statusDominio: s.statusDominio,
    falhas24h: s.falhas24h,
  };
  await db
    .insert(systemSettings)
    .values({ key: CHAVE_ULTIMO_CHECK, value: JSON.stringify(payload) })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value: JSON.stringify(payload), updatedAt: new Date() },
    });
}

export async function lerUltimoCheck(): Promise<UltimoCheck | null> {
  const [row] = await db
    .select({ value: systemSettings.value })
    .from(systemSettings)
    .where(sql`${systemSettings.key} = ${CHAVE_ULTIMO_CHECK}`)
    .limit(1);
  if (!row) return null;
  try {
    return JSON.parse(row.value) as UltimoCheck;
  } catch {
    return null;
  }
}
