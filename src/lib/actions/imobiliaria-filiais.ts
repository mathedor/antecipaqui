"use server";

/**
 * Gestão do GRUPO ECONÔMICO da imobiliária — matriz + filiais.
 *
 * Regra do modelo: um único cadastro (o da matriz) guarda todo o grupo.
 * O owner da matriz é o admin: liga a flag `possuiFiliais`, cadastra cada
 * filial (CNPJ próprio) e decide se ela opera com o CNPJ dela ou em nome
 * da matriz. Operações continuam apontando pra `operacoes.imobiliaria_id` —
 * só que agora esse ID pode ser o de uma filial. O fluxo não muda.
 */

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { imobiliarias, imobiliariaMembros, operacoes } from "@/db/schema";
import { getCurrentImobMembership } from "@/lib/actions/imobiliaria-membros";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";

export type FilialInput = {
  razaoSocial: string;
  nomeFantasia?: string | null;
  apelido?: string | null;
  cnpj: string;
  creciResponsavel?: string | null;
  telefone?: string | null;
  cep?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  operaEmNomeDaMatriz: boolean;
  bancoNome?: string | null;
  bancoCodigo?: string | null;
  bancoAgencia?: string | null;
  bancoConta?: string | null;
};

export type UnidadeDetalhe = FilialInput & {
  id: string;
  isMatriz: boolean;
  isActive: boolean;
  /** Nº de operações já originadas por esta unidade. */
  totalOperacoes: number;
  /** Nº de membros ativos lotados nela. */
  totalMembros: number;
};

export type GrupoImob = {
  matrizId: string;
  possuiFiliais: boolean;
  canManage: boolean;
  unidades: UnidadeDetalhe[];
};

type Result = { ok: true; id?: string } | { ok: false; error: string };

const nz = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s ? s : null;
};

/* ============================================================
   LEITURA — grupo completo pra tela de filiais
   ============================================================ */

export async function getGrupoDaImob(): Promise<GrupoImob | null> {
  const me = await getCurrentImobMembership();
  if (!me) return null;

  const rows = await db
    .select()
    .from(imobiliarias)
    .where(
      sql`${imobiliarias.id} = ${me.matrizId}::uuid OR ${imobiliarias.matrizId} = ${me.matrizId}::uuid`,
    )
    .orderBy(asc(imobiliarias.matrizId), asc(imobiliarias.razaoSocial));

  // Contadores por unidade — uma query cada, agregadas.
  const opCounts = await db
    .select({
      imobiliariaId: operacoes.imobiliariaId,
      total: sql<number>`count(*)::int`,
    })
    .from(operacoes)
    .where(
      sql`${operacoes.imobiliariaId} = ${me.matrizId}::uuid OR ${operacoes.imobiliariaId} IN (
        SELECT id FROM imobiliarias WHERE matriz_id = ${me.matrizId}::uuid
      )`,
    )
    .groupBy(operacoes.imobiliariaId);

  const memCounts = await db
    .select({
      imobiliariaId: imobiliariaMembros.imobiliariaId,
      total: sql<number>`count(*)::int`,
    })
    .from(imobiliariaMembros)
    .where(
      sql`${imobiliariaMembros.removedAt} IS NULL AND (
        ${imobiliariaMembros.imobiliariaId} = ${me.matrizId}::uuid
        OR ${imobiliariaMembros.imobiliariaId} IN (
          SELECT id FROM imobiliarias WHERE matriz_id = ${me.matrizId}::uuid
        )
      )`,
    )
    .groupBy(imobiliariaMembros.imobiliariaId);

  const opMap = new Map(opCounts.map((r) => [r.imobiliariaId, r.total]));
  const memMap = new Map(memCounts.map((r) => [r.imobiliariaId, r.total]));

  const [matrizRow] = rows.filter((r) => r.matrizId === null);

  return {
    matrizId: me.matrizId,
    possuiFiliais: matrizRow?.possuiFiliais ?? false,
    canManage: me.canManageFiliais,
    unidades: rows.map((r) => ({
      id: r.id,
      isMatriz: r.matrizId === null,
      isActive: r.isActive,
      razaoSocial: r.razaoSocial,
      nomeFantasia: r.nomeFantasia,
      apelido: r.apelido,
      cnpj: r.cnpj,
      creciResponsavel: r.creciResponsavel,
      telefone: r.telefone,
      cep: r.cep,
      endereco: r.endereco,
      cidade: r.cidade,
      uf: r.uf,
      operaEmNomeDaMatriz: r.operaEmNomeDaMatriz,
      bancoNome: r.bancoNome,
      bancoCodigo: r.bancoCodigo,
      bancoAgencia: r.bancoAgencia,
      bancoConta: r.bancoConta,
      totalOperacoes: opMap.get(r.id) ?? 0,
      totalMembros: memMap.get(r.id) ?? 0,
    })),
  };
}

