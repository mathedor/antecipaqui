"use server";

import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  imobiliariaMembros,
  imobiliarias,
  users,
} from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import {
  capabilitiesFor,
  temEscopoDeGrupo,
  unidadeLabel,
  type ImobInternalRole,
  type ImobMembership,
  type ImobUnidade,
} from "@/lib/imobiliaria-perms";

/* ============================================================
   RESOLVER membership do user atual
   ============================================================ */

/** Carrega as unidades do grupo econômico a partir do ID da matriz.
 *  Retorna a matriz primeiro, depois as filiais em ordem alfabética. */
async function listUnidadesDoGrupo(matrizId: string): Promise<ImobUnidade[]> {
  const rows = await db
    .select({
      id: imobiliarias.id,
      razaoSocial: imobiliarias.razaoSocial,
      nomeFantasia: imobiliarias.nomeFantasia,
      apelido: imobiliarias.apelido,
      cnpj: imobiliarias.cnpj,
      cidade: imobiliarias.cidade,
      uf: imobiliarias.uf,
      matrizId: imobiliarias.matrizId,
      operaEmNomeDaMatriz: imobiliarias.operaEmNomeDaMatriz,
      isActive: imobiliarias.isActive,
    })
    .from(imobiliarias)
    .where(
      sql`${imobiliarias.id} = ${matrizId}::uuid OR ${imobiliarias.matrizId} = ${matrizId}::uuid`,
    )
    .orderBy(asc(imobiliarias.matrizId), asc(imobiliarias.razaoSocial));

  return rows.map((r) => ({
    id: r.id,
    razaoSocial: r.razaoSocial,
    nomeFantasia: r.nomeFantasia,
    apelido: r.apelido,
    cnpj: r.cnpj,
    cidade: r.cidade,
    uf: r.uf,
    isMatriz: r.matrizId === null,
    operaEmNomeDaMatriz: r.operaEmNomeDaMatriz,
    isActive: r.isActive,
  }));
}

/** Monta o bloco de grupo econômico do membership a partir da unidade de
 *  lotação do user e do role interno dele. */
async function buildGrupo(args: {
  unidadeId: string;
  unidadeMatrizId: string | null;
  role: ImobInternalRole;
}): Promise<
  Pick<
    ImobMembership,
    "matrizId" | "isMatriz" | "possuiFiliais" | "unidades" | "scopeImobIds"
  >
> {
  const isMatriz = args.unidadeMatrizId === null;
  const matrizId = args.unidadeMatrizId ?? args.unidadeId;

  // Quem é da matriz (owner/gerente/financeiro) enxerga o grupo todo.
  // Todo o resto enxerga só a própria unidade de lotação.
  const escopoGrupo = temEscopoDeGrupo(args.role, isMatriz);

  const todas = escopoGrupo
    ? await listUnidadesDoGrupo(matrizId)
    : await listUnidadesDoGrupo(matrizId).then((us) =>
        us.filter((u) => u.id === args.unidadeId),
      );

  const [matrizRow] = await db
    .select({ possuiFiliais: imobiliarias.possuiFiliais })
    .from(imobiliarias)
    .where(eq(imobiliarias.id, matrizId))
    .limit(1);

  return {
    matrizId,
    isMatriz,
    possuiFiliais: matrizRow?.possuiFiliais ?? false,
    unidades: todas,
    scopeImobIds: todas.map((u) => u.id),
  };
}

/** Resolve qual imobiliária + role interno o user logado tem.
 *  Procura primeiro como owner; se não, como membro ativo.
 *  Retorna null se user não está vinculado a nenhuma imob.
 *
 *  Num grupo econômico o owner é dono da matriz E das filiais (o cadastro
 *  é um só) — por isso a busca de owner prioriza a MATRIZ (matriz_id NULL). */
export async function getCurrentImobMembership(): Promise<
  ImobMembership | null
