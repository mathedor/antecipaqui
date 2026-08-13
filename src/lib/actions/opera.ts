"use server";

/**
 * Ações do admin sobre a integração com fundos (OPERA CAPITAL).
 * Tudo aqui exige admin — o cliente nunca fala com o fundo diretamente.
 */
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  fundos,
  imobiliarias,
  operacoes,
  operaClientes,
  operaDuplicatas,
  operaEventos,
  operaJobs,
  operaOperacoes,
  parcelasComissao,
} from "@/db/schema";
import { requireAdmin, getCurrentDbUser } from "@/lib/auth-user";
import { audit } from "@/lib/audit";
import { testarConexao } from "@/lib/opera/client";
import { iniciarIntegracaoDaOperacao } from "@/lib/opera/agentes";
import { destravarJob, enfileirarJob } from "@/lib/opera/fila";
import { processarFilaOpera } from "@/lib/opera/motor";
import { reprocessarEvento } from "@/lib/opera/receber";
import { DEFAULT_CONTRATO } from "@/lib/opera/contrato";

/* ─────────────────────────────────────────────
   CONFIGURAÇÃO DA INTEGRAÇÃO NO FUNDO
   ───────────────────────────────────────────── */

export type SalvarIntegracaoState =
  | { ok: false; error: string }
  | { ok: true; segredo?: string }
  | null;

export async function salvarIntegracaoFundoAction(
  _prev: SalvarIntegracaoState,
  formData: FormData,
): Promise<SalvarIntegracaoState> {
  await requireAdmin();

  const fundoId = String(formData.get("fundoId") || "");
  if (!fundoId) return { ok: false, error: "Fundo não informado" };

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };

  const tipo = String(formData.get("integracaoTipo") || "nenhuma");
  if (!["nenhuma", "opera"].includes(tipo))
    return { ok: false, error: "Tipo de integração inválido" };

  const ambiente = String(formData.get("integracaoAmbiente") || "sandbox");
  if (!["sandbox", "producao"].includes(ambiente))
    return { ok: false, error: "Ambiente inválido" };

  const apiUrl = String(formData.get("integracaoApiUrl") || "").trim();
  if (tipo !== "nenhuma" && apiUrl && !/^https?:\/\//.test(apiUrl))
    return { ok: false, error: "A URL da API precisa começar com http:// ou https://" };

  // Credenciais e contrato chegam como JSON digitado pelo admin. Um JSON
  // inválido salvo em silêncio quebraria a integração longe daqui.
  let credenciais: unknown = fundo.integracaoCredenciais;
  const credRaw = String(formData.get("integracaoCredenciais") || "").trim();
  if (credRaw) {
    try {
      credenciais = JSON.parse(credRaw);
    } catch {
      return { ok: false, error: "Credenciais: JSON inválido" };
    }
  }

  let contrato: unknown = fundo.integracaoContrato;
  const contratoRaw = String(formData.get("integracaoContrato") || "").trim();
  if (contratoRaw) {
    try {
      contrato = JSON.parse(contratoRaw);
    } catch {
      return { ok: false, error: "Contrato de integração: JSON inválido" };
    }
  } else if (!contratoRaw && !fundo.integracaoContrato) {
    contrato = null; // vale o padrão do código
  }

  // Segredo do webhook: gera na primeira vez, ou quando o admin pedir troca.
  const querTrocar = formData.get("gerarSegredo") === "on";
  let segredo = fundo.integracaoWebhookSecret;
  let segredoNovo: string | undefined;
  if (tipo !== "nenhuma" && (!segredo || querTrocar)) {
    segredo = crypto.randomBytes(32).toString("base64url");
    segredoNovo = segredo;
  }

  await db
    .update(fundos)
    .set({
      integracaoTipo: tipo,
      integracaoAmbiente: ambiente,
      integracaoApiUrl: apiUrl || null,
      integracaoCredenciais: (credenciais ?? null) as never,
      integracaoContrato: (contrato ?? null) as never,
      integracaoWebhookSecret: segredo,
      updatedAt: new Date(),
    })
    .where(eq(fundos.id, fundoId));

  audit({
    action: "update_integracao_fundo",
    targetType: "fundo",
    targetId: fundoId,
    targetLabel: fundo.razaoSocial,
    metadata: { tipo, ambiente, segredoTrocado: Boolean(segredoNovo) },
  }).catch(() => undefined);

  revalidatePath(`/admin/fundos/${fundoId}`);
  revalidatePath(`/admin/fundos/${fundoId}/integracao`);
  revalidatePath("/admin/integracao");
  return { ok: true, segredo: segredoNovo };
}