/* ============================================================
   FLAG "possui filiais" — abre/fecha a gestão do grupo
   ============================================================ */

export async function setPossuiFiliais(value: boolean): Promise<Result> {
  const me = await getCurrentImobMembership();
  if (!me) return { ok: false, error: "Sem vínculo com imobiliária" };
  if (!me.canManageFiliais)
    return {
      ok: false,
      error: "Apenas o responsável pela matriz pode alterar o grupo",
    };

  // Não deixa desligar com filial ativa pendurada — o user teria filiais
  // invisíveis operando.
  if (!value) {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(imobiliarias)
      .where(
        and(
          eq(imobiliarias.matrizId, me.matrizId),
          eq(imobiliarias.isActive, true),
        ),
      );
    if (total > 0)
      return {
        ok: false,
        error: `Desative as ${total} filial(is) antes de marcar que a empresa não possui filiais`,
      };
  }

  await db
    .update(imobiliarias)
    .set({ possuiFiliais: value, updatedAt: new Date() })
    .where(eq(imobiliarias.id, me.matrizId));

  revalidatePath("/painel/filiais");
  revalidatePath("/painel/operacoes/nova");
  return { ok: true };
}

/* ============================================================
   VALIDAÇÃO comum de payload
   ============================================================ */

function validar(input: FilialInput): string | null {
  if (!input.razaoSocial.trim()) return "Razão social é obrigatória";
  const cnpj = unmaskCNPJ(input.cnpj);
  if (!isValidCNPJ(cnpj)) return "CNPJ inválido";
  if (input.uf && input.uf.trim().length !== 2) return "UF inválida";
  if (input.cep && input.cep.replace(/\D/g, "").length !== 8)
    return "CEP inválido";
  // Filial com CNPJ próprio precisa de conta própria pra receber a
  // antecipação. Quem opera em nome da matriz usa a conta da matriz.
  if (!input.operaEmNomeDaMatriz) {
    if (!nz(input.bancoNome) || !nz(input.bancoAgencia) || !nz(input.bancoConta))
      return "Filial que opera com CNPJ próprio precisa de banco, agência e conta — vão no contrato de cessão";
  }
  return null;
}

async function cnpjEmUso(cnpj: string, ignoreId?: string): Promise<boolean> {
  const where = ignoreId
    ? and(eq(imobiliarias.cnpj, cnpj), ne(imobiliarias.id, ignoreId))
    : eq(imobiliarias.cnpj, cnpj);
  const [row] = await db
    .select({ id: imobiliarias.id })
    .from(imobiliarias)
    .where(where)
    .limit(1);
  return !!row;
}

/* ============================================================
   CRIAR filial
   ============================================================ */

export async function createFilial(input: FilialInput): Promise<Result> {
  const me = await getCurrentImobMembership();
  if (!me) return { ok: false, error: "Sem vínculo com imobiliária" };
  if (!me.canManageFiliais)
    return {
      ok: false,
      error: "Apenas o responsável pela matriz pode cadastrar filiais",
    };

  const erro = validar(input);
  if (erro) return { ok: false, error: erro };

  const cnpj = unmaskCNPJ(input.cnpj);
  if (await cnpjEmUso(cnpj))
    return {
      ok: false,
      error: "Já existe uma imobiliária cadastrada com esse CNPJ",
    };

  // A filial herda o owner da matriz — o cadastro é um só.
  const [matriz] = await db
    .select({ ownerUserId: imobiliarias.ownerUserId, comercialId: imobiliarias.comercialId })
    .from(imobiliarias)
    .where(eq(imobiliarias.id, me.matrizId))
    .limit(1);
  if (!matriz) return { ok: false, error: "Matriz não encontrada" };

  const [created] = await db
    .insert(imobiliarias)
    .values({
      ownerUserId: matriz.ownerUserId,
      comercialId: matriz.comercialId,
      matrizId: me.matrizId,
      possuiFiliais: false,
      apelido: nz(input.apelido),
      razaoSocial: input.razaoSocial.trim(),
      nomeFantasia: nz(input.nomeFantasia),
      cnpj,
      creciResponsavel: nz(input.creciResponsavel),
      telefone: nz(input.telefone),
      cep: nz(input.cep),
      endereco: nz(input.endereco),
      cidade: nz(input.cidade),
      uf: nz(input.uf)?.toUpperCase() ?? null,
      operaEmNomeDaMatriz: input.operaEmNomeDaMatriz,
      bancoNome: nz(input.bancoNome),
      bancoCodigo: nz(input.bancoCodigo),
      bancoAgencia: nz(input.bancoAgencia),
      bancoConta: nz(input.bancoConta),
    })
    .returning({ id: imobiliarias.id });

  // Cadastrar a primeira filial implica que a empresa tem filiais.
  await db
    .update(imobiliarias)
    .set({ possuiFiliais: true, updatedAt: new Date() })
    .where(eq(imobiliarias.id, me.matrizId));

  revalidatePath("/painel/filiais");
  revalidatePath("/painel/operacoes/nova");
  revalidatePath("/painel/equipe");
  return { ok: true, id: created.id };
}