> {
  const user = await requireActiveUser();
  if (user.role !== "imobiliaria" && user.role !== "corretor") return null;

  // 1) Owner check — matriz primeiro (nulls first em asc no Postgres seria
  //    last, então ordenamos por um flag explícito).
  const [owned] = await db
    .select({
      id: imobiliarias.id,
      razaoSocial: imobiliarias.razaoSocial,
      matrizId: imobiliarias.matrizId,
    })
    .from(imobiliarias)
    .where(eq(imobiliarias.ownerUserId, user.id))
    .orderBy(sql`(${imobiliarias.matrizId} IS NOT NULL)`)
    .limit(1);
  if (owned) {
    return {
      imobiliariaId: owned.id,
      imobiliariaRazaoSocial: owned.razaoSocial,
      roleInterna: "owner",
      ...(await buildGrupo({
        unidadeId: owned.id,
        unidadeMatrizId: owned.matrizId,
        role: "owner",
      })),
      ...capabilitiesFor("owner", { isMatriz: owned.matrizId === null }),
    };
  }

  // 2) Member check
  const [mem] = await db
    .select({
      imobiliariaId: imobiliariaMembros.imobiliariaId,
      roleInterna: imobiliariaMembros.roleInterna,
      razaoSocial: imobiliarias.razaoSocial,
      matrizId: imobiliarias.matrizId,
    })
    .from(imobiliariaMembros)
    .innerJoin(
      imobiliarias,
      eq(imobiliarias.id, imobiliariaMembros.imobiliariaId),
    )
    .where(
      and(
        eq(imobiliariaMembros.userId, user.id),
        isNull(imobiliariaMembros.removedAt),
      ),
    )
    .limit(1);
  if (mem) {
    const role = mem.roleInterna as ImobInternalRole;
    return {
      imobiliariaId: mem.imobiliariaId,
      imobiliariaRazaoSocial: mem.razaoSocial,
      roleInterna: role,
      ...(await buildGrupo({
        unidadeId: mem.imobiliariaId,
        unidadeMatrizId: mem.matrizId,
        role,
      })),
      ...capabilitiesFor(role, { isMatriz: mem.matrizId === null }),
    };
  }

  return null;
}

/* ============================================================
   LISTAR membros da imob (owner + ativos)
   ============================================================ */

export type MembroLista = {
  id: string | null; // null = é o owner (não tem registro em imobiliaria_membros)
  userId: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  roleInterna: ImobInternalRole;
  isOwner: boolean;
  addedAt: string | null;
  /** Unidade de lotação — matriz ou filial do grupo. */
  imobiliariaId: string;
  unidadeNome: string;
};

export async function listMembrosDaImob(): Promise<MembroLista[]> {
  const me = await getCurrentImobMembership();
  if (!me) throw new Error("Sem vínculo com imobiliária");

  const nomeDaUnidade = (id: string) => {
    const u = me.unidades.find((x) => x.id === id);
    return u ? unidadeLabel(u) : "—";
  };

  // Owner via imobiliarias.ownerUserId (sempre lotado na matriz do grupo)
  const [imob] = await db
    .select({
      ownerUserId: imobiliarias.ownerUserId,
    })
    .from(imobiliarias)
    .where(eq(imobiliarias.id, me.matrizId))
    .limit(1);

  const result: MembroLista[] = [];

  if (imob?.ownerUserId) {
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        nome: users.nome,
        telefone: users.telefone,
      })
      .from(users)
      .where(eq(users.id, imob.ownerUserId))
      .limit(1);
    if (u) {
      result.push({
        id: null,
        userId: u.id,
        email: u.email,
        nome: u.nome,
        telefone: u.telefone,
        roleInterna: "owner",
        isOwner: true,
        addedAt: null,
        imobiliariaId: me.matrizId,
        unidadeNome: nomeDaUnidade(me.matrizId),
      });
    }
  }

  // Membros ativos de TODAS as unidades no escopo do user
  const memb = await db
    .select({
      id: imobiliariaMembros.id,
      userId: imobiliariaMembros.userId,
      email: imobiliariaMembros.email,
      nome: imobiliariaMembros.nome,
      telefone: users.telefone,
      roleInterna: imobiliariaMembros.roleInterna,
      addedAt: imobiliariaMembros.createdAt,
      imobiliariaId: imobiliariaMembros.imobiliariaId,
    })
    .from(imobiliariaMembros)
    .leftJoin(users, eq(users.id, imobiliariaMembros.userId))
    .where(
      and(
        inArray(imobiliariaMembros.imobiliariaId, me.scopeImobIds),
        isNull(imobiliariaMembros.removedAt),
      ),
    )
    .orderBy(asc(imobiliariaMembros.createdAt));

  for (const m of memb) {
    result.push({
      id: m.id,
      userId: m.userId,
      email: m.email,
      nome: m.nome,
      telefone: m.telefone,
      roleInterna: m.roleInterna as ImobInternalRole,
      isOwner: false,
      addedAt: m.addedAt.toISOString(),
      imobiliariaId: m.imobiliariaId,
      unidadeNome: nomeDaUnidade(m.imobiliariaId),
    });
  }

  return result;
}

