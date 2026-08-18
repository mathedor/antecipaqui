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
  tipo?: "api_key" | "bearer" | "oauth" | "basic" | "usuario_senha";
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

/** Token (OAuth ou JWT) em memória, por fundo. Some a cada cold start — é
 *  cache, não estado: se sumir, o próximo pedido renova. */
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

/** Token JWT da OperAPI: POST usuário/senha na rota de autenticação do
 *  contrato, resposta { access, expires_at }. A doc diz que o token muda a
 *  cada 1 hora — o cache respeita o expires_at, mas nunca guarda por mais
 *  de 50 minutos. */
async function tokenUsuarioSenha(
  fundo: Fundo,
  cred: Credenciais,
): Promise<string> {
  const emCache = cacheToken.get(fundo.id);
  if (emCache && emCache.expiraEm > Date.now() + 30_000) return emCache.token;

  if (!cred.usuario || !cred.senha) {
    throw new Error("Credencial 'usuario_senha' sem usuário ou senha");
  }

  const contrato = contratoDoFundo(fundo);
  const rotaAuth = contrato.rotas.autenticar;
  const url =
    cred.tokenUrl ??
    (fundo.integracaoApiUrl && rotaAuth
      ? `${fundo.integracaoApiUrl.replace(/\/+$/, "")}${rotaAuth.caminho}`
      : null);
  if (!url) {
    throw new Error(
      "Sem rota de autenticação — configure a URL da API e o contrato do fundo",
    );
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: cred.usuario, password: cred.senha }),
    signal: AbortSignal.timeout(TIMEOUT_PADRAO_MS),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 400 || res.status === 401
        ? "Usuário ou senha recusados pelo fundo"
        : `Falha na autenticação do fundo: HTTP ${res.status}`,
    );
  }
  const json = (await res.json().catch(() => ({}))) as {
    access?: string;
    expires_at?: string;
  };
  if (!json.access) throw new Error("Resposta da autenticação sem o token (access)");

  const expiraInformado = json.expires_at ? Date.parse(json.expires_at) : NaN;
  const tetoSeguro = Date.now() + 50 * 60_000;
  const expiraEm = Number.isFinite(expiraInformado)
    ? Math.min(expiraInformado, tetoSeguro)
    : tetoSeguro;
  cacheToken.set(fundo.id, { token: json.access, expiraEm });
  return json.access;
}

/** Derruba o token em cache — usado quando o fundo responde 401 no meio da
 *  validade (troca de senha, expiração antecipada). */
export function invalidarToken(fundoId: string) {
  cacheToken.delete(fundoId);
}

async function montarHeaders(fundo: Fundo): Promise<Record<string, string>> {
  const cred = lerCredenciais(fundo);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    "user-agent": "Antecipaqui/1.0 (integracao-fundo)",
  };

  switch (cred.tipo) {
    case "usuario_senha": {
      headers.authorization = `Bearer ${await tokenUsuarioSenha(fundo, cred)}`;
      break;
    }
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
    /** Arquivo opcional pra rotas multipart (ex.: ZIP de XMLs de lastro). */
    binario?: { campo: string; nome: string; conteudo: Buffer };
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

  const base = fundo.integracaoApiUrl.replace(/\/+$/, "");
  const url = `${base}${montarCaminho(rota, opts.vars)}`;

  const chamar = async (): Promise<Response> => {
    const headers = await montarHeaders(fundo);

    let body: BodyInit | undefined;
    if (rota.metodo !== "GET" && opts.body !== undefined) {
      if (rota.corpo === "multipart") {
        // Formato da OperAPI: o JSON inteiro vai como string no campo
        // `payload`; arquivos binários entram em campos próprios.
        const form = new FormData();
        form.set("payload", JSON.stringify(opts.body));
        if (opts.binario) {
          form.set(
            opts.binario.campo,
            new Blob([new Uint8Array(opts.binario.conteudo)]),
            opts.binario.nome,
          );
        }
        delete headers["content-type"]; // o fetch define o boundary
        body = form;
      } else {
        body = JSON.stringify(opts.body);
      }
    }

    return fetch(url, {
      method: rota.metodo,
      headers,
      body,
      signal: AbortSignal.timeout(opts.timeoutMs ?? TIMEOUT_PADRAO_MS),
    });
  };

  try {
    let res = await chamar();

    // 401 no meio da validade do token: renova uma vez e repete. Cobre troca
    // de senha e expiração antecipada do lado do fundo.
    if (res.status === 401) {
      invalidarToken(fundo.id);
      res = await chamar();
    }

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
 *  senão, faz a consulta de cliente com um CNPJ neutro — o que importa é
 *  saber se autenticamos e se a porta responde. */
export async function testarConexao(fundo: Fundo): Promise<OperaResposta> {
  const contrato = contratoDoFundo(fundo);
  const rota = contrato.rotas.saude ?? contrato.rotas.consultarCliente;

  // CNPJ neutro válido (Banco do Brasil) — "não encontrado" é resposta
  // saudável: prova que autenticou e que a rota responde.
  const cnpjNeutro = "00000000000191";
  const r = await operaFetch(fundo, rota, {
    vars: { cnpj: cnpjNeutro },
    body:
      rota.metodo === "GET"
        ? undefined
        : { parceiro: contrato.envio.parceiro, cnpj_cliente: cnpjNeutro },
    timeoutMs: 10_000,
  });
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
