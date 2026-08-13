/**
 * CLIENTE HTTP — OPERA CAPITAL (QPROF)
 *
 * Único ponto do sistema que fala com a API do fundo. Cuida de autenticação,
 * tempo limite, leitura tolerante da resposta e registro de saúde. Ninguém
 * mais monta requisição pra fora.
 *
 * Módulo síncrono (não é "use server") porque também é usado pelas rotas de
 * webhook, que rodam fora do ciclo de server actions.
 */
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos, type Fundo } from "@/db/schema";
import {
  montarCaminho,
  resolverContrato,
  type OperaContrato,
  type OperaRota,
} from "@/lib/opera/contrato";

const TIMEOUT_PADRAO_MS = 20_000;

export type OperaResposta = {
  ok: boolean;
  status: number;
  /** Corpo já convertido em objeto quando é JSON. */
  data: unknown;
  /** Corpo cru, limitado — vai pro log de auditoria. */
  cru: string;
  erro?: string;
  duracaoMs: number;
};

type Credenciais = {
  tipo?: "api_key" | "bearer" | "oauth" | "basic";
  apiKey?: string;
  token?: string;
  header?: string;
  usuario?: string;
  senha?: string;
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  escopo?: string;
};

/** Token OAuth em memória, por fundo. Some a cada cold start — é cache, não
 *  estado: se sumir, o próximo pedido renova. */
const cacheToken = new Map<string, { token: string; expiraEm: number }>();

function lerCredenciais(fundo: Fundo): Credenciais {
  const c = fundo.integracaoCredenciais;
  if (!c || typeof c !== "object") return {};
  return c as Credenciais;
}

