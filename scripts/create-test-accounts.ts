/**
 * Cria contas de teste de TODOS os roles via Clerk API + popula o DB com
 * dados de empresa/comercial/fundo, deixando todas prontas pra logar.
 *
 * Roles cobertos: corretor, imobiliaria, construtora, fundo, comercial.
 * (admin já é auto-promovido via ADMIN_EMAILS no env — não precisa criar aqui.)
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
  comerciais,
  construtoras,
  documentos,
  fundos,
  imobiliarias,
  users,
} from "../src/db/schema";

if (!process.env.CLERK_SECRET_KEY)
  throw new Error("CLERK_SECRET_KEY não setada no env");

const CLERK_API = "https://api.clerk.com/v1";
const PASSWORD = "***REDACTED***";

type Role = "corretor" | "imobiliaria" | "construtora" | "fundo" | "comercial";

type AccountSpec = {
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
  /** Razão social / nome da empresa ou nome do comercial. */
  empresaNome: string;
  empresaApelido?: string;
  cnpj: string;
  telefone: string;
  cep: string;
  endereco: string;
  cidade: string;
  uf: string;
};

export const TEST_ACCOUNTS: AccountSpec[] = [
  {
    role: "corretor",
    email: "mathe+corretor-teste@diretoriow.com.br",
    firstName: "Carlos",
    lastName: "Andrade (Corretor Teste)",
    empresaNome: "Carlos Andrade Imóveis ME",
    empresaApelido: "Carlos Corretor",
    cnpj: "00777888000199",
    telefone: "11955554444",
    cep: "01419002",
    endereco: "Rua Augusta, 100",
    cidade: "São Paulo",
    uf: "SP",
  },
  {
    role: "imobiliaria",
    email: "mathe+imob-teste@diretoriow.com.br",
    firstName: "Maria",
    lastName: "Silva (Imob Teste)",
    empresaNome: "Imobiliária Teste Antecipaqui Ltda",
    empresaApelido: "Imob Teste",
    cnpj: "00111222000133",
    telefone: "11987654321",
    cep: "01310100",
    endereco: "Av. Paulista, 1000",
    cidade: "São Paulo",
    uf: "SP",
  },
  {
    role: "construtora",
    email: "mathe+construtora-teste@diretoriow.com.br",
    firstName: "Roberto",
    lastName: "Pereira (Construtora Teste)",
    empresaNome: "Construtora Teste Antecipaqui S/A",
    empresaApelido: "Constru Teste",
    cnpj: "00444555000166",
    telefone: "11912345678",
    cep: "04538132",
    endereco: "Av. Brigadeiro Faria Lima, 3000",
    cidade: "São Paulo",
    uf: "SP",
  },
  {
    role: "fundo",
    email: "mathe+fundo-teste@diretoriow.com.br",
    firstName: "Patrícia",
    lastName: "Lima (Fundo Teste)",
    empresaNome: "Fundo Teste Antecipa Ltda",
    empresaApelido: "Fundo Teste",
    cnpj: "00999888000177",
    telefone: "11977776666",
    cep: "04543907",
    endereco: "Av. Pres. Juscelino Kubitschek, 2041",
    cidade: "São Paulo",
    uf: "SP",
  },
  {
    role: "comercial",
    email: "mathe+comercial-teste@diretoriow.com.br",
    firstName: "Lucas",
    lastName: "Oliveira (Comercial Teste)",
    empresaNome: "Lucas Oliveira",
    empresaApelido: "Lucas Comercial",
    cnpj: "12345678901", // CPF (PF) — 11 dígitos
    telefone: "11933332222",
    cep: "04094050",
    endereco: "Av. Ibirapuera, 2000",
    cidade: "São Paulo",
    uf: "SP",
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
  const u = (await clerkRequest(`/users/${userId}`, "GET")) as {
    email_addresses?: Array<{ id: string; verification?: { status: string } }>;
  };
  for (const e of u.email_addresses ?? []) {
    if (e.verification?.status === "verified") continue;
    try {
      await clerkRequest(`/email_addresses/${e.id}`, "PATCH", {
        verified: true,
      });
    } catch (err) {
      console.warn("  ⚠ falhou ao verificar email:", (err as Error).message);
    }
  }
}

async function createOrGetClerkUser(spec: AccountSpec) {
  const existing = await findClerkUserByEmail(spec.email);
  if (existing) {
    const u = existing as { id: string };
    await markPrimaryEmailVerified(u.id);
    return u;
  }
  const username = spec.email.split("@")[0].replace(/\+/g, "_");
  const created = (await clerkRequest("/users", "POST", {
    email_address: [spec.email],
    username,
    password: PASSWORD,
    first_name: spec.firstName,
    last_name: spec.lastName,
    skip_password_checks: true,
    skip_password_requirement: false,
    public_metadata:
      spec.role === "fundo" || spec.role === "comercial"
        ? { role: spec.role }
        : undefined,
  })) as { id: string };
  await markPrimaryEmailVerified(created.id);
  return created;
}

async function syncUserDb(userId: string, spec: AccountSpec) {
  const fullName = `${spec.firstName} ${spec.lastName}`;
  await db
    .insert(users)
    .values({
      id: userId,
      email: spec.email,
      nome: fullName,
      telefone: spec.telefone,
      role: spec.role,
      onboardingStatus: "aprovado",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: spec.email,
        nome: fullName,
        telefone: spec.telefone,
        role: spec.role,
        onboardingStatus: "aprovado",
        isActive: true,
        updatedAt: new Date(),
      },
    });
}