/* ============================================================
   CONVIDAR membro
   ============================================================ */

const CLERK_API = "https://api.clerk.com/v1";

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

function genTempPassword(): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let s = "";
  for (let i = 0; i < 12; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export type AddMembroResult = {
  ok: boolean;
  error?: string;
  reaproveitouUser?: boolean;
  senhaTemp?: string;
  whatsappLink?: string;
  membroId?: string;
};

export async function addMembroImob(input: {
  email: string;
  nome: string;
  telefone?: string;
  roleInterna: ImobInternalRole;
  /** Unidade de lotação (matriz ou filial). Default = unidade do convidante. */
  imobiliariaId?: string;
}): Promise<AddMembroResult> {
  const me = await getCurrentImobMembership();
  if (!me) return { ok: false, error: "Sem vínculo com imobiliária" };
  if (!me.canManageMembros)
    return { ok: false, error: "Apenas o owner pode gerenciar membros" };
  if (input.roleInterna === "owner")
    return { ok: false, error: "Role owner é exclusivo do dono da imob" };

  // Unidade de lotação — precisa estar no escopo de quem convida.
  const unidadeId = input.imobiliariaId?.trim() || me.imobiliariaId;
  if (!me.scopeImobIds.includes(unidadeId))
    return { ok: false, error: "Unidade fora do seu grupo" };
  const unidade = me.unidades.find((u) => u.id === unidadeId);

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@"))
    return { ok: false, error: "Email inválido" };
  if (!input.nome.trim())
    return { ok: false, error: "Nome obrigatório" };

  // Procura ou cria user
  let userId: string;
  let reaproveitouUser = false;
  let senhaTemp: string | undefined;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing[0]) {
    userId = existing[0].id;
    reaproveitouUser = true;
  } else {
    // Cria via Clerk Backend API
    senhaTemp = genTempPassword();
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30);
    const [firstName, ...rest] = input.nome.trim().split(" ");
    let clerkId: string;
    try {
      const created = await clerkRequest<{ id: string }>("/users", "POST", {
        email_address: [email],
        username,
        password: senhaTemp,
        first_name: firstName,
        last_name: rest.join(" ") || undefined,
        skip_password_checks: true,
        skip_password_requirement: false,
      });
      clerkId = created.id;
      // Verifica email pra liberar login
      try {
        const u = await clerkRequest<{
          email_addresses?: Array<{
            id: string;
            verification?: { status: string };
          }>;
        }>(`/users/${clerkId}`, "GET");
        for (const e of u.email_addresses ?? []) {
          if (e.verification?.status !== "verified") {
            await clerkRequest(`/email_addresses/${e.id}`, "PATCH", {
              verified: true,
            });
          }
        }
      } catch {
        /* best-effort */
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    userId = clerkId;

    await db
      .insert(users)
      .values({
        id: userId,
        email,
        nome: input.nome.trim(),
        telefone: input.telefone?.replace(/\D/g, "") || null,
        role: "corretor",
        onboardingStatus: "aprovado",
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email,
          nome: input.nome.trim(),
          telefone: input.telefone?.replace(/\D/g, "") || null,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  // Vínculo (idempotente — se já existir e ativo, atualiza role)
  const [existingMem] = await db
    .select({ id: imobiliariaMembros.id, removedAt: imobiliariaMembros.removedAt })
    .from(imobiliariaMembros)
    .where(
      and(
        eq(imobiliariaMembros.imobiliariaId, unidadeId),
        eq(imobiliariaMembros.userId, userId),
      ),
    )
    .limit(1);

  let membroId: string;
  if (existingMem) {
    await db
      .update(imobiliariaMembros)
      .set({
        roleInterna: input.roleInterna,
        removedAt: null,
        email,
        nome: input.nome.trim(),
      })
      .where(eq(imobiliariaMembros.id, existingMem.id));
    membroId = existingMem.id;
  } else {
    const meUser = await requireActiveUser();
    const [created] = await db
      .insert(imobiliariaMembros)
      .values({
        imobiliariaId: unidadeId,
        userId,
        email,
        nome: input.nome.trim(),
        roleInterna: input.roleInterna,
        invitedByUserId: meUser.id,
      })
      .returning({ id: imobiliariaMembros.id });
    membroId = created.id;
  }

  // WhatsApp pronto
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const loginUrl = `${siteUrl}/entrar`;
  const tel = (input.telefone || "").replace(/\D/g, "");
  const telWa = tel.startsWith("55") ? tel : `55${tel}`;
  const nomeUnidade =
    unidade?.nomeFantasia?.trim() ||
    unidade?.razaoSocial ||
    me.imobiliariaRazaoSocial;
  const msg = reaproveitouUser
    ? `Oi ${input.nome.split(" ")[0]}! Adicionei você na equipe da ${nomeUnidade} no Antecipaqui. Entra em ${loginUrl} com seu email habitual e já vai ter acesso aos atendimentos.`
    : `Oi ${input.nome.split(" ")[0]}! Te adicionei na equipe da ${nomeUnidade} no Antecipaqui. Acesse ${loginUrl} com:\n\n📧 ${email}\n🔑 ${senhaTemp}\n\nNo primeiro login, troque a senha pelo perfil. Bem-vindo(a) ao time!`;
  const whatsappLink = tel
    ? `https://wa.me/${telWa}?text=${encodeURIComponent(msg)}`
    : undefined;

  revalidatePath("/painel/equipe");
  return {
    ok: true,
    reaproveitouUser,
    senhaTemp,
    whatsappLink,
    membroId,
  };
}

/* ============================================================
   ATUALIZAR / REMOVER membro
   ============================================================ */

export async function updateMembroRole(input: {
  membroId: string;
  roleInterna: ImobInternalRole;
}) {
  const me = await getCurrentImobMembership();
  if (!me || !me.canManageMembros)
    throw new Error("Sem permissão");
  if (input.roleInterna === "owner")
    throw new Error("Owner é exclusivo do dono da imob");

  await db
    .update(imobiliariaMembros)
    .set({ roleInterna: input.roleInterna })
    .where(
      and(
        eq(imobiliariaMembros.id, input.membroId),
        inArray(imobiliariaMembros.imobiliariaId, me.scopeImobIds),
      ),
    );
  revalidatePath("/painel/equipe");
  return { ok: true };
}

/** Transfere um membro de unidade (ex: corretor da matriz vai cuidar de uma
 *  filial). Só quem enxerga as duas pontas pode mover. */
export async function moveMembroUnidade(input: {
  membroId: string;
  imobiliariaId: string;
}) {
  const me = await getCurrentImobMembership();
  if (!me || !me.canManageMembros) throw new Error("Sem permissão");
  if (!me.scopeImobIds.includes(input.imobiliariaId))
    throw new Error("Unidade fora do seu grupo");

  await db
    .update(imobiliariaMembros)
    .set({ imobiliariaId: input.imobiliariaId })
    .where(
      and(
        eq(imobiliariaMembros.id, input.membroId),
        inArray(imobiliariaMembros.imobiliariaId, me.scopeImobIds),
      ),
    );
  revalidatePath("/painel/equipe");
  return { ok: true };
}

export async function removeMembro(membroId: string) {
  const me = await getCurrentImobMembership();
  if (!me || !me.canManageMembros) throw new Error("Sem permissão");

  await db
    .update(imobiliariaMembros)
    .set({ removedAt: new Date() })
    .where(
      and(
        eq(imobiliariaMembros.id, membroId),
        inArray(imobiliariaMembros.imobiliariaId, me.scopeImobIds),
      ),
    );
  revalidatePath("/painel/equipe");
  return { ok: true };
}

/* ============================================================
   HELPERS auxiliares
   ============================================================ */

/** Lista corretores do time pra dropdown (owner + membros ativos). */
export async function listCorretoresDoTime(): Promise<
  Array<{ userId: string; nome: string; email: string }>
> {
  const me = await getCurrentImobMembership();
  if (!me) return [];

  // Escopo do grupo: quem é da matriz vê corretores de todas as unidades.
  const ids = sql.join(
    me.scopeImobIds.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
  const rows = await db.execute(sql`
    SELECT DISTINCT u.id, COALESCE(u.nome, u.email) AS nome, u.email
    FROM users u
    WHERE u.id = (SELECT owner_user_id FROM imobiliarias WHERE id = ${me.matrizId}::uuid)
      OR u.id IN (
        SELECT user_id FROM imobiliaria_membros
        WHERE imobiliaria_id IN (${ids})
          AND removed_at IS NULL
      )
    ORDER BY nome ASC
  `);
  type Row = { id: string; nome: string; email: string };
  const list = (
    Array.isArray(rows) ? rows : ((rows as unknown as { rows: Row[] }).rows ?? [])
  ) as Row[];
  return list.map((r) => ({ userId: r.id, nome: r.nome, email: r.email }));
}
