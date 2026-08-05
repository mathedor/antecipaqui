"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoras, documentos, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { notify } from "@/lib/notify";

/**
 * Admin dispara cobrança de documentação faltante pra um usuário.
 * Cria notificação in-app + email.
 *
 * Usa o template "estamos aguardando suas documentações faltantes".
 * Detecta automaticamente quais docs faltam pra ser específico.
 */
export async function cobrarDocumentacaoUsuarioAction(userId: string) {
  await requireAdmin();

  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) throw new Error("Usuário não encontrado");

  const userDocs = await db
    .select({ tipo: documentos.tipo })
    .from(documentos)
    .where(eq(documentos.userId, userId));
  const tipos = new Set(userDocs.map((d) => d.tipo));

  const faltam: string[] = [];
  if (!tipos.has("contrato_social")) faltam.push("Contrato social");
  if (!tipos.has("comprovante_endereco"))
    faltam.push("Comprovante de endereço");

  const listaItens =
    faltam.length > 0
      ? faltam.map((d) => `• ${d}`).join("\n")
      : "• Verifique seu painel — pode haver pendências adicionais";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

  await notify({
    userId: u.id,
    type: "documentacao_pendente",
    title: "Documentação pendente — atenção necessária",
    body: `Estamos aguardando suas documentações faltantes:\n\n${listaItens}\n\nAcesse seu painel pra completar o envio.`,
    link: "/painel/onboarding/dados",
    email: {
      to: u.email,
      subject:
        "Antecipaqui · Estamos aguardando suas documentações faltantes",
      body: `Olá ${u.nome ?? ""},

Estamos aguardando suas documentações faltantes pra que você possa cadastrar operações na Antecipaqui:

${listaItens}

Por favor, acesse seu painel e finalize o envio:
${baseUrl}/painel/onboarding/dados

Qualquer dúvida, responda este email ou fale com a gente em contato@antecipaqui.digital.

Equipe Antecipaqui`,
    },
  });

  return { ok: true };
}

/**
 * Mesmo fluxo pra construtora — manda email pro endereço da construtora
 * E cria notif pro owner se houver.
 */
export async function cobrarDocumentacaoConstrutoraAction(
  construtoraId: string,
) {
  await requireAdmin();

  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, construtoraId))
    .limit(1);
  if (!c) throw new Error("Construtora não encontrada");

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

  const cDocs = await db
    .select({ tipo: documentos.tipo })
    .from(documentos)
    .where(eq(documentos.construtoraId, construtoraId));
  const tipos = new Set(cDocs.map((d) => d.tipo));

  const faltam: string[] = [];
  if (!tipos.has("contrato_social")) faltam.push("Contrato social");
  if (!tipos.has("comprovante_endereco"))
    faltam.push("Comprovante de endereço");

  const listaItens =
    faltam.length > 0
      ? faltam.map((d) => `• ${d}`).join("\n")
      : "• Verifique o painel — pode haver pendências adicionais";

  const ownerEmail = c.email;

  if (c.ownerUserId) {
    await notify({
      userId: c.ownerUserId,
      type: "documentacao_pendente_construtora",
      title: `Documentação pendente · ${c.razaoSocial}`,
      body: `Estamos aguardando documentação:\n\n${listaItens}`,
      link: "/painel",
      email: ownerEmail
        ? {
            to: ownerEmail,
            subject:
              "Antecipaqui · Estamos aguardando suas documentações faltantes",
            body: `Olá!

Estamos aguardando as documentações faltantes da ${c.razaoSocial}:

${listaItens}

Acesse o painel pra finalizar o envio: ${baseUrl}/painel

Qualquer dúvida, responda este email ou fale com a gente em contato@antecipaqui.digital.

Equipe Antecipaqui`,
          }
        : undefined,
    });
  } else if (ownerEmail) {
    // Sem owner — manda só email direto pro endereço comercial
    const { sendEmail } = await import("@/lib/email");
    await sendEmail({
      contexto: "cobranca",
      to: ownerEmail,
      subject: `Antecipaqui · ${c.razaoSocial} — documentação pendente`,
      body: `Olá!

A ${c.razaoSocial} está cadastrada na Antecipaqui mas ainda não temos um responsável associado. Pra completar o cadastro e permitir que operações sejam liquidadas, é preciso:

1) Cadastrar um usuário responsável pela construtora em ${baseUrl}/cadastre-se (use o CNPJ ${c.cnpj})
2) Enviar a documentação faltante:

${listaItens}

Equipe Antecipaqui`,
    });
  }

  return { ok: true };
}
