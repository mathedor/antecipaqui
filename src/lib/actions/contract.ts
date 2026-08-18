"use server";

import crypto from "node:crypto";
import { renderToBuffer } from "@react-pdf/renderer";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import React from "react";
import { db } from "@/db";
import {
  contratos,
  fundos,
  construtoras,
  operacoes,
  parcelasComissao,
  users,
  type ContratoSigner,
} from "@/db/schema";
import { ContractDocument, type ContractData } from "@/lib/contract-pdf";
import { resolveImobCedente } from "@/lib/imobiliaria-cedente";
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
  const { cedente: imob } = await resolveImobCedente(op);

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
    pagadorTipo:
      op.pagadorTipo === "compradores"
        ? ("compradores" as const)
        : ("construtora" as const),
    compradores: await (async () => {
      if (op.pagadorTipo !== "compradores") return [];
      const { operacaoCompradores } = await import("@/db/schema");
      const rows = await db
        .select()
        .from(operacaoCompradores)
        .where(eq(operacaoCompradores.operacaoId, op.id))
        .orderBy(operacaoCompradores.ordem);
      return rows.map((c) => ({
        tipoPessoa: c.tipoPessoa as "fisica" | "juridica",
        nome: c.nome,
        documento: c.documento,
        telefone: c.telefone,
        email: c.email,
        endereco: c.endereco,
        cidade: c.cidade,
        uf: c.uf,
        cep: c.cep,
      }));
    })(),
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

  // PDF pronto — manda pra assinatura (ZapSign) reusando o helper.
  return sendContratoToZapsign(operacaoId, blob.url);
}

/**
 * Cria/atualiza o contrato a partir de um PDF já pronto — renderizado
 * localmente (fluxo padrão) OU devolvido pelo fundo — e envia pra assinatura
 * via ZapSign. Reusado pelo webhook quando o fundo GERA o contrato mas a
 * Antecipaqui é quem coleta a assinatura.
 */
export async function sendContratoToZapsign(
  operacaoId: string,
  pdfUrl: string,
): Promise<{
  contratoId: string;
  url: string;
  zapsignDocumentToken: string | null;
}> {
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

  const { cedente: imob } = await resolveImobCedente(op);

  const [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);
  if (!construtora) throw new Error("Construtora não encontrada");

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
      urlPdf: pdfUrl,
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
        pdfUrl,
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
        pdfUrl,
        status: newStatus,
        zapsignDocumentToken,
        signers: signersData,
      })
      .returning({ id: contratos.id });
    contratoId = created.id;
  }

  return { contratoId, url: pdfUrl, zapsignDocumentToken };
}

/**
 * Quando o FUNDO é quem gera o contrato: envia os dados da operação
 * (construtora, cedente, parcelas...) pro endpoint do fundo. O fundo gera o
 * contrato e devolve no webhook /api/contrato-assinatura/webhook/{fundoId}:
 *  - se a Antecipaqui é quem assina → devolve o contrato (evento
 *    "contrato_gerado") e nós mandamos pro ZapSign;
 *  - se o fundo também assina → devolve já assinado (evento "contrato_assinado").
 *
 * Cria/garante uma row de contrato em estado "gerado" (aguardando o fundo).
 * Best-effort: se o fundo não tem URL configurada ou o POST falha, deixa o
 * contrato pendente e retorna o motivo (sem derrubar o fluxo de status).
 */
export async function dispatchOperacaoToFundo(
  operacaoId: string,
): Promise<{ dispatched: boolean; reason?: string }> {
  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op) throw new Error("Operação não encontrada");
  if (!op.fundoId) return { dispatched: false, reason: "sem fundo vinculado" };

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, op.fundoId))
    .limit(1);
  if (!fundo) return { dispatched: false, reason: "fundo não encontrado" };

  // Garante row de contrato em estado "aguardando o fundo gerar".
  const [existing] = await db
    .select()
    .from(contratos)
    .where(eq(contratos.operacaoId, operacaoId))
    .limit(1);
  if (!existing) {
    await db.insert(contratos).values({ operacaoId, status: "gerado" });
  }

  if (!fundo.contratoGeracaoUrl) {
    return {
      dispatched: false,
      reason: "fundo sem URL de geração configurada",
    };
  }

  // Dados da operação pro fundo gerar o contrato.
  const [cedenteUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, op.corretorUserId))
    .limit(1);
  const { cedente: imob } = await resolveImobCedente(op);
  const [construtora] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.id, op.construtoraId))
    .limit(1);
  const parcelas = await db
    .select()
    .from(parcelasComissao)
    .where(eq(parcelasComissao.operacaoId, operacaoId))
    .orderBy(parcelasComissao.numero);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

  const payload = {
    evento: "gerar_contrato",
    operacaoId: op.id,
    numero: op.numero,
    fundoId: fundo.id,
    valorComissao: parseFloat(op.valorComissao),
    valorPresente: parseFloat(op.valorPresente),
    valorVenda: parseFloat(op.valorVenda),
    desagio: parseFloat(op.desagio),
    taxaMensal: parseFloat(op.taxaMensal),
    numeroParcelas: op.numeroParcelas,
    dataVenda: op.dataVenda,
    pagadorTipo: op.pagadorTipo,
    construtora: construtora
      ? {
          razaoSocial: construtora.razaoSocial,
          cnpj: construtora.cnpj,
          endereco: construtora.endereco,
          cidade: construtora.cidade,
          uf: construtora.uf,
          email: construtora.email,
          telefone: construtora.telefone,
        }
      : null,
    cedente: cedenteUser
      ? {
          nome: cedenteUser.nome,
          email: cedenteUser.email,
          telefone: cedenteUser.telefone,
        }
      : null,
    imobiliaria: imob
      ? {
          razaoSocial: imob.razaoSocial,
          cnpj: imob.cnpj,
          endereco: imob.endereco,
          cidade: imob.cidade,
          uf: imob.uf,
        }
      : null,
    parcelas: parcelas.map((p) => ({
      numero: p.numero,
      vencimento: p.vencimento,
      valor: parseFloat(p.valor),
    })),
    // Pra onde o fundo devolve o contrato (gerado ou assinado).
    callbackUrl: `${siteUrl}/api/contrato-assinatura/webhook/${fundo.id}`,
  };

  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (fundo.contratoAssinaturaWebhookSecret) {
    const sig = crypto
      .createHmac("sha256", fundo.contratoAssinaturaWebhookSecret)
      .update(body)
      .digest("hex");
    headers["x-webhook-signature"] = `sha256=${sig}`;
  }

  try {
    // Timeout obrigatório: a URL é controlável pelo próprio fundo; sem teto,
    // um endpoint lento pendura a server action e consome slots de concorrência.
    const res = await fetch(fundo.contratoGeracaoUrl, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error(
        "[contract/dispatch] fundo respondeu",
        res.status,
        await res.text().catch(() => ""),
      );
      return { dispatched: false, reason: `fundo respondeu HTTP ${res.status}` };
    }
  } catch (e) {
    console.error("[contract/dispatch] erro ao enviar pro fundo:", e);
    return { dispatched: false, reason: "erro de rede ao chamar o fundo" };
  }

  return { dispatched: true };
}

export async function getContratoForOperacao(operacaoId: string) {
  const [c] = await db
    .select()
    .from(contratos)
    .where(eq(contratos.operacaoId, operacaoId))
    .limit(1);
  return c ?? null;
}
