"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, ne } from "drizzle-orm";
import crypto from "node:crypto";
import { db } from "@/db";
import {
  construtoras,
  imobiliarias,
  pendingOperacoes,
  users,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { isValidCNPJ, unmaskCNPJ } from "@/lib/cnpj";
import { sendEmail } from "@/lib/email";
import { parseBRLNumber } from "@/lib/format";
import { notify } from "@/lib/notify";

type LinhaPayload = {
  imobiliariaId?: string | null;
  imobNova?: {
    razaoSocial: string;
    cnpj: string;
    email: string;
    telefone: string;
  };
  corretorEmail?: string;
  corretorNome?: string;
  valorVenda: string;
  valorComissao: string;
  numeroParcelas: string;
  dataPrimeiraParcela: string;
  observacoes?: string;
};

export type CreatePendingState =
  | { ok: false; error: string; linhaIndex?: number }
  | { ok: true; total: number }
  | null;

function generateInviteToken() {
  return crypto.randomBytes(20).toString("hex");
}

/**
 * Recebe uma lista de linhas e cria pending_operacoes em lote.
 * Pra cada linha:
 *  - Resolve imobiliária (existente OU cria nova com ownerUserId=null)
 *  - Cria pending_operacao com invite_token único
 *  - Manda email pro corretor convidando
 */
export async function createPendingOperacoesAction(
  _prev: CreatePendingState,
  formData: FormData,
): Promise<CreatePendingState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "construtora")
    return { ok: false, error: "Apenas construtora pode usar lote" };

  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return { ok: false, error: "Construtora não encontrada" };

  let linhas: LinhaPayload[] = [];
  try {
    linhas = JSON.parse(String(formData.get("linhas") || "[]"));
  } catch {
    return { ok: false, error: "Linhas inválidas" };
  }
  if (!Array.isArray(linhas) || linhas.length === 0)
    return { ok: false, error: "Adicione pelo menos uma operação" };

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

  let criadas = 0;
  for (let i = 0; i < linhas.length; i++) {
    const l = linhas[i];

    // Resolve imobiliária: usa id existente OU cria nova
    let imobId: string | null = l.imobiliariaId ?? null;
    let corretorEmail = (l.corretorEmail ?? "").trim();
    let corretorNome = (l.corretorNome ?? "").trim() || null;
    let corretorTelefone: string | null = null;
    let corretorCnpj: string | null = null;

    if (imobId) {
      const [imob] = await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.id, imobId))
        .limit(1);
      if (imob) {
        // Pega email do owner se existir
        if (imob.ownerUserId) {
          const [owner] = await db
            .select()
            .from(users)
            .where(eq(users.id, imob.ownerUserId))
            .limit(1);
          if (owner) {
            corretorEmail = corretorEmail || owner.email;
            corretorNome = corretorNome ?? owner.nome;
            corretorTelefone = owner.telefone ?? imob.telefone;
          }
        } else {
          corretorTelefone = imob.telefone;
        }
        corretorCnpj = imob.cnpj;
      }
    } else if (l.imobNova) {
      const cnpj = unmaskCNPJ(l.imobNova.cnpj);
      if (!isValidCNPJ(cnpj))
        return {
          ok: false,
          linhaIndex: i,
          error: `Linha ${i + 1}: CNPJ da imobiliária inválido`,
        };
      const emailNova = l.imobNova.email.trim();
      if (!emailNova || !emailNova.includes("@"))
        return {
          ok: false,
          linhaIndex: i,
          error: `Linha ${i + 1}: email da imobiliária obrigatório`,
        };

      // Verifica se já existe imobiliária com esse CNPJ
      const [existing] = await db
        .select()
        .from(imobiliarias)
        .where(eq(imobiliarias.cnpj, cnpj))
        .limit(1);
      if (existing) {
        imobId = existing.id;
        if (existing.ownerUserId) {
          const [owner] = await db
            .select()
            .from(users)
            .where(eq(users.id, existing.ownerUserId))
            .limit(1);
          corretorEmail = corretorEmail || owner?.email || emailNova;
          corretorNome = corretorNome ?? owner?.nome ?? l.imobNova.razaoSocial;
          corretorTelefone = owner?.telefone ?? existing.telefone;
        } else {
          corretorEmail = corretorEmail || emailNova;
          corretorNome = corretorNome ?? l.imobNova.razaoSocial;
          corretorTelefone = existing.telefone;
        }
        corretorCnpj = existing.cnpj;
      } else {
        // Cria imobiliária stub (ownerUserId null — será preenchido quando
        // o corretor se cadastrar).
        // imobiliarias.ownerUserId é NOT NULL → vamos contornar mantendo
        // tudo apenas em pending_operacoes (sem imobiliariaId).
        imobId = null;
        corretorEmail = corretorEmail || emailNova;
        corretorNome = corretorNome ?? l.imobNova.razaoSocial;
        corretorTelefone = l.imobNova.telefone;
        corretorCnpj = cnpj;
      }
    }

    if (!corretorEmail || !corretorEmail.includes("@"))
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: email do corretor obrigatório`,
      };

    const valorVenda = parseBRLNumber(l.valorVenda);
    const valorComissao = parseBRLNumber(l.valorComissao);
    if (!valorVenda || valorVenda <= 0)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: valor da venda inválido`,
      };
    if (!valorComissao || valorComissao <= 0)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: valor da comissão inválido`,
      };
    if (valorComissao > valorVenda)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: comissão maior que venda`,
      };

    const numeroParcelas = parseInt(l.numeroParcelas, 10);
    if (!Number.isFinite(numeroParcelas) || numeroParcelas < 1 || numeroParcelas > 4)
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: parcelas devem ser entre 1 e 4`,
      };

    const dp = String(l.dataPrimeiraParcela ?? "").trim();
    if (!dp || Number.isNaN(new Date(dp + "T00:00:00").getTime()))
      return {
        ok: false,
        linhaIndex: i,
        error: `Linha ${i + 1}: data da 1ª parcela inválida`,
      };

    const inviteToken = generateInviteToken();
    await db.insert(pendingOperacoes).values({
      construtoraId: c.id,
      imobiliariaId: imobId,
      corretorEmail: corretorEmail.toLowerCase(),
      corretorNome,
      corretorTelefone,
      corretorCnpj,
      valorVenda: String(valorVenda.toFixed(2)),
      valorComissao: String(valorComissao.toFixed(2)),
      numeroParcelas,
      dataPrimeiraParcela: dp,
      dataVenda: new Date().toISOString().slice(0, 10),
      observacoes: l.observacoes?.trim() || null,
      inviteToken,
      createdByUserId: user.id,
    });

    // Email convite (best-effort)
    const inviteUrl = `${baseUrl}/cadastre-se?invite=${inviteToken}`;
    await sendEmail({
      to: corretorEmail,
      subject: `Antecipaqui · ${c.razaoSocial} cadastrou uma operação pra você`,
      body: `Olá${corretorNome ? ` ${corretorNome.split(" ")[0]}` : ""}!

