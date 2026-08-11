"use server";

/**
 * "Finaliza pra mim e deixa o documento pendente" — proposta que o Cícero faz
 * quando o usuário trava no cadastro de operação por causa de anexo.
 *
 * Motivo: hoje o botão de registrar simplesmente fica desabilitado quando
 * falta contrato de venda ou de comissionamento (ou quando a IA recusa o
 * arquivo). O usuário larga o cadastro e a operação nunca existe. Melhor
 * gravar a operação com `documentos_incompletos` + o que falta escrito, do
 * mesmo jeito que o admin faz num cadastro em lote: o negócio entra na fila
 * e o anexo chega depois.
 *
 * Não relaxa nada além do anexo: valores, parcelas e construtora continuam
 * obrigatórios e validados igual ao fluxo normal.
 */

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  documentos,
  imobiliarias,
  operacaoEvents,
  operacoes,
  parcelasComissao,
} from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { getTaxaMensal } from "@/lib/actions/settings";
import { parseBRLNumber, valorPresente } from "@/lib/format";
import { extractValidacao } from "@/lib/validacao-form";

export type DocPendente =
  | "contrato_venda"
  | "contrato_comissao"
  | "nota_fiscal"
  | "comprovante_entrada";

const ROTULO: Record<DocPendente, string> = {
  contrato_venda: "Contrato de compra e venda",
  contrato_comissao: "Contrato de comissionamento",
  nota_fiscal: "Nota fiscal",
  comprovante_entrada: "Comprovante de entrada",
};

export type FinalizarPendenteState =
  | { ok: true; operacaoId: string; numero: string; faltando: string[] }
  | { ok: false; error: string };

function monthsBetween(from: Date, to: Date) {
  const anos = to.getFullYear() - from.getFullYear();
  const meses = to.getMonth() - from.getMonth();
  const fracDia = (to.getDate() - from.getDate()) / 30;
  return anos * 12 + meses + fracDia;
}

async function proximoNumero() {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(operacoes);
  return `OP-${new Date().getFullYear()}-${String(total + 1).padStart(4, "0")}`;
}

/**
 * Cria a operação com os documentos que já subiram e registra os que faltam
 * como pendência. Recebe o MESMO FormData do formulário normal.
 */
