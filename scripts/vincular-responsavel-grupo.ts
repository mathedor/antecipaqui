/**
 * Vincula o responsável real ao grupo IMÓVEIS DE PRIMEIRA, substituindo o
 * owner placeholder criado em `cadastrar-grupo-imoveis-primeira.ts`.
 *
 * A conta é criada no Clerk COM SENHA TEMPORÁRIA e e-mail já verificado —
 * mesmo caminho de `addMembroImob`. Não dispara convite nem e-mail: quem
 * repassa a credencial é o dono da plataforma, por WhatsApp.
 *
 * Repontamento: `imobiliarias.owner_user_id` e `documentos.user_id` de todas
 * as unidades do grupo passam do placeholder pro user novo, e o placeholder
 * é removido. Idempotente — se já vinculou, só reporta.
 *
 * Pra rodar (PRODUÇÃO):
 *   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- \
 *     | sed 's#/neondb?#/antecipaqui_prod?#') \
 *     CLERK_SECRET_KEY=... npx tsx scripts/vincular-responsavel-grupo.ts
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { documentos, imobiliarias, users } from "../src/db/schema";

const PLACEHOLDER_ID = "pendente_grupo_ip_gestao";

const RESPONSAVEL = {
  nome: "Waldir Chinasso",
  email: "chinasso.corretor@gmail.com",
  telefone: "4130685353",
};

const CLERK_API = "https://api.clerk.com/v1";

async function clerk<T = unknown>(
  rota: string,
  metodo: string,
  corpo?: unknown,
): Promise<T> {
  const chave = process.env.CLERK_SECRET_KEY;
  if (!chave) throw new Error("CLERK_SECRET_KEY não configurada");
  const res = await fetch(`${CLERK_API}${rota}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (!res.ok) {
    throw new Error(`Clerk ${metodo} ${rota} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function senhaTemporaria(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let s = "";
  for (let i = 0; i < 14; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

type ClerkUser = {
  id: string;
  email_addresses?: Array<{ id: string; verification?: { status: string } }>;
};

/** Acha no Clerk pelo e-mail; cria com senha temporária se não existir. */
async function garantirContaClerk(): Promise<{
  clerkId: string;
  senha: string | null;
}> {
  const achados = await clerk<ClerkUser[]>(
    `/users?email_address=${encodeURIComponent(RESPONSAVEL.email)}`,
    "GET",
  );
  if (achados.length > 0) {
    console.log(`  · conta Clerk já existia (${achados[0].id})`);
    return { clerkId: achados[0].id, senha: null };
  }

  const senha = senhaTemporaria();
  const [primeiro, ...resto] = RESPONSAVEL.nome.trim().split(" ");
  const criado = await clerk<ClerkUser>("/users", "POST", {
    email_address: [RESPONSAVEL.email],
    username: RESPONSAVEL.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30),
    password: senha,
    first_name: primeiro,
    last_name: resto.join(" ") || undefined,
    skip_password_checks: true,
  });

  // Verifica o e-mail pra liberar o login imediato (sem mandar mensagem).
  const detalhe = await clerk<ClerkUser>(`/users/${criado.id}`, "GET");
  for (const e of detalhe.email_addresses ?? []) {
    if (e.verification?.status !== "verified") {
      await clerk(`/email_addresses/${e.id}`, "PATCH", { verified: true });
    }
  }
  console.log(`  ✓ conta Clerk criada (${criado.id}) — nenhum e-mail disparado`);
  return { clerkId: criado.id, senha };
}

async function main() {
  console.log("🔗 Vinculando responsável ao grupo Imóveis de Primeira\n");

  const { clerkId, senha } = await garantirContaClerk();

  // Row em `users` — pode já existir (por id ou por e-mail).
  const [porEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, RESPONSAVEL.email))
    .limit(1);

  if (porEmail && porEmail.id !== clerkId) {
    throw new Error(
      `Já existe user no DB com esse e-mail e id diferente (${porEmail.id} vs ${clerkId}). Resolver manualmente.`,
    );
  }

  await db
    .insert(users)
    .values({
      id: clerkId,
      email: RESPONSAVEL.email,
      nome: RESPONSAVEL.nome,
      telefone: RESPONSAVEL.telefone,
      role: "imobiliaria",
      onboardingStatus: "documentos_enviados",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: RESPONSAVEL.email,
        nome: RESPONSAVEL.nome,
        telefone: RESPONSAVEL.telefone,
        role: "imobiliaria",
        isActive: true,
        updatedAt: new Date(),
      },
    });
  console.log(`  ✓ user no DB pronto (${clerkId})`);

  // Reponta as unidades e os documentos do placeholder pro responsável.
  const unidades = await db
    .update(imobiliarias)
    .set({ ownerUserId: clerkId, updatedAt: new Date() })
    .where(eq(imobiliarias.ownerUserId, PLACEHOLDER_ID))
    .returning({ apelido: imobiliarias.apelido });
  console.log(`  ✓ ${unidades.length} unidade(s) repontada(s)`);

  const docs = await db
    .update(documentos)
    .set({ userId: clerkId })
    .where(eq(documentos.userId, PLACEHOLDER_ID))
    .returning({ id: documentos.id });
  console.log(`  ✓ ${docs.length} documento(s) repontado(s)`);

  // Placeholder não serve mais — some sem levar nada junto (já não é
  // referenciado por nenhuma unidade nem documento).
  const removido = await db
    .delete(users)
    .where(eq(users.id, PLACEHOLDER_ID))
    .returning({ id: users.id });
  if (removido.length > 0) console.log("  ✓ owner placeholder removido");

  // Conferência
  const grupo = await db
    .select({
      apelido: imobiliarias.apelido,
      razaoSocial: imobiliarias.razaoSocial,
      cnpj: imobiliarias.cnpj,
      matrizId: imobiliarias.matrizId,
    })
    .from(imobiliarias)
    .where(eq(imobiliarias.ownerUserId, clerkId))
    .orderBy(imobiliarias.matrizId, imobiliarias.razaoSocial);

  console.log(`\n📋 Grupo sob ${RESPONSAVEL.nome} (${RESPONSAVEL.email}):`);
  for (const g of grupo) {
    console.log(
      `   [${g.matrizId === null ? "MATRIZ" : "filial"}] ${g.apelido} — ${g.cnpj}`,
    );
  }

  if (senha) {
    console.log("\n🔑 CREDENCIAL DE PRIMEIRO ACESSO (repassar por WhatsApp):");
    console.log(`   e-mail: ${RESPONSAVEL.email}`);
    console.log(`   senha:  ${senha}`);
    console.log("   (trocar a senha no primeiro login, em Meus dados)");
  } else {
    console.log("\n🔑 A conta já existia no Clerk — usar a senha habitual.");
  }
  console.log("\n✅ Pronto.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\n❌ Erro:", e.message ?? e);
    process.exit(1);
  });
