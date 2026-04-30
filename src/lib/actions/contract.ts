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
  type ContratoSigner,
} from "@/db/schema";
import { ContractDocument, type ContractData } from "@/lib/contract-pdf";
import {
  createZapsignDocument,
  getAntecipaquiSigner,
  type ZapsignSignerInput,
} from "@/lib/zapsign";

function digitsOnly(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  const d = s.replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-11) : undefined;
}

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
): Promise<{
  contratoId: string;
  url: string;
  zapsignDocumentToken: string | null;
}> {
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

  // Carrega construtora-owner pra ser signer (se existir cadastrado)
  const construtoraOwner = construtora.ownerUserId
    ? (
        await db
          .select()
          .from(users)
          .where(eq(users.id, construtora.ownerUserId))
          .limit(1)
      )[0]
    : null;

  // Resolve email da construtora pro signer: prefere owner, senão construtora.email
  const construtoraSignerEmail =
    construtoraOwner?.email ?? construtora.email ?? null;
  const construtoraSignerName =
    construtoraOwner?.nome ?? construtora.razaoSocial;

  // Monta signers — Antecipaqui sempre, cedente sempre, construtora se tiver email
  const antecipaqui = getAntecipaquiSigner();
  const signersInput: ZapsignSignerInput[] = [
    {
      role: "cedente",
      name: cedenteUser.nome ?? cedenteUser.email,
      email: cedenteUser.email,
      phoneNumber: digitsOnly(cedenteUser.telefone ?? imob?.telefone),
    },
  ];
  if (construtoraSignerEmail) {
    signersInput.push({
      role: "construtora",
      name: construtoraSignerName,
      email: construtoraSignerEmail,
      phoneNumber: digitsOnly(construtora.telefone),
    });
  }
  signersInput.push({
    role: "antecipaqui",
    name: antecipaqui.name,
    email: antecipaqui.email,
  });

  // Cria documento ZapSign (se falhar, ainda persistimos contrato como "gerado"
  // — admin pode regerar depois). external_id = numero da operação pra audit.
  let zapsignDocumentToken: string | null = null;
  let signersData: ContratoSigner[] | null = null;
  try {
    const zapDoc = await createZapsignDocument({
      name: `Antecipaqui · Cessão de Comissão · ${op.numero}`,
      urlPdf: blob.url,
      externalId: op.numero,
      signers: signersInput,
    });
    zapsignDocumentToken = zapDoc.token;

    // Mapeia signers da resposta (mesma ordem que enviamos)
    signersData = zapDoc.signers.map((s, i) => ({
      role: signersInput[i].role,
      zapsignToken: s.token,
      name: s.name,
      email: s.email,
      signUrl: s.sign_url,
      signedAt: s.signed_at ?? null,
    }));
  } catch (e) {
    console.error("[contract/zapsign] failed to create document:", e);
    // não rethrow — contrato fica como "gerado" sem ZapSign,
    // admin pode regerar via botão
  }

  // Persiste em contratos
  // Se já existir, atualiza; caso contrário cria
  const [existing] = await db
    .select()
    .from(contratos)
    .where(eq(contratos.operacaoId, operacaoId))
    .limit(1);

  const newStatus: "gerado" | "enviado_assinatura" = zapsignDocumentToken
    ? "enviado_assinatura"
    : "gerado";

  let contratoId: string;
  if (existing) {
    await db
      .update(contratos)
      .set({
        pdfUrl: blob.url,
        status: newStatus,
        zapsignDocumentToken: zapsignDocumentToken ?? existing.zapsignDocumentToken,
        signers: signersData ?? existing.signers,
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
        status: newStatus,
        zapsignDocumentToken,
        signers: signersData,
      })
      .returning({ id: contratos.id });
    contratoId = created.id;
  }

  return { contratoId, url: blob.url, zapsignDocumentToken };
}

export async function getContratoForOperacao(operacaoId: string) {
  const [c] = await db
    .select()
    .from(contratos)
    .where(eq(contratos.operacaoId, operacaoId))
    .limit(1);
  return c ?? null;
}