export async function finalizarOperacaoPendente(
  formData: FormData,
): Promise<FinalizarPendenteState> {
  const user = await getCurrentDbUser();
  if (!user) return { ok: false, error: "Não autenticado" };
  if (user.role !== "corretor" && user.role !== "imobiliaria") {
    return { ok: false, error: "Só corretor ou imobiliária cadastra operação" };
  }
  if (user.onboardingStatus === "pendente") {
    return { ok: false, error: "Complete seu cadastro antes de operar." };
  }

  /* ---- dados obrigatórios (nada relaxa aqui) ---- */
  const construtoraId = String(formData.get("construtoraId") || "").trim();
  const dataVenda = String(formData.get("dataVenda") || "").trim();
  const valorVenda = parseBRLNumber(String(formData.get("valorVenda") || ""));
  const valorComissao = parseBRLNumber(
    String(formData.get("valorComissao") || ""),
  );

  if (!construtoraId) return { ok: false, error: "Selecione a construtora" };
  if (!dataVenda) return { ok: false, error: "Informe a data da venda" };
  if (!Number.isFinite(valorVenda) || valorVenda <= 0)
    return { ok: false, error: "Valor da venda inválido" };
  if (!Number.isFinite(valorComissao) || valorComissao <= 0)
    return { ok: false, error: "Valor da comissão inválido" };

  let brutas: { valor: unknown; vencimento?: unknown }[] = [];
  try {
    brutas = JSON.parse(String(formData.get("parcelas") || "[]"));
  } catch {
    return { ok: false, error: "Cronograma de parcelas inválido" };
  }
  if (!Array.isArray(brutas) || brutas.length === 0)
    return { ok: false, error: "Informe ao menos uma parcela da comissão" };
  if (brutas.length > 5)
    return { ok: false, error: "Limite máximo de 5 parcelas" };

  // O form serializa valor como string mascarada BR ("33.333,33") — Number()
  // devolveria NaN. Mesma normalização do cadastro normal.
  const parcelas = brutas.map((p) => ({
    valor:
      typeof p.valor === "number" ? p.valor : parseBRLNumber(String(p.valor)),
    vencimento: String(p.vencimento ?? ""),
  }));
  if (parcelas.some((p) => !Number.isFinite(p.valor) || p.valor <= 0))
    return { ok: false, error: "Há parcela com valor inválido" };
  if (parcelas.some((p) => !/^\d{4}-\d{2}-\d{2}$/.test(p.vencimento)))
    return { ok: false, error: "Há parcela sem data de vencimento" };

  // Mesma regra de negócio do fluxo normal: só o anexo é relaxado aqui.
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);

  // Só se antecipa parcela a vencer.
  if (parcelas.some((p) => new Date(p.vencimento + "T00:00:00") < inicioHoje))
    return {
      ok: false,
      error:
        "Há parcela com vencimento já passado. Só dá pra antecipar parcela a vencer — deixe no cronograma apenas o que ainda está por vencer.",
    };

  // Parcela longa NÃO bloqueia: fica registrada como futura. Serve de
  // prospect — quando entrar na janela de operação, o cliente é cutucado
  // pra antecipar. O que não entra é parcela já vencida (acima).

  const soma = parcelas.reduce((s, p) => s + p.valor, 0);
  if (Math.abs(soma - valorComissao) > 0.5) {
    return {
      ok: false,
      error: `Soma das parcelas (R$ ${soma.toFixed(2)}) não bate com a comissão (R$ ${valorComissao.toFixed(2)})`,
    };
  }

  /* ---- unidade do grupo que origina ---- */
  const unidadeId = String(formData.get("imobiliariaId") || "").trim();
  const { getCurrentImobMembership } = await import(
    "@/lib/actions/imobiliaria-membros"
  );
  const me = await getCurrentImobMembership();
  let imobiliariaId: string | null = null;
  if (me) {
    if (unidadeId && !me.scopeImobIds.includes(unidadeId))
      return { ok: false, error: "Unidade fora do seu grupo" };
    imobiliariaId = unidadeId || me.imobiliariaId;
  } else {
    const [own] = await db
      .select({ id: imobiliarias.id })
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, user.id))
      .limit(1);
    imobiliariaId = own?.id ?? null;
  }

  /* ---- o que subiu e o que falta ---- */
  const anexos: { tipo: DocPendente; url: string; nome: string }[] = [];
  const faltando: DocPendente[] = [];
  const obrigatorios: DocPendente[] = ["contrato_venda", "contrato_comissao"];

  for (const tipo of [
    "contrato_venda",
    "contrato_comissao",
    "nota_fiscal",
    "comprovante_entrada",
  ] as DocPendente[]) {
    const url = String(formData.get(`doc_${tipo}`) || "").trim();
    if (url) {
      anexos.push({
        tipo,
        url,
        nome: String(formData.get(`doc_${tipo}_nome`) || `${tipo}.pdf`),
      });
    } else if (obrigatorios.includes(tipo)) {
      faltando.push(tipo);
    }
  }

  if (faltando.length === 0) {
    return {
      ok: false,
      error:
        "Nenhum documento obrigatório está faltando — use o botão normal de registrar.",
    };
  }

  /* ---- cálculo (idêntico ao fluxo normal) ---- */
  const taxaMensal = await getTaxaMensal();
  const hoje = new Date();
  const vp = valorPresente(
    parcelas.map((p) => ({
      valor: Number(p.valor),
      mesesAteVencimento: Math.max(
        monthsBetween(hoje, new Date(p.vencimento)),
        0,
      ),
    })),
    taxaMensal,
  );

  const listaFaltando = faltando.map((f) => ROTULO[f]);
  const motivo =
    `Cadastro finalizado pelo Cícero a pedido do usuário, com envio de documento pendente.\n\n` +
    `Falta anexar para a operação seguir para análise:\n` +
    listaFaltando.map((f) => `• ${f}`).join("\n") +
    `\n\nAbra a operação e envie o arquivo — assim que chegar, ela entra na fila normalmente.`;

  const numero = await proximoNumero();
  const [op] = await db
    .insert(operacoes)
    .values({
      numero,
      corretorUserId: user.id,
      imobiliariaId,
      construtoraId,
      valorVenda: valorVenda.toFixed(2),
      valorComissao: valorComissao.toFixed(2),
      dataVenda,
      numeroParcelas: parcelas.length,
      taxaMensal: String(taxaMensal),
      valorPresente: vp.toFixed(2),
      desagio: (valorComissao - vp).toFixed(2),
      status: "documentos_incompletos",
      motivoPendencia: motivo,
    })
    .returning({ id: operacoes.id, numero: operacoes.numero });

  await db.insert(parcelasComissao).values(
    parcelas.map((p, i) => ({
      operacaoId: op.id,
      numero: i + 1,
      valor: Number(p.valor).toFixed(2),
      vencimento: p.vencimento,
    })),
  );

  if (anexos.length > 0) {
    await db.insert(documentos).values(
      anexos.map((a) => ({
        ...extractValidacao(formData, `doc_${a.tipo}`),
        tipo: a.tipo,
        url: a.url,
        nomeOriginal: a.nome,
        userId: user.id,
        imobiliariaId,
        operacaoId: op.id,
      })),
    );
  }

  await db
    .insert(operacaoEvents)
    .values({
      operacaoId: op.id,
      type: "cicero_cadastro_pendente",
      userId: user.id,
      payload: { faltando: listaFaltando },
    })
    .catch(() => undefined);

  revalidatePath("/painel/operacoes");
  return { ok: true, operacaoId: op.id, numero: op.numero, faltando: listaFaltando };
}