A construtora ${c.razaoSocial} cadastrou uma operação de antecipação de comissão envolvendo você na plataforma Antecipaqui.

📋 Resumo:
• Valor da venda: R$ ${valorVenda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Comissão: R$ ${valorComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Parcelas: ${numeroParcelas}x
• Primeira parcela: ${new Date(dp + "T00:00:00").toLocaleDateString("pt-BR")}

Pra simular o quanto você recebe hoje e finalizar o cadastro (anexar contratos e nota fiscal), acesse:

${inviteUrl}

Se você ainda não tem cadastro, o link te leva direto pra criar a conta. Em caso de dúvida, responda este email.

Equipe Antecipaqui`,
    }).catch((e) => console.error("[pending/email]", e));

    // Se já existe um user no nosso DB com esse email, manda também
    // notificação in-app
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, corretorEmail.toLowerCase()))
      .limit(1);
    if (existingUser) {
      await notify({
        userId: existingUser.id,
        type: "pending_operacao_recebida",
        title: `${c.razaoSocial} cadastrou uma operação pra você`,
        body: `Comissão de R$ ${valorComissao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${numeroParcelas}x. Acesse seus convites pra completar.`,
        link: "/painel/convites",
      });
    }

    criadas++;
  }

  revalidatePath("/painel");
  revalidatePath("/painel/operacoes/lote");
  return { ok: true, total: criadas };
}

/* ============================================================
   QUERIES
   ============================================================ */

/** Imobiliárias já cadastradas (pra autocomplete na construtora). */
export async function listImobiliariasForLote() {
  await getCurrentDbUser();
  return db
    .select({
      id: imobiliarias.id,
      razaoSocial: imobiliarias.razaoSocial,
      nomeFantasia: imobiliarias.nomeFantasia,
      cnpj: imobiliarias.cnpj,
    })
    .from(imobiliarias)
    .orderBy(imobiliarias.razaoSocial);
}

/** Pendings já cadastrados pela construtora atual (histórico). */
export async function listPendingByCurrentConstrutora() {
  const user = await getCurrentDbUser();
  if (!user) return [];
  const [c] = await db
    .select()
    .from(construtoras)
    .where(eq(construtoras.ownerUserId, user.id))
    .limit(1);
  if (!c) return [];

  return db
    .select()
    .from(pendingOperacoes)
    .where(eq(pendingOperacoes.construtoraId, c.id))
    .orderBy(desc(pendingOperacoes.createdAt));
}
