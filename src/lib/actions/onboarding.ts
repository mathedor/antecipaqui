"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, imobiliarias, construtoras } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";

type Role = "corretor" | "imobiliaria" | "construtora";

const VALID_ROLES: Role[] = ["corretor", "imobiliaria", "construtora"];

export async function selectRoleAction(formData: FormData) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const role = String(formData.get("role")) as Role;
  if (!VALID_ROLES.includes(role)) {
    throw new Error("Tipo de cadastro inválido");
  }

  await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/painel");
  redirect("/painel/onboarding/dados");
}

export type SaveCompanyState =
  | { ok: false; error: string }
  | { ok: true; redirectTo: string }
  | null;

export async function saveCompanyDataAction(
  _prev: SaveCompanyState,
  formData: FormData,
): Promise<SaveCompanyState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };

  const nome = String(formData.get("nome") || "").trim();
  const telefone = String(formData.get("telefone") || "").trim();
  const razaoSocial = String(formData.get("razaoSocial") || "").trim();
  const nomeFantasia =
    String(formData.get("nomeFantasia") || "").trim() || null;
  const cnpjRaw = String(formData.get("cnpj") || "");
  const cnpj = unmaskCNPJ(cnpjRaw);
  const cep = String(formData.get("cep") || "").trim();
  const endereco = String(formData.get("endereco") || "").trim();
  const cidade = String(formData.get("cidade") || "").trim();
  const uf = String(formData.get("uf") || "").trim().toUpperCase();
  const creci = String(formData.get("creci") || "").trim() || null;
  const emailEmpresa = String(formData.get("email") || "").trim() || null;

  // Validações
  if (!nome) return { ok: false, error: "Nome é obrigatório" };
  if (!razaoSocial) return { ok: false, error: "Razão social é obrigatória" };
  if (!isValidCNPJ(cnpj)) return { ok: false, error: "CNPJ inválido" };
  if (!cep || cep.replace(/\D/g, "").length !== 8) {
    return { ok: false, error: "CEP inválido" };
  }
  if (!endereco) return { ok: false, error: "Endereço é obrigatório" };
  if (!cidade) return { ok: false, error: "Cidade é obrigatória" };
  if (uf.length !== 2) return { ok: false, error: "UF inválida" };
  if (!telefone) return { ok: false, error: "Telefone é obrigatório" };

  // Atualiza dados do usuário
  await db
    .update(users)
    .set({
      nome,
      telefone,
      onboardingStatus: "documentos_enviados",
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  // Cria empresa de acordo com role
  if (user.role === "imobiliaria" || user.role === "corretor") {
    await db
      .insert(imobiliarias)
      .values({
        ownerUserId: user.id,
        razaoSocial,
        nomeFantasia,
        cnpj,
        creciResponsavel: creci,
        telefone,
        cep,
        endereco,
        cidade,
        uf,
      })
      .onConflictDoNothing();
  } else if (user.role === "construtora") {
    await db
      .insert(construtoras)
      .values({
        ownerUserId: user.id,
        razaoSocial,
        nomeFantasia,
        cnpj,
        telefone,
        email: emailEmpresa,
        cep,
        endereco,
        cidade,
        uf,
        onboardingStatus: "documentos_enviados",
      })
      .onConflictDoNothing();
  }

  revalidatePath("/painel");
  return { ok: true, redirectTo: "/painel" };
}
