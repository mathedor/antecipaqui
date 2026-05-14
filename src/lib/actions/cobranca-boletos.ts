"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  construtoras,
  fundos,
  operacaoCompradores,
  operacoes,
  parcelasComissao,
} from "@/db/schema";
import { getCurrentDbUser, requireAdmin } from "@/lib/auth-user";
import { refreshValorAtualizadoParcela } from "@/lib/cobranca-calculo";
import {
  gerarRemessa240,
  parseRetorno240,
  type CnabFundoConfig,
  type CnabParcelaRemessa,
} from "@/lib/cnab-240";

/* =========================================================================
   GERAÇÃO DE BOLETO (3 modos: api | cnab | manual)
   ========================================================================= */

export type GerarBoletoState =
  | { ok: false; error: string }
  | { ok: true; modo: "api" | "cnab" | "manual"; mensagem: string }
  | null;

/** Gera boleto pra UMA parcela. Comportamento depende do modo do fundo:
 *  - api:    chama URL configurada e armazena linha digitável + URL do PDF
 *  - cnab:   reserva nosso_numero e marca como pendente de gerar arquivo
 *  - manual: só registra que admin é responsável por gerar no banco */
export async function gerarBoletoParcela(parcelaId: string): Promise<GerarBoletoState> {
  await requireAdmin();

  const [row] = await db
    .select({
      parcela: parcelasComissao,
      operacao: operacoes,
      fundo: fundos,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .innerJoin(fundos, eq(fundos.id, operacoes.fundoId))
    .where(eq(parcelasComissao.id, parcelaId))
    .limit(1);

  if (!row) return { ok: false, error: "Parcela não encontrada" };
  if (row.parcela.status === "paga")
    return { ok: false, error: "Parcela já paga" };

  await refreshValorAtualizadoParcela(parcelaId);

  const modo = (row.fundo.boletosModo ?? "manual") as
    | "api"
    | "cnab"
    | "manual";

  if (modo === "api") {
    const url = row.fundo.cobrancaApiUrl;
    if (!url)
      return {
        ok: false,
        error: "Modo API selecionado, mas URL não configurada no fundo",
      };
    // STUB: integração real depende do banco específico. Quando configurar
    // um banco real, este bloco chama a API, parseia o retorno e armazena
    // linha_digitavel + boleto_url + cobranca_integracao_id.
    await db
      .update(parcelasComissao)
      .set({
        cobrancaStatus: "emitida",
        cobrancaUltimaTentativaEm: new Date(),
        cobrancaErroUltimo: null,
      })
      .where(eq(parcelasComissao.id, parcelaId));
    return {
      ok: true,
      modo,
      mensagem: `Endpoint configurado: ${url}. Integração específica do banco precisa ser implementada quando definir o provedor.`,
    };
  }

  if (modo === "cnab") {
    if (!row.parcela.nossoNumero) {
      // Reserva próximo nosso_numero atomicamente
      const [fAtualizado] = await db
        .update(fundos)
        .set({
          cnabProximoNossoNumero: sql`${fundos.cnabProximoNossoNumero} + 1`,
        })
        .where(eq(fundos.id, row.fundo.id))
        .returning({ proximo: fundos.cnabProximoNossoNumero });
      const nossoNumero = String(fAtualizado.proximo - 1).padStart(10, "0");
      await db
        .update(parcelasComissao)
        .set({
          nossoNumero,
          cobrancaStatus: "pendente",
          cobrancaUltimaTentativaEm: new Date(),
        })
        .where(eq(parcelasComissao.id, parcelaId));
    }
    return {
      ok: true,
      modo,
      mensagem:
        "Parcela na fila CNAB. Gere o arquivo de remessa em /admin/fundos/[id]/cnab.",
    };
  }

  await db
    .update(parcelasComissao)
    .set({
      cobrancaStatus: "emitida",
      cobrancaUltimaTentativaEm: new Date(),
    })
    .where(eq(parcelasComissao.id, parcelaId));
  return {
    ok: true,
    modo: "manual",
    mensagem:
      "Modo manual: emita o boleto no banco do fundo e cole a linha digitável se quiser registrar.",
  };
}

/* =========================================================================
   BAIXA MANUAL
   ========================================================================= */

export async function marcarParcelaPaga(
  parcelaId: string,
  valorPago: number,
  dataPagamento: string,
) {
  await requireAdmin();

  const [row] = await db
    .select({ parcela: parcelasComissao, operacao: operacoes })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .where(eq(parcelasComissao.id, parcelaId))
    .limit(1);

  await db
    .update(parcelasComissao)
    .set({
      status: "paga",
      pagoEm: dataPagamento,
      pagoValor: valorPago.toFixed(2),
      cobrancaStatus: "paga",
    })
    .where(eq(parcelasComissao.id, parcelaId));

  if (row) {
    const { snapshotScoreConstrutora } = await import("@/lib/score-snapshot");
    snapshotScoreConstrutora(row.operacao.construtoraId, {
      tipo: "parcela_paga",
      motivo: `Parcela ${row.parcela.numero} da op ${row.operacao.numero} paga`,
    }).catch((e) =>
      console.error("[score-snapshot] marcarParcelaPaga:", e),
    );

    const { enqueueWebhookEvento } = await import("@/lib/actions/webhooks");
    enqueueWebhookEvento({
      evento: "parcela_paga",
      fundoId: row.operacao.fundoId,
      payload: {
        operacaoId: row.operacao.id,
        operacaoNumero: row.operacao.numero,
        parcelaId: row.parcela.id,
        parcelaNumero: row.parcela.numero,
        valorPago,
        dataPagamento,
        fundoId: row.operacao.fundoId,
        construtoraId: row.operacao.construtoraId,
      },
    }).catch((e) =>
      console.error("[webhook] marcarParcelaPaga:", e),
    );
  }

  revalidatePath("/admin/relatorios/daily");
  revalidatePath("/admin/operacoes");
}

/* =========================================================================
   CNAB — gerar remessa
   ========================================================================= */

export async function gerarRemessaCnabPorFundo(fundoId: string): Promise<
  | { ok: true; conteudo: string; filename: string; qtdParcelas: number }
  | { ok: false; error: string }
> {
  await requireAdmin();

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, fundoId))
    .limit(1);
  if (!fundo) return { ok: false, error: "Fundo não encontrado" };
  if (fundo.boletosModo !== "cnab")
    return { ok: false, error: "Fundo não está configurado em modo CNAB" };
  if (
    !fundo.cnabBancoCodigo ||
    !fundo.cnabCarteira ||
    !fundo.cnabConvenio ||
    !fundo.cnabCedenteCodigo
  )
    return {
      ok: false,
      error:
        "Config CNAB incompleta (banco, carteira, convênio e código cedente).",
    };

  const rows = await db
    .select({
      parcela: parcelasComissao,
      operacao: operacoes,
      construtora: construtoras,
    })
    .from(parcelasComissao)
    .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
    .leftJoin(construtoras, eq(construtoras.id, operacoes.construtoraId))
    .where(
      and(
        eq(operacoes.fundoId, fundoId),
        sql`${parcelasComissao.nossoNumero} IS NOT NULL`,
        isNull(parcelasComissao.pagoEm),
      ),
    );

  if (rows.length === 0)
    return { ok: false, error: "Sem parcelas pendentes pra gerar remessa." };

  const parcelas: CnabParcelaRemessa[] = [];
  for (const r of rows) {
    let sacadoNome = r.construtora?.razaoSocial ?? "—";
    let sacadoDoc = r.construtora?.cnpj ?? "";

    if (r.operacao.pagadorTipo === "compradores") {
      const [primeiro] = await db
        .select()
        .from(operacaoCompradores)
        .where(eq(operacaoCompradores.operacaoId, r.operacao.id))
        .limit(1);
      if (primeiro) {
        sacadoNome = primeiro.nome;
        sacadoDoc = primeiro.documento;
      }
    }

    parcelas.push({
      nossoNumero: r.parcela.nossoNumero!,
      numeroDocumento: `${r.operacao.numero}-${r.parcela.numero}`,
      vencimento: r.parcela.vencimento,
      valor: parseFloat(r.parcela.valor),
      sacadoNome,
      sacadoCpfCnpj: sacadoDoc,
      sacadoEndereco: r.construtora?.endereco ?? null,
      sacadoCidade: r.construtora?.cidade ?? null,
      sacadoUf: r.construtora?.uf ?? null,
      sacadoCep: r.construtora?.cep ?? null,
    });
  }

  const config: CnabFundoConfig = {
    bancoCodigo: fundo.cnabBancoCodigo,
    carteira: fundo.cnabCarteira,
    convenio: fundo.cnabConvenio,
    cedenteCodigo: fundo.cnabCedenteCodigo,
    razaoSocial: fundo.razaoSocial,
    cnpj: fundo.cnpj,
    bancoAgencia: fundo.bancoAgencia,
    bancoConta: fundo.bancoConta,
  };

  const conteudo = gerarRemessa240({ fundo: config, parcelas });
  const ts = new Date().toISOString().replace(/[-:]/g, "").slice(0, 14);
  const filename = `remessa_${fundo.cnabBancoCodigo}_${ts}.rem`;

  await db
    .update(parcelasComissao)
    .set({
      cobrancaStatus: "emitida",
      cobrancaUltimaTentativaEm: new Date(),
    })
    .where(
      inArray(
        parcelasComissao.id,
        rows.map((r) => r.parcela.id),
      ),
    );

  return { ok: true, conteudo, filename, qtdParcelas: parcelas.length };
}

