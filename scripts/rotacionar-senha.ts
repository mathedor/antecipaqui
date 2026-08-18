/**
 * Rotaciona a senha de um usuário e avisa o responsável por e-mail.
 * Nada de credencial no código — tudo vem do ambiente:
 *
 *   ROTACAO_USER_ID=user_xxx ROTACAO_EMAIL=fulano@ex.com \
 *   ROTACAO_NOME="Fulano" ROTACAO_MOTIVO="rotação de segurança" \
 *     npx tsx --env-file=.env.local scripts/rotacionar-senha.ts
 */
import "dotenv/config";
import { rotacionarSenhaEComunicar } from "@/lib/seguranca/rotacionar-senha";

function req(nome: string): string {
  const v = (process.env[nome] ?? "").trim();
  if (!v) throw new Error(`Defina ${nome} no ambiente`);
  return v;
}

async function main() {
  const r = await rotacionarSenhaEComunicar({
    clerkUserId: req("ROTACAO_USER_ID"),
    emailResponsavel: req("ROTACAO_EMAIL"),
    nomeResponsavel: process.env.ROTACAO_NOME?.trim() || undefined,
    motivo: process.env.ROTACAO_MOTIVO?.trim() || undefined,
  });
  if (!r.ok) {
    console.error("Falha na rotação:", r.erro);
    process.exit(1);
  }
  console.log(
    `Senha rotacionada. E-mail ao responsável: ${r.emailEnviado ? "enviado" : "FALHOU (" + r.erro + ")"}.`,
  );
  // A senha só aparece aqui pra conferência manual; o responsável recebe por e-mail.
  console.log("Nova senha (guarde e não versione):", r.senha);
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