export async function testarConexaoFundoAction(fundoId: string) {
  await requireAdmin();
  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  if (!fundo) return { ok: false, detalhe: "Fundo não encontrado" };
  if (fundo.integracaoTipo === "nenhuma")
    return { ok: false, detalhe: "Integração não está ativa neste fundo" };

  const r = await testarConexao(fundo);
  revalidatePath(`/admin/fundos/${fundoId}/integracao`);
  return {
    ok: r.ok,
    detalhe: r.ok
      ? `Conectou em ${r.duracaoMs} ms (HTTP ${r.status})`
      : (r.erro ?? `HTTP ${r.status}`),
  };
}

/** O contrato padrão em JSON, pra o admin usar como ponto de partida na tela. */
export async function contratoPadraoJson() {
  return JSON.stringify(DEFAULT_CONTRATO, null, 2);
}

/* ─────────────────────────────────────────────
   AÇÕES SOBRE UMA OPERAÇÃO
   ───────────────────────────────────────────── */

export async function enviarOperacaoParaFundoAction(operacaoId: string) {
  await requireAdmin();
  const r = await iniciarIntegracaoDaOperacao(operacaoId);
  if (!r.ok) return { ok: false, detalhe: r.motivo ?? "Não foi possível iniciar" };

  // Roda a fila na hora pra o admin ver o resultado sem esperar o cron.
  await processarFilaOpera({ limit: 5 }).catch(() => undefined);

  revalidatePath(`/admin/operacoes/${operacaoId}`);
  return {
    ok: true,
    detalhe:
      r.jobs > 0
        ? `${r.jobs} etapa(s) na fila de envio`
        : "Nada novo a enviar — já estava em andamento",
  };
}

export async function reenviarOperacaoAction(operacaoId: string) {
  await requireAdmin();
  const [op] = await db
    .select({ fundoId: operacoes.fundoId })
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op?.fundoId) return { ok: false, detalhe: "Operação sem fundo vinculado" };

  await enfileirarJob({
    fundoId: op.fundoId,
    tipo: "enviar_operacao",
    refTipo: "operacao",
    refId: operacaoId,
    operacaoId,
    forcar: true,
  });
  await processarFilaOpera({ limit: 5 }).catch(() => undefined);

  revalidatePath(`/admin/operacoes/${operacaoId}`);
  return { ok: true, detalhe: "Reenvio enfileirado" };
}

export async function destravarJobAction(jobId: string) {
  await requireAdmin();
  await destravarJob(jobId);
  await processarFilaOpera({ limit: 5 }).catch(() => undefined);
  revalidatePath("/admin/integracao");
  return { ok: true, detalhe: "Job liberado para nova tentativa" };
}

export async function reprocessarEventoAction(eventoId: string) {
  await requireAdmin();
  const r = await reprocessarEvento(eventoId);
  revalidatePath("/admin/integracao");
  return r;
}

/** Casa manualmente uma duplicata com uma parcela — o que o automático não
 *  conseguiu resolver sozinho. */
export async function vincularDuplicataAction(
  duplicataId: string,
  parcelaId: string,
) {
  await requireAdmin();
  const [dup] = await db
    .select()
    .from(operaDuplicatas)
    .where(eq(operaDuplicatas.id, duplicataId))
    .limit(1);
  if (!dup) return { ok: false, detalhe: "Duplicata não encontrada" };

  const [parcela] = await db
    .select()
    .from(parcelasComissao)
    .where(
      and(
        eq(parcelasComissao.id, parcelaId),
        eq(parcelasComissao.operacaoId, dup.operacaoId),
      ),
    )
    .limit(1);
  if (!parcela)
    return { ok: false, detalhe: "Parcela não pertence a esta operação" };

  await db
    .update(operaDuplicatas)
    .set({ parcelaId, updatedAt: new Date() })
    .where(eq(operaDuplicatas.id, duplicataId));

  if (dup.linkExterno) {
    await db
      .update(parcelasComissao)
      .set({
        boletoUrl: dup.linkExterno,
        linhaDigitavel: dup.linhaDigitavel ?? parcela.linhaDigitavel,
        cobrancaStatus: "emitida",
      })
      .where(eq(parcelasComissao.id, parcelaId));
  }

  revalidatePath(`/admin/operacoes/${dup.operacaoId}`);
  return { ok: true, detalhe: "Duplicata vinculada à parcela" };
}

/* ─────────────────────────────────────────────
   LEITURA
   ───────────────────────────────────────────── */

/** Tudo que a aba OPERA da operação mostra: o que enviamos, o que voltou e
 *  em que pé está cada etapa. */