async function ensureImobiliaria(userId: string, spec: AccountSpec) {
  const existing = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.ownerUserId, userId))
    .limit(1);
  const values = {
    ownerUserId: userId,
    razaoSocial: spec.empresaNome,
    nomeFantasia: spec.empresaApelido ?? null,
    cnpj: spec.cnpj,
    creciResponsavel: "J-12345",
    telefone: spec.telefone,
    cep: spec.cep,
    endereco: spec.endereco,
    cidade: spec.cidade,
    uf: spec.uf,
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

  const existingDocs = await db
    .select({ tipo: documentos.tipo })
    .from(documentos)
    .where(eq(documentos.userId, userId));
  const tipos = new Set(existingDocs.map((d) => d.tipo));
  const novos = [];
  if (!tipos.has("contrato_social")) {
    novos.push({
      tipo: "contrato_social" as const,
      url: "https://seed.antecipaqui.test/contrato_social.pdf",
      nomeOriginal: "contrato_social.pdf",
      userId,
    });
  }
  if (!tipos.has("comprovante_endereco")) {
    novos.push({
      tipo: "comprovante_endereco" as const,
      url: "https://seed.antecipaqui.test/comprovante.pdf",
      nomeOriginal: "comprovante_endereco.pdf",
      userId,
    });
  }
  if (novos.length > 0) await db.insert(documentos).values(novos);
}

async function ensureConstrutora(userId: string, spec: AccountSpec) {
  const existing = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.cnpj, spec.cnpj))
    .limit(1);
  const baseValues = {
    ownerUserId: userId,
    razaoSocial: spec.empresaNome,
    nomeFantasia: spec.empresaApelido ?? null,
    cnpj: spec.cnpj,
    telefone: spec.telefone,
    email: spec.email,
    cep: spec.cep,
    endereco: spec.endereco,
    cidade: spec.cidade,
    uf: spec.uf,
    onboardingStatus: "aprovado" as const,
    isActive: true,
  };
  if (existing[0]) {
    await db
      .update(construtoras)
      .set({ ...baseValues, updatedAt: new Date() })
      .where(eq(construtoras.id, existing[0].id));
  } else {
    await db.insert(construtoras).values(baseValues);
  }
}

async function ensureFundo(userId: string, spec: AccountSpec) {
  const existing = await db
    .select()
    .from(fundos)
    .where(eq(fundos.cnpj, spec.cnpj))
    .limit(1);
  const baseValues = {
    ownerUserId: userId,
    razaoSocial: spec.empresaNome,
    nomeFantasia: spec.empresaApelido ?? null,
    cnpj: spec.cnpj,
    telefone: spec.telefone,
    contatoResponsavel: `${spec.firstName} ${spec.lastName}`,
    emailComercial: spec.email,
    emailAssinatura: spec.email,
    cep: spec.cep,
    endereco: spec.endereco,
    cidade: spec.cidade,
    uf: spec.uf,
    isActive: true,
  };
  if (existing[0]) {
    await db
      .update(fundos)
      .set({ ...baseValues, updatedAt: new Date() })
      .where(eq(fundos.id, existing[0].id));
  } else {
    await db.insert(fundos).values(baseValues);
  }
}

async function ensureComercial(userId: string, spec: AccountSpec) {
  const existing = await db
    .select()
    .from(comerciais)
    .where(eq(comerciais.documento, spec.cnpj))
    .limit(1);
  const baseValues = {
    ownerUserId: userId,
    tipoPessoa: spec.cnpj.length === 11 ? ("PF" as const) : ("PJ" as const),
    nomeCompleto: `${spec.firstName} ${spec.lastName}`,
    apelido: spec.empresaApelido ?? null,
    documento: spec.cnpj,
    email: spec.email,
    telefone: spec.telefone,
    cep: spec.cep,
    endereco: spec.endereco,
    cidade: spec.cidade,
    uf: spec.uf,
    isActive: true,
  };
  if (existing[0]) {
    await db
      .update(comerciais)
      .set({ ...baseValues, updatedAt: new Date() })
      .where(eq(comerciais.id, existing[0].id));
  } else {
    await db.insert(comerciais).values(baseValues);
  }
}

async function main() {
  console.log("🌱 Criando contas de teste pra TODOS os roles...\n");

  for (const acc of TEST_ACCOUNTS) {
    console.log(`▸ ${acc.role.toUpperCase()} · ${acc.email}`);
    const clerkUser = await createOrGetClerkUser(acc);
    const userId = clerkUser.id;
    await syncUserDb(userId, acc);

    switch (acc.role) {
      case "corretor":
      case "imobiliaria":
        await ensureImobiliaria(userId, acc);
        break;
      case "construtora":
        await ensureConstrutora(userId, acc);
        break;
      case "fundo":
        await ensureFundo(userId, acc);
        break;
      case "comercial":
        await ensureComercial(userId, acc);
        break;
    }
    console.log(`  ✓ DB ok (${acc.role})\n`);
  }

  console.log("═══════════════════════════════════════════");
  console.log("CONTAS DE TESTE PRONTAS — login em /entrar");
  console.log("═══════════════════════════════════════════");
  console.log(`\nSenha padrão de todas: ${PASSWORD}\n`);
  for (const acc of TEST_ACCOUNTS) {
    console.log(`▸ ${acc.role.padEnd(12)} · ${acc.email}`);
  }
  console.log();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error("❌", e);
    process.exit(1);
  });
}
