"use server";

/**
 * Auto-cadastro de comercial.
 *
 * Fluxo:
 *   1. Candidato preenche /quero-ser-comercial (rota pública, sem login).
 *      → cria row em `comerciais` com origem='candidatura',
 *        aprovacao='pendente', is_active=false, owner_user_id=NULL.
 *      → admins recebem notificação in-app.
 *   2. Admin decide em /admin/comerciais (fila no topo da página).
 *      → aprovar: cria/vincula o user (Clerk invitation quando o email
 *        ainda não existe), role='comercial', is_active=true.
 *        A partir daí o login dele já abre o painel do comercial.
 *      → recusar: marca aprovacao='recusada' com motivo, sem criar user.
 *
 * A candidatura NÃO cria user nem convite antes da aprovação — só depois.
 */

import { revalidatePath } from "next/cache";
import { eq, desc, and, or } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { comerciais, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ, isValidCPF, unmaskCPF } from "@/lib/cnpj";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { sendEmail } from "@/lib/email";

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ??
  "https://www.antecipaqui.digital";

/* =========================================
   1 · CANDIDATURA (público)
   ========================================= */

export type CandidaturaComercialState =
  | { ok: false; error: string }
  | { ok: true; nome: string }
  | null;

export async function candidaturaComercialAction(
  _prev: CandidaturaComercialState,
  formData: FormData,
): Promise<CandidaturaComercialState> {
  const tipoPessoa = String(formData.get("tipoPessoa") || "").trim();
  if (tipoPessoa !== "fisica" && tipoPessoa !== "juridica") {
    return { ok: false, error: "Selecione se você é pessoa física ou jurídica" };
  }

  const nomeCompleto = String(formData.get("nomeCompleto") || "").trim();
  const apelido = String(formData.get("apelido") || "").trim() || null;
  const documentoRaw = String(formData.get("documento") || "");
  const cep = String(formData.get("cep") || "").replace(/\D/g, "") || null;
  const endereco = String(formData.get("endereco") || "").trim() || null;
  const cidade = String(formData.get("cidade") || "").trim() || null;
  const uf = String(formData.get("uf") || "").trim().toUpperCase() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const telefone =
    String(formData.get("telefone") || "").replace(/\D/g, "") || null;
  const experiencia =
    String(formData.get("experiencia") || "").trim().slice(0, 2000) || null;

  if (!nomeCompleto || nomeCompleto.length < 3) {
    return {
      ok: false,
      error:
        tipoPessoa === "fisica"
          ? "Informe seu nome completo"
          : "Informe a razão social da sua empresa",
    };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Informe um e-mail válido" };
  }
  if (!telefone || telefone.length < 10) {
    return { ok: false, error: "Informe um telefone com DDD (WhatsApp)" };
  }
  if (!cidade || !uf) {
    return { ok: false, error: "Informe cidade e estado onde você atua" };
  }

  let documento: string;
  if (tipoPessoa === "fisica") {
    documento = unmaskCPF(documentoRaw);
    if (!isValidCPF(documento)) return { ok: false, error: "CPF inválido" };
  } else {
    documento = unmaskCNPJ(documentoRaw);
    if (!isValidCNPJ(documento)) return { ok: false, error: "CNPJ inválido" };
  }

  // Já existe cadastro com esse documento OU esse e-mail?
  const [existente] = await db
    .select({
      id: comerciais.id,
      aprovacao: comerciais.aprovacao,
      documento: comerciais.documento,
    })
    .from(comerciais)
    .where(
      or(eq(comerciais.documento, documento), eq(comerciais.email, email)),
    )
    .limit(1);

  if (existente) {
    if (existente.aprovacao === "pendente") {
      return {
        ok: false,
        error:
          "Já recebemos uma solicitação com esses dados — ela está em análise. Você recebe um e-mail assim que for aprovada.",
      };
    }
    if (existente.aprovacao === "aprovada") {
      return {
        ok: false,
        error:
          "Esses dados já estão cadastrados como comercial. Entre em www.antecipaqui.digital/entrar — ou use 'esqueci minha senha'.",
      };
    }
    return {
      ok: false,
      error:
        "Já existe uma solicitação registrada com esses dados. Fale com a equipe Antecipaqui pra reabrir seu cadastro.",
    };
  }

  const [criado] = await db
    .insert(comerciais)
    .values({
      ownerUserId: null,
      tipoPessoa: tipoPessoa as "fisica" | "juridica",
      nomeCompleto,
      apelido,
      documento,
      cep,
      endereco,
      cidade,
      uf,
      email,
      telefone,
      experiencia,
      origem: "candidatura",
      aprovacao: "pendente",
      isActive: false,
    })
    .returning({ id: comerciais.id });

  audit({
    action: "candidatura_comercial_recebida",
    targetType: "comercial",
    targetId: criado.id,
    targetLabel: nomeCompleto,
    metadata: { tipoPessoa, email, documento, cidade, uf },
  }).catch(() => undefined);

  // Avisa todos os admins (sino + e-mail).
  const adminList = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true)));

  await Promise.allSettled(
    adminList.map((a) =>
      notify({
        userId: a.id,
        type: "candidatura_comercial",
        title: "Nova candidatura de comercial",
        body: `${nomeCompleto} (${cidade}/${uf}) quer entrar pro time comercial.`,
        link: "/admin/comerciais",
        email: {
          to: a.email,
          subject: `Nova candidatura de comercial — ${nomeCompleto}`,
          body:
            `${nomeCompleto} se candidatou a comercial da Antecipaqui.\n\n` +
            `Cidade: ${cidade}/${uf}\n` +
            `Contato: ${email} · ${telefone}\n` +
            (experiencia ? `\nExperiência:\n${experiencia}\n` : "") +
            `\nAprovar ou recusar em ${siteUrl()}/admin/comerciais`,
        },
      }),
    ),
  );

  return { ok: true, nome: apelido || nomeCompleto };
}