/** Busca (ou reaproveita) o token OAuth do fundo. */
async function tokenOAuth(fundo: Fundo, cred: Credenciais): Promise<string> {
  const emCache = cacheToken.get(fundo.id);
  if (emCache && emCache.expiraEm > Date.now() + 30_000) return emCache.token;

  if (!cred.tokenUrl || !cred.clientId || !cred.clientSecret) {
    throw new Error(
      "Credenciais OAuth incompletas — falta tokenUrl, clientId ou clientSecret",
    );
  }

  const corpo = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cred.clientId,
    client_secret: cred.clientSecret,
  });
  if (cred.escopo) corpo.set("scope", cred.escopo);

  const res = await fetch(cred.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: corpo.toString(),
    signal: AbortSignal.timeout(TIMEOUT_PADRAO_MS),
  });
  if (!res.ok) {
    throw new Error(`Falha ao obter token OAuth: HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) throw new Error("Resposta do OAuth sem access_token");

  const validadeSeg = json.expires_in ?? 3600;
  cacheToken.set(fundo.id, {
    token: json.access_token,
    expiraEm: Date.now() + validadeSeg * 1000,
  });
  return json.access_token;
}

async function montarHeaders(fundo: Fundo): Promise<Record<string, string>> {
  const cred = lerCredenciais(fundo);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": "Antecipaqui/1.0 (integracao-fundo)",
  };

  switch (cred.tipo) {
    case "oauth": {
      headers.authorization = `Bearer ${await tokenOAuth(fundo, cred)}`;
      break;
    }
    case "bearer": {
      if (!cred.token) throw new Error("Credencial 'bearer' sem token");
      headers.authorization = `Bearer ${cred.token}`;
      break;
    }
    case "basic": {
      if (!cred.usuario || !cred.senha)
        throw new Error("Credencial 'basic' sem usuário ou senha");
      const b64 = Buffer.from(`${cred.usuario}:${cred.senha}`).toString(
        "base64",
      );
      headers.authorization = `Basic ${b64}`;
      break;
    }
    case "api_key":
    default: {
      if (!cred.apiKey)
        throw new Error(
          "Integração sem credencial configurada — cadastre a chave no painel do fundo",
        );
      headers[cred.header ?? "x-api-key"] = cred.apiKey;
      break;
    }
  }

  return headers;
}

export function contratoDoFundo(fundo: Fundo): OperaContrato {
  return resolverContrato(fundo.integracaoContrato);
}

/** Chamada crua a uma rota do fundo. Nunca lança por erro de rede ou HTTP:
 *  devolve `ok:false` com o motivo, pra fila decidir se tenta de novo. */
export async function operaFetch(
  fundo: Fundo,
  rota: OperaRota,
  opts: {
    vars?: { cnpj?: string; id?: string };
    body?: unknown;
    timeoutMs?: number;
  } = {},
): Promise<OperaResposta> {
  const inicio = Date.now();

  if (!fundo.integracaoApiUrl) {
    return {
      ok: false,
      status: 0,
      data: null,
      cru: "",
      erro: "Fundo sem URL de API configurada",
      duracaoMs: 0,
    };
  }

  let headers: Record<string, string>;
  try {
    headers = await montarHeaders(fundo);
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      cru: "",
      erro: (e as Error).message,
      duracaoMs: Date.now() - inicio,
    };
  }

  const base = fundo.integracaoApiUrl.replace(/\/+$/, "");
  const url = `${base}${montarCaminho(rota, opts.vars)}`;

  try {
    const res = await fetch(url, {
      method: rota.metodo,
      headers,
      body:
        rota.metodo === "GET" || opts.body === undefined
          ? undefined
          : JSON.stringify(opts.body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_PADRAO_MS),
    });

    const cru = (await res.text().catch(() => "")).slice(0, 20_000);
    let data: unknown = null;
    try {
      data = cru ? JSON.parse(cru) : null;
    } catch {
      data = null; // resposta não-JSON: fica só o cru pro admin ver
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      cru,
      erro: res.ok ? undefined : `HTTP ${res.status}`,
      duracaoMs: Date.now() - inicio,
    };
  } catch (e) {
    const msg = (e as Error).message;
    return {
      ok: false,
      status: 0,
      data: null,
      cru: "",
      erro:
        msg.includes("timeout") || msg.includes("aborted")
          ? `Tempo esgotado após ${(opts.timeoutMs ?? TIMEOUT_PADRAO_MS) / 1000}s`
          : msg,
      duracaoMs: Date.now() - inicio,
    };
  }
}

/** Registra o resultado da última conversa com o fundo — alimenta o painel
 *  de saúde da integração. Best-effort: nunca derruba quem chamou. */
export async function registrarSaude(
  fundoId: string,
  resultado: { ok: boolean; erro?: string },
) {
  try {
    await db
      .update(fundos)
      .set(
        resultado.ok
          ? { integracaoUltimoOkEm: new Date(), integracaoUltimoErro: null }
          : { integracaoUltimoErro: (resultado.erro ?? "erro").slice(0, 500) },
      )
      .where(eq(fundos.id, fundoId));
  } catch {
    /* saúde é informativa; não bloqueia a operação */
  }
}

/** Ping da conexão pro painel do admin. Usa a rota de saúde quando existe;
 *  senão, tenta a consulta de cliente com um CNPJ neutro — o que importa é
 *  saber se autenticamos e se a porta responde. */
export async function testarConexao(fundo: Fundo): Promise<OperaResposta> {
  const contrato = contratoDoFundo(fundo);
  const rota =
    contrato.rotas.saude ??
    ({
      ...contrato.rotas.consultarCliente,
      caminho: contrato.rotas.consultarCliente.caminho,
    } as OperaRota);

  const r = await operaFetch(fundo, rota, {
    vars: { cnpj: "00000000000000" },
    timeoutMs: 10_000,
  });
  // 404 numa consulta de CNPJ inexistente é resposta saudável: autenticou.
  const saudavel = r.ok || r.status === 404;
  await registrarSaude(fundo.id, { ok: saudavel, erro: r.erro });
  return { ...r, ok: saudavel };
}

/* ─────────────────────────────────────────────
   ASSINATURA DOS WEBHOOKS QUE O FUNDO MANDA
   ───────────────────────────────────────────── */

/** Confere o HMAC do corpo cru contra o segredo compartilhado. Comparação em
 *  tempo constante — assinatura errada não vaza informação pelo relógio. */
export function conferirAssinatura(
  segredo: string,
  corpoCru: string,
  assinaturaRecebida: string | null,
  contrato: OperaContrato,
): boolean {
  if (!assinaturaRecebida) return false;

  const { prefixo, formato } = contrato.assinatura;
  const limpa = assinaturaRecebida.startsWith(prefixo)
    ? assinaturaRecebida.slice(prefixo.length)
    : assinaturaRecebida;

  const esperada = crypto
    .createHmac("sha256", segredo)
    .update(corpoCru, "utf8")
    .digest(formato === "base64" ? "base64" : "hex");

  const a = Buffer.from(esperada);
  const b = Buffer.from(limpa);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Identificador do evento pra idempotência. Quando o fundo não manda um ID
 *  próprio, o hash do corpo serve: reentrega idêntica cai na mesma chave. */
export function idDoEvento(
  idInformado: string | null | undefined,
  corpoCru: string,
): string {
  if (idInformado) return String(idInformado).slice(0, 200);
  return (
    "sha256:" + crypto.createHash("sha256").update(corpoCru).digest("hex")
  );
}
