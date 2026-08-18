"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  fundos,
  operacoes,
  parcelaAntecipacoes,
  parcelaRenegociacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getFundoDoUsuario } from "@/lib/fundo-acesso";

/** Lista antecipações pendentes que o user pode decidir.
 *  Admin: todas. Fundo: só das ops vinculadas ao seu fundo. */
export async function listAntecipacoesPendentes() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  if (user.role === "admin") {
    return db
      .select({
        a: parcelaAntecipacoes,
        parcela: parcelasComissao,
        operacao: operacoes,
        construtora: construtoras,
        solicitadoPor: users.nome,
      })
      .from(parcelaAntecipacoes)
      .innerJoin(
        parcelasComissao,
        eq(parcelasComissao.id, parcelaAntecipacoes.parcelaId),
      )
      .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
      .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
      .leftJoin(users, eq(users.id, parcelaAntecipacoes.solicitadoPorUserId))
      .where(eq(parcelaAntecipacoes.status, "pendente"))
      .orderBy(desc(parcelaAntecipacoes.createdAt));
  }

  if (user.role === "fundo") {
    const f = await getFundoDoUsuario(user.id);
    if (!f) return [];
    return db
      .select({
        a: parcelaAntecipacoes,
        parcela: parcelasComissao,
        operacao: operacoes,
        construtora: construtoras,
        solicitadoPor: users.nome,
      })
      .from(parcelaAntecipacoes)
      .innerJoin(
        parcelasComissao,
        eq(parcelasComissao.id, parcelaAntecipacoes.parcelaId),
      )
      .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
      .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
      .leftJoin(users, eq(users.id, parcelaAntecipacoes.solicitadoPorUserId))
      .where(
        and(
          eq(parcelaAntecipacoes.status, "pendente"),
          eq(operacoes.fundoId, f.id),
        ),
      )
      .orderBy(desc(parcelaAntecipacoes.createdAt));
  }

  return [];
}

/** Lista renegociações pendentes. */
export async function listRenegociacoesPendentes() {
  const user = await getCurrentDbUser();
  if (!user) return [];

  if (user.role === "admin") {
    return db
      .select({
        r: parcelaRenegociacoes,
        parcela: parcelasComissao,
        operacao: operacoes,
        construtora: construtoras,
        solicitadoPor: users.nome,
      })
      .from(parcelaRenegociacoes)
      .innerJoin(
        parcelasComissao,
        eq(parcelasComissao.id, parcelaRenegociacoes.parcelaId),
      )
      .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
      .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
      .leftJoin(users, eq(users.id, parcelaRenegociacoes.solicitadoPorUserId))
      .where(eq(parcelaRenegociacoes.status, "pendente"))
      .orderBy(desc(parcelaRenegociacoes.createdAt));
  }

  if (user.role === "fundo") {
    const f = await getFundoDoUsuario(user.id);
    if (!f) return [];
    return db
      .select({
        r: parcelaRenegociacoes,
        parcela: parcelasComissao,
        operacao: operacoes,
        construtora: construtoras,
        solicitadoPor: users.nome,
      })
      .from(parcelaRenegociacoes)
      .innerJoin(
        parcelasComissao,
        eq(parcelasComissao.id, parcelaRenegociacoes.parcelaId),
      )
      .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
      .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
      .leftJoin(users, eq(users.id, parcelaRenegociacoes.solicitadoPorUserId))
      .where(
        and(
          eq(parcelaRenegociacoes.status, "pendente"),
          eq(operacoes.fundoId, f.id),
        ),
      )
      .orderBy(desc(parcelaRenegociacoes.createdAt));
  }

  return [];
}