/* =========================================
   2 · FILA + DECISÃO (admin)
   ========================================= */

/** Candidaturas aguardando decisão do admin, mais recentes primeiro. */
export async function listCandidaturasComercial() {
  await requireAdmin();
  return db
    .select()
    .from(comerciais)
    .where(eq(comerciais.aprovacao, "pendente"))
    .orderBy(desc(comerciais.createdAt));
}

export type DecisaoCandidaturaState =
  | { ok: false; error: string }
  | { ok: true; message: string }
  | null;

/**
 * Aprova a candidatura: cria (ou vincula) o user com role='comercial' e
 * ativa o comercial. Quando o e-mail ainda não existe, dispara invitation
 * do Clerk — o candidato define a senha pelo link e já cai no painel.
 */
export async function aprovarCandidaturaComercialAction(
  _prev: DecisaoCandidaturaState,
  formData: FormData,
): Promise<DecisaoCandidaturaState> {
  const admin = await requireAdmin();
  const comercialId = String(formData.get("comercialId") || "").trim();
  if (!comercialId) return { ok: false, error: "Candidatura não informada" };

  const [cand] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.id, comercialId))
    .limit(1);
  if (!cand) return { ok: false, error: "Candidatura não encontrada" };
  if (cand.aprovacao !== "pendente") {
    return { ok: false, error: "Essa candidatura já foi decidida" };
  }

  const email = cand.email.toLowerCase();

  // User já existe com esse e-mail? Vira comercial.
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    await db
      .update(users)
      .set({
        role: "comercial" as never,
        nome: cand.nomeCompleto,
        telefone: cand.telefone,
        onboardingStatus: "aprovado",
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  } else {
    let inviteId: string;
    try {
      const clerk = await clerkClient();
      const inv = await clerk.invitations.createInvitation({
        emailAddress: email,
        publicMetadata: { role: "comercial" },
        redirectUrl: `${siteUrl()}/painel`,
      });
      inviteId = inv.id;
    } catch (e) {
      return {
        ok: false,
        error: "Erro ao criar o convite no Clerk: " + (e as Error).message,
      };
    }

    userId = `invited_${inviteId}`;
    await db.insert(users).values({
      id: userId,
      email,
      nome: cand.nomeCompleto,
      telefone: cand.telefone,
      role: "comercial" as never,
      onboardingStatus: "aprovado",
      isActive: true,
    });
  }

  await db
    .update(comerciais)
    .set({
      ownerUserId: userId,
      aprovacao: "aprovada",
      isActive: true,
      decididoEm: new Date(),
      recusaMotivo: null,
      updatedAt: new Date(),
    })
    .where(eq(comerciais.id, comercialId));

  audit({
    action: "admin_aprovou_candidatura_comercial",
    targetType: "comercial",
    targetId: comercialId,
    targetLabel: cand.nomeCompleto,
    metadata: { email, userId, decididoPor: admin.email },
  }).catch(() => undefined);

  sendEmail({
    contexto: "candidatura_comercial",
    to: email,
    subject: "Sua candidatura foi aprovada — bem-vindo(a) ao time Antecipaqui",
    body:
      `Olá, ${cand.apelido || cand.nomeCompleto}!\n\n` +
      `Sua candidatura pra comercial da Antecipaqui foi aprovada. ` +
      `Seu acesso já está liberado.\n\n` +
      (existingUser
        ? `Entre com o e-mail ${email} em ${siteUrl()}/entrar\n`
        : `Você vai receber um convite pra criar sua senha no e-mail ${email}. ` +
          `Depois é só entrar em ${siteUrl()}/entrar\n`) +
      `\nNo primeiro login você já encontra o mapa de prospects, o pipeline, ` +
      `o cadastro express e o seu link de convite.\n\n` +
      `Bom trabalho!\nEquipe Antecipaqui`,
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
  return {
    ok: true,
    message: `${cand.nomeCompleto} aprovado(a). ${existingUser ? "O acesso dele(a) já virou comercial." : "Convite enviado por e-mail."}`,
  };
}

/** Recusa a candidatura. Não cria user nem convite. */
export async function recusarCandidaturaComercialAction(
  _prev: DecisaoCandidaturaState,
  formData: FormData,
): Promise<DecisaoCandidaturaState> {
  const admin = await requireAdmin();
  const comercialId = String(formData.get("comercialId") || "").trim();
  const motivo = String(formData.get("motivo") || "").trim() || null;
  if (!comercialId) return { ok: false, error: "Candidatura não informada" };

  const [cand] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.id, comercialId))
    .limit(1);
  if (!cand) return { ok: false, error: "Candidatura não encontrada" };
  if (cand.aprovacao !== "pendente") {
    return { ok: false, error: "Essa candidatura já foi decidida" };
  }

  await db
    .update(comerciais)
    .set({
      aprovacao: "recusada",
      isActive: false,
      recusaMotivo: motivo,
      decididoEm: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(comerciais.id, comercialId));

  audit({
    action: "admin_recusou_candidatura_comercial",
    targetType: "comercial",
    targetId: comercialId,
    targetLabel: cand.nomeCompleto,
    metadata: { motivo, decididoPor: admin.email },
  }).catch(() => undefined);

  revalidatePath("/admin/comerciais");
  return { ok: true, message: `Candidatura de ${cand.nomeCompleto} recusada.` };
}
