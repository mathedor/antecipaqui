/**
 * Wrapper minimal da API ZapSign V1.
 * Docs: https://docs.zapsign.com.br/
 *
 * Auth via query param `?api_token=...` (token em ZAPSIGN_API_TOKEN).
 *
 * Endpoints usados:
 *  - POST /api/v1/docs/             → cria documento com signers
 *  - GET  /api/v1/docs/{token}/     → status atual
 *  - DELETE /api/v1/docs/{token}/   → cancela
 */

const BASE = "https://api.zapsign.com.br/api/v1";

function token() {
  const t = process.env.ZAPSIGN_API_TOKEN;
  if (!t) throw new Error("ZAPSIGN_API_TOKEN não definido");
  return t;
}

export type ZapsignSignerInput = {
  /** identificador interno (não vai pra ZapSign, mas usamos pra mapear) */
  role: "cedente" | "construtora" | "antecipaqui";
  name: string;
  email: string;
  /** opcional: ex "11999999999" — sem +55 */
  phoneNumber?: string;
  /** "assinaturaTela" (default) | "assinaturaTela-tokenEmail" */
  authMode?: "assinaturaTela" | "assinaturaTela-tokenEmail";
};

export type ZapsignSignerResponse = {
  token: string;
  sign_url: string;
  status: string;
  name: string;
  email: string;
  /** ISO em formato ZapSign (string) — null se ainda não assinou */
  times_viewed?: number;
  last_view_at?: string | null;
  signed_at?: string | null;
};

export type ZapsignDocResponse = {
  open_id: number;
  token: string;
  name: string;
  status: "pending" | "signed" | "refused" | string;
  signers: ZapsignSignerResponse[];
  external_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CreateDocArgs = {
  name: string;
  /** URL pública do PDF (ex: Vercel Blob) */
  urlPdf: string;
  externalId?: string;
  signers: ZapsignSignerInput[];
  /** Se quiser, manda email automático pelo ZapSign (default true) */
  sendAutomaticEmail?: boolean;
  /** lang default "pt-br" */
  lang?: "pt-br" | "en" | "es";
};

/**
 * Cria documento na ZapSign com signers e retorna response com sign_urls.
 */
export async function createZapsignDocument(
  args: CreateDocArgs,
): Promise<ZapsignDocResponse> {
  const body = {
    name: args.name.slice(0, 255),
    url_pdf: args.urlPdf,
    external_id: args.externalId,
    lang: args.lang ?? "pt-br",
    send_automatic_email: args.sendAutomaticEmail ?? true,
    disable_signer_emails: false,
    signers: args.signers.map((s) => ({
      name: s.name,
      email: s.email,
      auth_mode: s.authMode ?? "assinaturaTela",
      send_automatic_email: true,
      ...(s.phoneNumber
        ? { phone_country: "55", phone_number: s.phoneNumber }
        : {}),
    })),
  };

  const res = await fetch(`${BASE}/docs/?api_token=${token()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ZapSign create failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as ZapsignDocResponse;
}

export async function getZapsignDocument(
  documentToken: string,
): Promise<ZapsignDocResponse> {
  const res = await fetch(
    `${BASE}/docs/${documentToken}/?api_token=${token()}`,
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ZapSign get failed: ${res.status} ${txt}`);
  }
  return (await res.json()) as ZapsignDocResponse;
}

export async function cancelZapsignDocument(documentToken: string) {
  const res = await fetch(
    `${BASE}/docs/${documentToken}/?api_token=${token()}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`ZapSign cancel failed: ${res.status} ${txt}`);
  }
  return { ok: true };
}

/**
 * Pega o email padrão do signer Antecipaqui.
 * Pode ser sobrescrito via env ANTECIPAQUI_SIGNER_EMAIL.
 */
export function getAntecipaquiSigner(): { name: string; email: string } {
  const email =
    process.env.ANTECIPAQUI_SIGNER_EMAIL || "mathe@diretoriow.com.br";
  const name = process.env.ANTECIPAQUI_SIGNER_NAME || "Antecipaqui";
  return { name, email };
}
