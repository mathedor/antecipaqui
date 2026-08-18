/**
 * Rotação de senha com aviso obrigatório ao responsável.
 *
 * Regra do dono: TODA troca de senha dispara um e-mail ao responsável
 * contando o que mudou. Por isso o envio faz parte desta função — quem
 * rotaciona não tem como esquecer de avisar.
 */
import crypto from "node:crypto";
import { sendEmail } from "@/lib/email";

const CLERK_API = "https://api.clerk.com/v1";

/** Senha forte legível: blocos aleatórios + símbolo + dígitos. */
export function gerarSenhaForte(): string {
  const base = crypto.randomBytes(9).toString("base64url").replace(/[-_]/g, "");
  const simbolos = "!@#$%&*";
  const s = simbolos[crypto.randomInt(simbolos.length)];
  const n = crypto.randomInt(10, 100);
  return `Aq${base}${s}${n}`;
}

async function clerkPatchSenha(clerkUserId: string, senha: string) {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY ausente — não dá pra rotacionar senha");
  const res = await fetch(`${CLERK_API}/users/${clerkUserId}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ password: senha, skip_password_checks: true }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Clerk recusou a troca de senha (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }
}

export type RotacaoResultado = {
  ok: boolean;
  senha?: string;
  emailEnviado: boolean;
  erro?: string;
};

/**
 * Rotaciona a senha de um usuário e avisa o responsável por e-mail.
 *
 * @param clerkUserId   id do usuário no Clerk
 * @param emailResponsavel  para quem vai o aviso (normalmente o próprio dono do acesso)
 * @param nomeResponsavel   nome pra personalizar o e-mail (opcional)
 * @param motivo        frase curta explicando por que a senha mudou (opcional)
 * @param senha         senha específica; se omitida, gera uma forte
 */
export async function rotacionarSenhaEComunicar(opts: {
  clerkUserId: string;
  emailResponsavel: string;
  nomeResponsavel?: string;
  motivo?: string;
  senha?: string;
}): Promise<RotacaoResultado> {
  const senha = opts.senha ?? gerarSenhaForte();

  try {
    await clerkPatchSenha(opts.clerkUserId, senha);
  } catch (e) {
    return { ok: false, emailEnviado: false, erro: (e as Error).message };
  }

  const saudacao = opts.nomeResponsavel ? `Olá, ${opts.nomeResponsavel}.` : "Olá.";
  const motivoLinha = opts.motivo
    ? `Motivo: ${opts.motivo}\n\n`
    : "";
  const corpo =
    `${saudacao}\n\n` +
    `A senha de acesso da sua conta na Antecipaqui foi alterada.\n\n` +
    motivoLinha +
    `Sua nova senha de acesso é: ${senha}\n\n` +
    `Por segurança, entre no painel e troque essa senha por uma sua assim que possível. ` +
    `Se você não reconhece esta alteração, responda este e-mail imediatamente.`;

  const envio = await sendEmail({
    to: opts.emailResponsavel,
    subject: "Antecipaqui · Sua senha de acesso foi alterada",
    body: corpo,
    contexto: "rotacao_senha",
  });

  return {
    ok: true,
    senha,
    emailEnviado: envio.ok,
    erro: envio.ok ? undefined : envio.error,
  };
}
