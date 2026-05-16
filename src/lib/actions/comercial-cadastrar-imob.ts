"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  comerciais,
  documentos,
  imobiliarias,
  users,
} from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";

const CLERK_API = "https://api.clerk.com/v1";

type ClerkUser = { id: string };

async function clerkRequest<T = unknown>(
  path: string,
  method: string,
  body?: unknown,
): Promise<T> {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) throw new Error("CLERK_SECRET_KEY não configurada");
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Clerk ${method} ${path} → ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

async function findClerkUserByEmail(email: string): Promise<ClerkUser | null> {
  const list = await clerkRequest<unknown>(
    `/users?email_address=${encodeURIComponent(email)}`,
    "GET",
  );
  if (Array.isArray(list) && list.length > 0) return list[0] as ClerkUser;
  if (list && typeof list === "object" && "data" in list) {
    const d = (list as { data: unknown[] }).data;
    if (Array.isArray(d) && d.length > 0) return d[0] as ClerkUser;
  }
  return null;
}

function genTempPassword(): string {
  // Senha temporária forte: 12 chars alfanum mistos
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let s = "";
  for (let i = 0; i < 12; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export type CadastrarImobExpressResult = {
  ok: boolean;
  imobiliariaId?: string;
  userId?: string;
  email?: string;
  senhaTemp?: string;
  whatsappLink?: string;
  reaproveitouUser?: boolean;
  error?: string;
};

export async function cadastrarImobiliariaExpress(input: {
  /** Dados do corretor responsável (vira owner da imob). */
  nomeCorretor: string;
  emailCorretor: string;
  telefoneCorretor: string;
  /** Dados da imobiliária. */
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  creci?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
}): Promise<CadastrarImobExpressResult> {
  const user = await requireActiveUser();
  if (user.role !== "comercial")
    return { ok: false, error: "Apenas comercial pode cadastrar por aqui" };

  const [comercial] = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.ownerUserId, user.id))
    .limit(1);
  if (!comercial)
    return { ok: false, error: "Comercial não vinculado ao seu user" };

  const email = input.emailCorretor.trim().toLowerCase();
  if (!email || !/^.+@.+\..+$/.test(email))
    return { ok: false, error: "Email inválido" };
  if (!input.nomeCorretor.trim())
    return { ok: false, error: "Nome do corretor obrigatório" };
  if (!input.razaoSocial.trim())
    return { ok: false, error: "Razão social obrigatória" };
  if (!input.cnpj.trim())
    return { ok: false, error: "CNPJ obrigatório" };

  // CNPJ já cadastrado?
  const existingImob = await db
    .select({ id: imobiliarias.id })
    .from(imobiliarias)
    .where(eq(imobiliarias.cnpj, input.cnpj.replace(/\D/g, "")))
    .limit(1);
  if (existingImob[0])
    return {
      ok: false,
      error: "Já existe imobiliária com esse CNPJ na base",
    };

  // 1) Procura ou cria user no Clerk
  let clerkUserId: string;
  let senhaTemp: string | undefined;
  let reaproveitouUser = false;

  const existing = await findClerkUserByEmail(email).catch(() => null);
  if (existing) {
    clerkUserId = existing.id;
    reaproveitouUser = true;
  } else {
    senhaTemp = genTempPassword();
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30);
    const [firstName, ...rest] = input.nomeCorretor.trim().split(" ");
    const created = await clerkRequest<ClerkUser>("/users", "POST", {
      email_address: [email],
      username,
      password: senhaTemp,
      first_name: firstName,
      last_name: rest.join(" ") || undefined,
      skip_password_checks: true,
      skip_password_requirement: false,
    }).catch((e) => {
      throw new Error(`Falha ao criar user no Clerk: ${(e as Error).message}`);
    });
    clerkUserId = created.id;

    // Verifica email automaticamente pra liberar login
    try {
      const u = await clerkRequest<{
        email_addresses?: Array<{
          id: string;
          verification?: { status: string };
        }>;
      }>(`/users/${clerkUserId}`, "GET");
      for (const e of u.email_addresses ?? []) {
        if (e.verification?.status !== "verified") {
          await clerkRequest(`/email_addresses/${e.id}`, "PATCH", {
            verified: true,
          });
        }
      }
    } catch {
      // best-effort — login pode pedir verificação por código
    }
  }

  // 2) Cria/atualiza user no DB
  await db
    .insert(users)
    .values({
      id: clerkUserId,
      email,
      nome: input.nomeCorretor.trim(),
      telefone: input.telefoneCorretor.trim() || null,
      role: "imobiliaria",
      onboardingStatus: "documentos_enviados",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        nome: input.nomeCorretor.trim(),
        telefone: input.telefoneCorretor.trim() || null,
        // Se já existia com outro role, não sobrescreve
        isActive: true,
        updatedAt: new Date(),
      },
    });

  // 3) Cria imobiliária vinculada ao comercial
  const cnpjDigits = input.cnpj.replace(/\D/g, "");
  const [imob] = await db
    .insert(imobiliarias)
    .values({
      ownerUserId: clerkUserId,
      comercialId: comercial.id,
      razaoSocial: input.razaoSocial.trim(),
      nomeFantasia: input.nomeFantasia?.trim() || null,
      cnpj: cnpjDigits,
      creciResponsavel: input.creci?.trim() || null,
      telefone: input.telefoneCorretor.trim() || null,
      cep: input.cep?.replace(/\D/g, "") || null,
      endereco: input.endereco?.trim() || null,
      cidade: input.cidade?.trim() || null,
      uf: input.uf?.trim().toUpperCase().slice(0, 2) || null,
    })
    .returning({ id: imobiliarias.id });

  // 4) Marca placeholders de documentos pra imob completar depois
  await db.insert(documentos).values([
    {
      userId: clerkUserId,
      tipo: "contrato_social",
      url: "pendente",
      nomeOriginal: "pendente",
    },
    {
      userId: clerkUserId,
      tipo: "comprovante_endereco",
      url: "pendente",
      nomeOriginal: "pendente",
    },
  ]).catch(() => {
    // se já existir, ignora
  });

  await audit({
    action: "imobiliaria_cadastrada_express",
    targetType: "imobiliaria",
    targetId: imob.id,
    targetLabel: input.razaoSocial.trim(),
    metadata: {
      comercialId: comercial.id,
      corretorEmail: email,
      reaproveitouUser,
    },
  });

  // 5) Monta mensagem WhatsApp e link
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const loginUrl = `${siteUrl}/entrar`;
  const tel = input.telefoneCorretor.replace(/\D/g, "");
  const telWa = tel.startsWith("55") ? tel : `55${tel}`;
  const msg = reaproveitouUser
    ? `Oi ${input.nomeCorretor.split(" ")[0]}! Vinculei a ${input.razaoSocial} à minha carteira na Antecipaqui. Quando quiser antecipar uma comissão, é só entrar em ${loginUrl} com seu email habitual. Qualquer dúvida, tô aqui.`
    : `Oi ${input.nomeCorretor.split(" ")[0]}! Cadastrei a ${input.razaoSocial} na Antecipaqui — plataforma de antecipação de comissão imobiliária. Acesse ${loginUrl} com:\n\n📧 ${email}\n🔑 ${senhaTemp}\n\nNo primeiro login, recomendo trocar a senha. Quando quiser antecipar uma comissão, é só me chamar.`;
  const whatsappLink = tel
    ? `https://wa.me/${telWa}?text=${encodeURIComponent(msg)}`
    : undefined;

  revalidatePath("/painel");
  revalidatePath("/painel/cadastrar-imob");

  return {
    ok: true,
    imobiliariaId: imob.id,
    userId: clerkUserId,
    email,
    senhaTemp,
    whatsappLink,
    reaproveitouUser,
  };
}