/* =========================================================================
   CNAB — importar retorno
   ========================================================================= */

export type ImportarRetornoState =
  | { ok: false; error: string }
  | {
      ok: true;
      total: number;
      baixadas: number;
      naoEncontradas: string[];
    }
  | null;

export async function importarRetornoCnab(
  fundoId: string,
  conteudo: string,
): Promise<ImportarRetornoState> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "admin")
    return { ok: false, error: "Acesso negado" };

  const liquidacoes = parseRetorno240(conteudo);
  if (liquidacoes.length === 0)
    return {
      ok: false,
      error:
        "Nenhum registro de liquidação no arquivo. Confira o layout e códigos de movimento (06/17/09).",
    };

  const naoEncontradas: string[] = [];
  let baixadas = 0;

  const { snapshotScoreConstrutora } = await import("@/lib/score-snapshot");
  const { enqueueWebhookEvento } = await import("@/lib/actions/webhooks");
  const construtorasTocadas = new Set<string>();

  for (const l of liquidacoes) {
    const [match] = await db
      .select({ parcela: parcelasComissao, operacao: operacoes })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(operacoes.id, parcelasComissao.operacaoId))
      .where(
        and(
          eq(parcelasComissao.nossoNumero, l.nossoNumero),
          eq(operacoes.fundoId, fundoId),
        ),
      )
      .limit(1);

    if (!match) {
      naoEncontradas.push(l.nossoNumero);
      continue;
    }
    if (match.parcela.status === "paga") continue;

    const dataPag =
      l.dataOcorrencia || new Date().toISOString().slice(0, 10);
    await db
      .update(parcelasComissao)
      .set({
        status: "paga",
        pagoEm: dataPag,
        pagoValor: l.valorPago.toFixed(2),
        cobrancaStatus: "paga",
      })
      .where(eq(parcelasComissao.id, match.parcela.id));
    baixadas++;
    construtorasTocadas.add(match.operacao.construtoraId);

    enqueueWebhookEvento({
      evento: "parcela_paga",
      fundoId,
      payload: {
        operacaoId: match.operacao.id,
        operacaoNumero: match.operacao.numero,
        parcelaId: match.parcela.id,
        parcelaNumero: match.parcela.numero,
        valorPago: l.valorPago,
        dataPagamento: dataPag,
        fundoId,
        construtoraId: match.operacao.construtoraId,
        origem: "cnab_retorno",
      },
    }).catch((e) =>
      console.error("[webhook] importarRetornoCnab:", e),
    );
  }

  // Snapshot deduplicado por construtora (1 por lote — score recalcula tudo)
  for (const cid of construtorasTocadas) {
    snapshotScoreConstrutora(cid, {
      tipo: "parcela_paga",
      motivo: `Lote CNAB do fundo (${baixadas} baixada${baixadas === 1 ? "" : "s"})`,
    }).catch((e) =>
      console.error("[score-snapshot] importarRetornoCnab:", e),
    );
  }

  revalidatePath("/admin/relatorios/daily");
  revalidatePath("/admin/operacoes");
  revalidatePath(`/admin/fundos/${fundoId}/cnab`);

  return {
    ok: true,
    total: liquidacoes.length,
    baixadas,
    naoEncontradas,
  };
}