/* ============================================================
   EDITAR unidade (matriz ou filial)
   ============================================================ */

export async function updateUnidade(
  id: string,
  input: FilialInput,
): Promise<Result> {
  const me = await getCurrentImobMembership();
  if (!me) return { ok: false, error: "Sem vínculo com imobiliária" };
  if (!me.canManageFiliais)
    return { ok: false, error: "Apenas o responsável pela matriz pode editar" };
  if (!me.scopeImobIds.includes(id))
    return { ok: false, error: "Unidade fora do seu grupo" };

  const isMatriz = id === me.matrizId;
  // Matriz nunca "opera em nome da matriz" — ela É a matriz.
  const payload: FilialInput = isMatriz
    ? { ...input, operaEmNomeDaMatriz: false }
    : input;

  const erro = validar(payload);
  if (erro) return { ok: false, error: erro };

  const cnpj = unmaskCNPJ(payload.cnpj);
  if (await cnpjEmUso(cnpj, id))
    return {
      ok: false,
      error: "Já existe outra imobiliária cadastrada com esse CNPJ",
    };

  await db
    .update(imobiliarias)
    .set({
      apelido: nz(payload.apelido),
      razaoSocial: payload.razaoSocial.trim(),
      nomeFantasia: nz(payload.nomeFantasia),
      cnpj,
      creciResponsavel: nz(payload.creciResponsavel),
      telefone: nz(payload.telefone),
      cep: nz(payload.cep),
      endereco: nz(payload.endereco),
      cidade: nz(payload.cidade),
      uf: nz(payload.uf)?.toUpperCase() ?? null,
      operaEmNomeDaMatriz: payload.operaEmNomeDaMatriz,
      bancoNome: nz(payload.bancoNome),
      bancoCodigo: nz(payload.bancoCodigo),
      bancoAgencia: nz(payload.bancoAgencia),
      bancoConta: nz(payload.bancoConta),
      updatedAt: new Date(),
    })
    .where(eq(imobiliarias.id, id));

  revalidatePath("/painel/filiais");
  revalidatePath("/painel/operacoes/nova");
  return { ok: true, id };
}

/* ============================================================
   ATIVAR / DESATIVAR filial
   ============================================================ */

export async function setFilialAtiva(
  id: string,
  ativa: boolean,
): Promise<Result> {
  const me = await getCurrentImobMembership();
  if (!me) return { ok: false, error: "Sem vínculo com imobiliária" };
  if (!me.canManageFiliais)
    return { ok: false, error: "Apenas o responsável pela matriz pode alterar" };
  if (!me.scopeImobIds.includes(id))
    return { ok: false, error: "Unidade fora do seu grupo" };
  if (id === me.matrizId)
    return { ok: false, error: "A matriz não pode ser desativada" };

  await db
    .update(imobiliarias)
    .set({ isActive: ativa, updatedAt: new Date() })
    .where(eq(imobiliarias.id, id));

  revalidatePath("/painel/filiais");
  revalidatePath("/painel/operacoes/nova");
  return { ok: true, id };
}

/* ============================================================
   UNIDADES OPERÁVEIS — alimenta o seletor da nova operação
   ============================================================ */

export type UnidadeOperavel = {
  id: string;
  label: string;
  cnpj: string;
  isMatriz: boolean;
  operaEmNomeDaMatriz: boolean;
};

/** Unidades ativas que o user logado pode usar como origem de uma operação.
 *  Retorna [] quando o user não tem vínculo, e 1 item quando não há grupo. */
export async function listUnidadesOperaveis(): Promise<UnidadeOperavel[]> {
  const me = await getCurrentImobMembership();
  if (!me || !me.canCreateOperacao) return [];
  const { unidadeLabel } = await import("@/lib/imobiliaria-perms");
  return me.unidades
    .filter((u) => u.isActive)
    .map((u) => ({
      id: u.id,
      label: unidadeLabel(u),
      cnpj: u.cnpj,
      isMatriz: u.isMatriz,
      operaEmNomeDaMatriz: u.operaEmNomeDaMatriz,
    }));
}
