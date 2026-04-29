"use server";

import { renderToBuffer } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import React from "react";
import { db } from "@/db";
import {
  contratos,
  imobiliarias,
  construtoras,
  operacoes,
  parcelasComissao,
  users,
} from "@/db/schema";
import { ContractDocument, type ContractData } from "@/lib/contract-pdf";

function monthsBetween(from: Date, to: Date) {
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  const dayFrac = (to.getDate() - from.getDate()) / 30;
  return Math.max(y * 12 + m + dayFrac, 0);
}

function getLogoUrl() {
  // Em prod usa URL pública do site; em dev usa o Vercel domain
  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? "https://antecipaqui.vercel.app";
  return `${base}/brand/logo.png`;
}

/**
 * Gera o PDF do contrato pra uma operação aprovada.
 * Retorna URL do Blob com o contrato gerado.
 * Side effects: persiste row em `contratos`.
 */
export async function generateContractForOperacao(
  operacaoId: string,
): Promise<{ contratoId: string; url: string }> {
  // Carrega tudo
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) throw new Error("Operação não encontrada");

  const [cedenteUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, op.corretorUserId))
    .limit(1);
  if (!cedenteUser) throw new Error("Cedente não encontrado");

  // Imobiliária do cedente (pra dados completos + bancários)
  const [imob] = await db
    .select()
    .from(imobiliarias)
    .where(eq(imobiliarias.ownerUserId, op.corretorUserId))
    .limit(1);

  const [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);
  if (!construtora) throw new Error("Construtora não encontrada");

  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, operacaoId))
    .orderBy(parcelasComissao.numero);

  // Calcular VP por parcela
  const taxaMensal = parseFloat(op.taxaMensal);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parcelasCalc = parcelas.map((p) => {
    const venc = new Date(p.vencimento + "T00:00:00");
    const meses = monthsBetween(today, venc);
    const valorNominal = parseFloat(p.valor);
    const fator = Math.pow(1 + taxaMensal, meses);
    const vp = valorNominal / fator;
    const juros = valorNominal - vp;
    return {
      numero: p.numero,
      vencimento: p.vencimento,
      valorNominal,
      juros,
      vp,
      meses,
    };
  });

  const data: ContractData = {
    numero: op.numero,
    valorPresente: parseFloat(op.valorPresente),
    valorComissao: parseFloat(op.valorComissao),
    valorVenda: parseFloat(op.valorVenda),
    desagio: parseFloat(op.desagio),
    taxaMensal,
    numeroParcelas: op.numeroParcelas,
    dataVenda: op.dataVenda,
    dataAssinatura: new Date(),
    cedenteRazaoSocial: imob?.razaoSocial ?? cedenteUser.nome ?? cedenteUser.email,
    cedenteCnpj: imob?.cnpj ?? "—",
    cedenteEndereco: imob?.endereco ?? null,
    cedenteCidade: imob?.cidade ?? null,
    cedenteUf: imob?.uf ?? null,
    cedenteCep: imob?.cep ?? null,
    cedenteTelefone: imob?.telefone ?? cedenteUser.telefone ?? null,
    cedenteEmail: cedenteUser.email,
    cedenteBancoNome: imob?.bancoNome ?? null,
    cedenteBancoCodigo: imob?.bancoCodigo ?? null,
    cedenteBancoAgencia: imob?.bancoAgencia ?? null,
    cedenteBancoConta: imob?.bancoConta ?? null,
    construtoraRazaoSocial: construtora.razaoSocial,
    construtoraCnpj: construtora.cnpj,
    construtoraEndereco: construtora.endereco,
    construtoraCidade: construtora.cidade,
    construtoraUf: construtora.uf,
    construtoraTelefone: construtora.telefone,
    construtoraEmail: construtora.email,
    parcelas: parcelasCalc,
    logoUrl: getLogoUrl(),
  };

  const element = React.createElement(ContractDocument, { data });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  const filename = `contratos/${op.numero}-${Date.now()}.pdf`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
  });

  // Persiste em contratos
  // Se já existir, atualiza; caso contrário cria
  const [existing] = await db
    .select()
    .from(contratos)
    .where(eq(contratos.operacaoId, operacaoId))
    .limit(1);

  let contratoId: string;
  if (existing) {
    await db
      .update(contratos)
      .set({
        pdfUrl: blob.url,
        status: "gerado",
        updatedAt: new Date(),
      })
      .where(eq(contratos.id, existing.id));
    contratoId = existing.id;
  } else {
    const [created] = await db
      .insert(contratos)
      .values({
        operacaoId,
        pdfUrl: blob.url,
        status: "gerado",
      })
      .returning({ id: contratos.id });
    contratoId = created.id;
  }

  return { contratoId, url: blob.url };
}

export async function getContratoForOperacao(operacaoId: string) {
  const [c] = await db
    .select()
    .from(contratos)
    .where(eq(contratos.operacaoId, operacaoId))
    .limit(1);
  return c ?? null;
}