export async function getIntegracaoDaOperacao(operacaoId: string) {
  const user = await getCurrentDbUser();
  if (!user) return null;

  const [op] = await db
    .select()
    .from(operacoes)
    .where(eq(operacoes.id, operacaoId))
    .limit(1);
  if (!op || !op.fundoId) return null;

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, op.fundoId))
    .limit(1);
  if (!fundo || fundo.integracaoTipo === "nenhuma") return null;

  const [espelho] = await db
    .select()
    .from(operaOperacoes)
    .where(eq(operaOperacoes.operacaoId, operacaoId))
    .limit(1);

  const entidadeIds = [op.construtoraId, op.imobiliariaId].filter(
    Boolean,
  ) as string[];
  const clientes = entidadeIds.length
    ? await db
        .select()
        .from(operaClientes)
        .where(
          and(
            eq(operaClientes.fundoId, fundo.id),
            inArray(operaClientes.entidadeId, entidadeIds),
          ),
        )
    : [];

  const jobs = await db
    .select()
    .from(operaJobs)
    .where(eq(operaJobs.operacaoId, operacaoId))
    .orderBy(desc(operaJobs.createdAt))
    .limit(20);

  const eventos = await db
    .select()
    .from(operaEventos)
    .where(eq(operaEventos.operacaoId, operacaoId))
    .orderBy(desc(operaEventos.createdAt))
    .limit(20);

  const duplicatas = await db
    .select()
    .from(operaDuplicatas)
    .where(eq(operaDuplicatas.operacaoId, operacaoId))
    .orderBy(operaDuplicatas.vencimento);

  return {
    fundo: {
      id: fundo.id,
      nome: fundo.razaoSocial,
      ambiente: fundo.integracaoAmbiente,
      ultimoOkEm: fundo.integracaoUltimoOkEm,
      ultimoErro: fundo.integracaoUltimoErro,
    },
    espelho: espelho ?? null,
    clientes,
    jobs,
    eventos,
    duplicatas,
  };
}

/** Painel de saúde: fundos integrados, fila e últimos eventos. */
export async function getPainelIntegracao() {
  await requireAdmin();

  const integrados = await db
    .select()
    .from(fundos)
    .where(sql`${fundos.integracaoTipo} <> 'nenhuma'`);

  const [contagem] = await db
    .select({
      pendentes: sql<number>`count(*) filter (where ${operaJobs.status} = 'pendente')`,
      processando: sql<number>`count(*) filter (where ${operaJobs.status} = 'processando')`,
      bloqueados: sql<number>`count(*) filter (where ${operaJobs.status} = 'bloqueado')`,
      desistidos: sql<number>`count(*) filter (where ${operaJobs.status} = 'desistido')`,
      concluidos: sql<number>`count(*) filter (where ${operaJobs.status} = 'concluido')`,
    })
    .from(operaJobs);

  const jobsTravados = await db
    .select()
    .from(operaJobs)
    .where(inArray(operaJobs.status, ["bloqueado", "desistido"]))
    .orderBy(desc(operaJobs.updatedAt))
    .limit(30);

  const eventosRecentes = await db
    .select()
    .from(operaEventos)
    .orderBy(desc(operaEventos.createdAt))
    .limit(30);

  const clientesPendentes = await db
    .select()
    .from(operaClientes)
    .where(inArray(operaClientes.situacao, ["em_analise", "reprovado", "erro"]))
    .orderBy(desc(operaClientes.updatedAt))
    .limit(30);

  // Rótulo humano de cada cliente pendente — CNPJ sozinho não diz nada.
  const rotulos = new Map<string, string>();
  for (const c of clientesPendentes) {
    if (c.entidadeTipo === "construtora") {
      const [x] = await db
        .select({ nome: construtoras.razaoSocial })
        .from(construtoras)
        .where(eq(construtoras.id, c.entidadeId))
        .limit(1);
      if (x) rotulos.set(c.id, x.nome);
    } else {
      const [x] = await db
        .select({ nome: imobiliarias.razaoSocial })
        .from(imobiliarias)
        .where(eq(imobiliarias.id, c.entidadeId))
        .limit(1);
      if (x) rotulos.set(c.id, x.nome);
    }
  }

  return {
    integrados,
    contagem: contagem ?? {
      pendentes: 0,
      processando: 0,
      bloqueados: 0,
      desistidos: 0,
      concluidos: 0,
    },
    jobsTravados,
    eventosRecentes,
    clientesPendentes: clientesPendentes.map((c) => ({
      ...c,
      rotulo: rotulos.get(c.id) ?? c.cnpj,
    })),
  };
}

/** Duplicatas visíveis pro cliente (construtora, imobiliária e cedente). */
export async function getDuplicatasDaOperacao(operacaoId: string) {
  const user = await getCurrentDbUser();
  if (!user) return [];
  return db
    .select()
    .from(operaDuplicatas)
    .where(eq(operaDuplicatas.operacaoId, operacaoId))
    .orderBy(operaDuplicatas.vencimento);
}
