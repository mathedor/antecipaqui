/**
 * Cria 2 contas de teste (imobiliária + construtora) via Clerk API +
 * popula o DB com os dados de empresa, deixando ambas prontas pra logar.
 *
 * Uso: set -a && source .env.local && set +a && npx tsx scripts/create-test-accounts.ts
 *
 * Seguro re-rodar — se o email já existir no Clerk, ignora a criação
 * mas garante que o DB tem os dados.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  construtoras,
  documentos,
  imobiliarias,
  users,
} from "../src/db/schema";

if (!process.env.CLERK_SECRET_KEY)
  throw new Error("CLERK_SECRET_KEY não setada no env");

const CLERK_API = "https://api.clerk.com/v1";

type AccountSpec = {
  role: "imobiliaria" | "construtora";
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  empresa: {
    razaoSocial: string;
    nomeFantasia: string | null;
    cnpj: string;
    telefone: string;
    cep: string;
    endereco: string;
    cidade: string;
    uf: string;
  };
};

const ACCOUNTS: AccountSpec[] = [
  {
    role: "imobiliaria",
    email: "mathe+imob-teste@diretoriow.com.br",
    password: "***REDACTED***",
    firstName: "Maria",
    lastName: "Silva (Imob Teste)",
    empresa: {
      razaoSocial: "Imobiliária Teste Antecipaqui Ltda",
      nomeFantasia: "Imob Teste",
      cnpj: "00111222000133",
      telefone: "11987654321",
      cep: "01310100",
      endereco: "Av. Paulista, 1000",
      cidade: "São Paulo",
      uf: "SP",
    },
  },
  {
    role: "construtora",
    email: "mathe+construtora-teste@diretoriow.com.br",
    password: "***REDACTED***",
    firstName: "Roberto",
    lastName: "Pereira (Construtora Teste)",
    empresa: {
      razaoSocial: "Construtora Teste Antecipaqui S/A",
      nomeFantasia: "Constru Teste",
      cnpj: "00444555000166",
      telefone: "11912345678",
      cep: "04538132",
      endereco: "Av. Brigadeiro Faria Lima, 3000",
      cidade: "São Paulo",
      uf: "SP",
    },
  },
];

async function clerkRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Clerk ${method} ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

async function findClerkUserByEmail(email: string) {
  const list = await clerkRequest(
    `/users?email_address=${encodeURIComponent(email)}`,
    "GET",
  );
  if (Array.isArray(list) && list.length > 0) return list[0];
  if (list && typeof list === "object" && "data" in list) {
    const d = (list as { data: unknown[] }).data;
    if (Array.isArray(d) && d.length > 0) return d[0];
  }
  return null;
}

async function markPrimaryEmailVerified(userId: string) {
  // Lista email addresses do user e marca todos como verified
  const u = (await clerkRequest(`/users/${userId}`, "GET")) as {
    email_addresses?: Array<{ id: string; verification?: { status: string } }>;
  };
  for (const e of u.email_addresses ?? []) {
    if (e.verification?.status === "verified") continue;
    try {
      await clerkRequest(`/email_addresses/${e.id}`, "PATCH", {
        verified: true,
      });
      console.log(`  ✓ email ${e.id.slice(0, 12)}… marcado como verificado`);
    } catch (err) {
      console.warn("  ⚠ falhou ao verificar email:", (err as Error).message);
    }
  }
}

async function createOrGetClerkUser(spec: AccountSpec) {
  const existing = await findClerkUserByEmail(spec.email);
  if (existing) {
    console.log(`  ↳ Clerk: user já existe (${spec.email})`);
    const u = existing as { id: string };
    await markPrimaryEmailVerified(u.id);
    return u;
  }
  // Username gerado a partir do email (parte antes do @, sem +)
  const username = spec.email.split("@")[0].replace(/\+/g, "_");
  console.log(`  ↳ Clerk: criando user ${spec.email} (user ${username})`);
  const created = (await clerkRequest("/users", "POST", {
    email_address: [spec.email],
    username,
    password: spec.password,
    first_name: spec.firstName,
    last_name: spec.lastName,
    skip_password_checks: true,
    skip_password_requirement: false,
  })) as { id: string };
  await markPrimaryEmailVerified(created.id);
  return created;
}

async function main() {
  console.log("🌱 Criando contas de teste...\n");

  for (const acc of ACCOUNTS) {
    console.log(`▸ ${acc.role.toUpperCase()} · ${acc.email}`);
    const clerkUser = await createOrGetClerkUser(acc);
    const userId = clerkUser.id;
    const fullName = `${acc.firstName} ${acc.lastName}`;

    // Insere/atualiza row na nossa tabela users
    await db
      .insert(users)
      .values({
        id: userId,
        email: acc.email,
        nome: fullName,
        telefone: acc.empresa.telefone,
        role: acc.role,
        onboardingStatus: "aprovado",
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: acc.email,
          nome: fullName,
          telefone: acc.empresa.telefone,
          role: acc.role,
          onboardingStatus: "aprovado",
          isActive: true,
          updatedAt: new Date(),
        },
      });

    if (acc.role === "imobiliaria") {
      // Cria/atualiza imobiliária
      const existing = await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.ownerUserId, userId))
        .limit(1);
      const values = {
        ownerUserId: userId,
        razaoSocial: acc.empresa.razaoSocial,
        nomeFantasia: acc.empresa.nomeFantasia,
        cnpj: acc.empresa.cnpj,
        creciResponsavel: "J-12345",
        telefone: acc.empresa.telefone,
        cep: acc.empresa.cep,
        endereco: acc.empresa.endereco,
        cidade: acc.empresa.cidade,
        uf: acc.empresa.uf,
        bancoNome: "Itaú",
        bancoCodigo: "341",
        bancoAgencia: "0001",
        bancoConta: "12345-6",
      };
      if (existing[0]) {
        await db
          .update(imobiliarias)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(imobiliarias.id, existing[0].id));
      } else {
        await db.insert(imobiliarias).values(values);
      }

      // Documentos KYC já enviados (URLs fake) pra ele poder operar
      const existingDocs = await db
        .select({ tipo: documentos.tipo })
        .from(documentos)
        .where(eq(documentos.userId, userId));
      const tipos = new Set(existingDocs.map((d) => d.tipo));
      const novos = [];
      if (!tipos.has("contrato_social")) {
        novos.push({
          tipo: "contrato_social" as const,
          url: "https://seed.antecipaqui.test/contrato_social_imob.pdf",
          nomeOriginal: "contrato_social.pdf",
          userId,
        });
      }
      if (!tipos.has("comprovante_endereco")) {
        novos.push({
          tipo: "comprovante_endereco" as const,
          url: "https://seed.antecipaqui.test/comprovante_imob.pdf",
          nomeOriginal: "comprovante_endereco.pdf",
          userId,
        });
      }
      if (novos.length > 0) await db.insert(documentos).values(novos);
    } else {
      // Construtora: cria a row + linka ownerUserId
      const existingByCnpj = await db
        .select()
        .from(construtoras)
        .where(eq(construtoras.cnpj, acc.empresa.cnpj))
        .limit(1);
      const baseValues = {
        ownerUserId: userId,
        razaoSocial: acc.empresa.razaoSocial,
        nomeFantasia: acc.empresa.nomeFantasia,
        cnpj: acc.empresa.cnpj,
        telefone: acc.empresa.telefone,
        email: acc.email,
        cep: acc.empresa.cep,
        endereco: acc.empresa.endereco,
        cidade: acc.empresa.cidade,
        uf: acc.empresa.uf,
        onboardingStatus: "aprovado" as const,
        isActive: true,
      };
      if (existingByCnpj[0]) {
        await db
          .update(construtoras)
          .set({ ...baseValues, updatedAt: new Date() })
          .where(eq(construtoras.id, existingByCnpj[0].id));
      } else {
        await db.insert(construtoras).values(baseValues);
      }
    }
    console.log(`  ✓ DB ok (${acc.role})\n`);
  }

  console.log("═══════════════════════════════════════════");
  console.log("CONTAS DE TESTE PRONTAS — login em /entrar");
  console.log("═══════════════════════════════════════════");
  for (const acc of ACCOUNTS) {
    console.log(`\n▸ ${acc.role.toUpperCase()}`);
    console.log(`  Email: ${acc.email}`);
    console.log(`  Senha: ${acc.password}`);
    console.log(`  Empresa: ${acc.empresa.razaoSocial}`);
  }
  console.log();
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
