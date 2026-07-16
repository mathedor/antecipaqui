/**
 * CÍCERO — o atendente de peso da Antecipaqui. 👔
 *
 * Agente de IA (Claude + tool-calling) com ferramentas escopadas por role:
 *  - imobiliária/corretor: operações, vencimentos, cálculo e pré-cadastro
 *  - construtora: duplicatas, vencimentos e dados de pagamento
 *  - fundo: consultas + faturamento do dia, inadimplência e disparo de cobrança
 *  - admin: cruzamento de dados global, desempenho de fundos, resumo da casa
 *
 * Segurança: cada tool roda SQL escopado pela identidade do usuário no
 * servidor — o modelo nunca escreve SQL nem vê dados fora do escopo. As
 * tools disponíveis já são filtradas por role ANTES de chegar ao modelo.
 * Todos os logs (conversas, mensagens, tools usadas e tokens) ficam em
 * cicero_conversas / cicero_mensagens + audit_logs.
 */

import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  comerciais,
  comissoesComercial,
  construtoraMembros,
  construtoras,
  fundos,
  imobiliariaMembros,
  imobiliarias,
  operacaoCompradores,
  operacoes,
  parcelasComissao,
  users,
  type Fundo,
  type User,
} from "@/db/schema";
import { formatBRL, valorPresente } from "@/lib/format";
import { calcularValorAtualizado } from "@/lib/cobranca-calculo";
import { sendEmail } from "@/lib/email";

/* =========================================
   Tipos
   ========================================= */

export type CiceroResposta = {
  texto: string;
  links?: { label: string; href: string }[];
  respostas?: string[];
};

export type CiceroMeta = {
  toolsUsadas: { tool: string; args: Record<string, unknown> }[];
  modelo: string;
  inputTokens: number;
  outputTokens: number;
};

export type CiceroCtx = {
  user: User;
  hoje: string; // YYYY-MM-DD (America/Sao_Paulo)
  fundo: Fundo | null;
  construtoraIds: string[];
  imobiliariaId: string | null;
  imobCanSeeAll: boolean;
  comercialId: string | null;
};

type ToolArgs = Record<string, unknown>;

type CiceroTool = {
  nome: string;
  descricao: string;
  /** Roles que enxergam a tool. null = todas. */
  roles: User["role"][] | null;
  schema: { properties: Record<string, unknown>; required?: string[] };
  run: (ctx: CiceroCtx, args: ToolArgs) => Promise<CiceroResposta>;
};

/* =========================================
   Helpers
   ========================================= */

const MODEL = process.env.CICERO_MODEL || "claude-opus-4-8";

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aguardando_aprovacao: "Aguardando aprovação",
  documentos_incompletos: "Documentos incompletos",
  pre_aprovada: "Pré-aprovada",
  analise_final: "Análise final",
  recusada: "Recusada",
  enviada_para_assinatura: "Em assinatura",
  enviada_para_pagamento: "Enviada p/ pagamento",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

function hojeSP(): string {
  return new Date().toLocaleDateString("sv-SE", {
    timeZone: "America/Sao_Paulo",
  });
}

function fmtData(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso + (iso.length === 10 ? "T12:00:00" : "")) : iso;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function diasEntre(deISO: string, ateISO: string): number {
  const de = new Date(deISO + "T00:00:00");
  const ate = new Date(ateISO + "T00:00:00");
  return Math.round((ate.getTime() - de.getTime()) / 86_400_000);
}

function n(v: string | number | null | undefined): number {
  const x = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function basePath(ctx: CiceroCtx): string {
  return ctx.user.role === "admin" ? "/admin" : "/painel";
}

/** Condição de escopo pra `operacoes` conforme a identidade do usuário.
 *  Retorna undefined pra admin (vê tudo). */
function opsWhere(ctx: CiceroCtx): SQL | undefined {
  const { user } = ctx;
  if (user.role === "admin") return undefined;
  if (user.role === "fundo") {
    // fundo sem cadastro vinculado não vê nada
    return ctx.fundo ? eq(operacoes.fundoId, ctx.fundo.id) : sql`false`;
  }
  if (user.role === "construtora") {
    return ctx.construtoraIds.length > 0
      ? inArray(operacoes.construtoraId, ctx.construtoraIds)
      : sql`false`;
  }
  if (user.role === "comercial") {
    return ctx.comercialId ? eq(operacoes.comercialId, ctx.comercialId) : sql`false`;
  }
  // corretor / imobiliária
  const conds: SQL[] = [
    eq(operacoes.corretorUserId, user.id),
    eq(operacoes.corretorAtendenteUserId, user.id),
  ];
  if (ctx.imobiliariaId && ctx.imobCanSeeAll) {
    conds.push(eq(operacoes.imobiliariaId, ctx.imobiliariaId));
  }
  return or(...conds)!;
}

/* =========================================
   Contexto (escopo do usuário)
   ========================================= */

export async function buildCiceroCtx(user: User): Promise<CiceroCtx> {
  const ctx: CiceroCtx = {
    user,
    hoje: hojeSP(),
    fundo: null,
    construtoraIds: [],
    imobiliariaId: null,
    imobCanSeeAll: false,
    comercialId: null,
  };

  if (user.role === "fundo") {
    const [f] = await db
      .select()
      .from(fundos)
      .where(eq(fundos.ownerUserId, user.id))
      .limit(1);
    ctx.fundo = f ?? null;
  } else if (user.role === "construtora") {
    const own = await db
      .select({ id: construtoras.id })
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, user.id));
    const membro = await db
      .select({ id: construtoraMembros.construtoraId })
      .from(construtoraMembros)
      .where(eq(construtoraMembros.userId, user.id));
    ctx.construtoraIds = [...new Set([...own, ...membro].map((r) => r.id))];
  } else if (user.role === "comercial") {
    const [c] = await db
      .select({ id: comerciais.id })
      .from(comerciais)
      .where(eq(comerciais.ownerUserId, user.id))
      .limit(1);
    ctx.comercialId = c?.id ?? null;
  } else if (user.role === "corretor" || user.role === "imobiliaria") {
    const [own] = await db
      .select({ id: imobiliarias.id })
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, user.id))
      .limit(1);
    if (own) {
      ctx.imobiliariaId = own.id;
      ctx.imobCanSeeAll = true;
    } else {
      const [m] = await db
        .select({
          imobiliariaId: imobiliariaMembros.imobiliariaId,
          roleInterna: imobiliariaMembros.roleInterna,
        })
        .from(imobiliariaMembros)
        .where(
          and(
            eq(imobiliariaMembros.userId, user.id),
            sql`${imobiliariaMembros.removedAt} IS NULL`,
          ),
        )
        .limit(1);
      if (m) {
        ctx.imobiliariaId = m.imobiliariaId;
        ctx.imobCanSeeAll = ["owner", "gerente", "financeiro"].includes(m.roleInterna);
      }
    }
  }
  return ctx;
}

/* =========================================
   FERRAMENTAS
   ========================================= */

const listarOperacoes: CiceroTool = {
  nome: "listar_operacoes",
  descricao:
    "Lista as operações do usuário (escopo automático por role), opcionalmente filtrando por status. Use pra 'minhas operações', 'o que tenho em aberto', 'operações realizadas', etc.",
  roles: null,
  schema: {
    properties: {
      status: {
        type: "string",
        enum: Object.keys(STATUS_LABEL),
        description: "Filtra por status da operação (opcional).",
      },
      limite: { type: "integer", description: "Máx. de itens (default 8, máx 20)." },
    },
  },
  run: async (ctx, args) => {
    const limite = Math.min(Math.max(Number(args.limite) || 8, 1), 20);
    const conds: (SQL | undefined)[] = [opsWhere(ctx)];
    if (typeof args.status === "string" && args.status in STATUS_LABEL) {
      conds.push(eq(operacoes.status, args.status as keyof typeof STATUS_LABEL & typeof operacoes.status.enumValues[number]));
    }
    const where = and(...conds.filter(Boolean) as SQL[]);

    const rows = await db
      .select({
        id: operacoes.id,
        numero: operacoes.numero,
        status: operacoes.status,
        valorComissao: operacoes.valorComissao,
        valorPresente: operacoes.valorPresente,
        desagio: operacoes.desagio,
        dataVenda: operacoes.dataVenda,
        construtoraNome: construtoras.razaoSocial,
        fundoNome: fundos.nomeFantasia,
      })
      .from(operacoes)
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
      .where(where)
      .orderBy(desc(operacoes.createdAt))
      .limit(limite);

    if (rows.length === 0) {
      return { texto: "Nenhuma operação encontrada nesse filtro." };
    }
    const linhas = rows.map(
      (r) =>
        `${r.numero} · ${r.construtoraNome ?? "—"} · comissão ${formatBRL(n(r.valorComissao))} · líquido ${formatBRL(n(r.valorPresente))} · ${STATUS_LABEL[r.status] ?? r.status}`,
    );
    return {
      texto: `${rows.length} operação(ões):\n${linhas.join("\n")}`,
      links: [{ label: "Ver operações", href: `${basePath(ctx)}/operacoes` }],
    };
  },
};

const detalheOperacao: CiceroTool = {
  nome: "detalhe_operacao",
  descricao:
    "Detalha uma operação específica pelo número (ex: OP-2026-0012), incluindo valores, taxa, deságio, status e todas as parcelas com vencimentos.",
  roles: null,
  schema: {
    properties: {
      numero: {
        type: "string",
        description: "Número da operação. Aceita 'OP-2026-0012' ou só '12'.",
      },
    },
    required: ["numero"],
  },
  run: async (ctx, args) => {
    const bruto = String(args.numero ?? "").trim().toUpperCase();
    const soDigitos = bruto.replace(/\D/g, "");
    const condNumero = bruto.startsWith("OP-")
      ? eq(operacoes.numero, bruto)
      : sql`${operacoes.numero} ILIKE ${"%" + soDigitos.padStart(4, "0")}`;

    const where = and(...[opsWhere(ctx), condNumero].filter(Boolean) as SQL[]);
    const [op] = await db
      .select({
        id: operacoes.id,
        numero: operacoes.numero,
        status: operacoes.status,
        valorVenda: operacoes.valorVenda,
        valorComissao: operacoes.valorComissao,
        valorPresente: operacoes.valorPresente,
        desagio: operacoes.desagio,
        taxaMensal: operacoes.taxaMensal,
        dataVenda: operacoes.dataVenda,
        numeroParcelas: operacoes.numeroParcelas,
        motivoRecusa: operacoes.motivoRecusa,
        motivoPendencia: operacoes.motivoPendencia,
        pagadorTipo: operacoes.pagadorTipo,
        construtoraNome: construtoras.razaoSocial,
        fundoNome: fundos.nomeFantasia,
      })
      .from(operacoes)
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
      .where(where)
      .limit(1);

    if (!op) {
      return {
        texto: `Não encontrei a operação "${bruto}" no seu escopo. Confere o número?`,
      };
    }

    const parcelas = await db
      .select()
      .from(parcelasComissao)
      .where(eq(parcelasComissao.operacaoId, op.id))
      .orderBy(parcelasComissao.numero);

    const linhasParcelas = parcelas.map((p) => {
      const atraso = diasEntre(p.vencimento, ctx.hoje);
      const situacao =
        p.status === "paga"
          ? `paga em ${fmtData(p.pagoEm)} (${formatBRL(n(p.pagoValor ?? p.valor))})`
          : p.status === "cancelada"
            ? "cancelada"
            : atraso > 0
              ? `VENCIDA há ${atraso} dia(s)`
              : `vence em ${fmtData(p.vencimento)}`;
      return `  #${p.numero}: ${formatBRL(n(p.valor))} — ${situacao}${p.linhaDigitavel ? " · boleto emitido" : ""}`;
    });

    const texto = [
      `${op.numero} · ${STATUS_LABEL[op.status] ?? op.status}`,
      `Construtora: ${op.construtoraNome ?? "—"} · Fundo: ${op.fundoNome ?? "—"}`,
      `Venda ${formatBRL(n(op.valorVenda))} em ${fmtData(op.dataVenda)} · Comissão ${formatBRL(n(op.valorComissao))}`,
      `Taxa ${(n(op.taxaMensal) * 100).toFixed(2)}% a.m. · Deságio ${formatBRL(n(op.desagio))} · Líquido ${formatBRL(n(op.valorPresente))}`,
      op.motivoPendencia ? `Pendência: ${op.motivoPendencia}` : "",
      op.motivoRecusa ? `Motivo da recusa: ${op.motivoRecusa}` : "",
      `Parcelas (pagador: ${op.pagadorTipo}):`,
      ...linhasParcelas,
    ].filter(Boolean);

    return {
      texto: texto.join("\n"),
      links: [
        ctx.user.role === "admin"
          ? { label: `Editar ${op.numero}`, href: `/admin/operacoes/${op.id}/editar` }
          : { label: `Abrir ${op.numero}`, href: `/painel/operacoes/${op.id}` },
      ],
    };
  },
};

const proximosVencimentos: CiceroTool = {
  nome: "proximos_vencimentos",
  descricao:
    "Lista parcelas a vencer nos próximos N dias e as que já estão vencidas, com totais. Use pra 'próximos vencimentos', 'o que vence esse mês', 'o que está atrasado'.",
  roles: null,
  schema: {
    properties: {
      dias: { type: "integer", description: "Janela em dias à frente (default 30)." },
    },
  },
  run: async (ctx, args) => {
    const dias = Math.min(Math.max(Number(args.dias) || 30, 1), 365);
    const limiteData = new Date(ctx.hoje + "T00:00:00");
    limiteData.setDate(limiteData.getDate() + dias);
    const limiteISO = limiteData.toLocaleDateString("sv-SE");

    const scope = opsWhere(ctx);
    const rows = await db
      .select({
        numeroParc: parcelasComissao.numero,
        valor: parcelasComissao.valor,
        vencimento: parcelasComissao.vencimento,
        status: parcelasComissao.status,
        opNumero: operacoes.numero,
        construtoraNome: construtoras.razaoSocial,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .where(
        and(
          ...[
            scope,
            inArray(parcelasComissao.status, ["a_vencer", "vencida"]),
            lte(parcelasComissao.vencimento, limiteISO),
          ].filter(Boolean) as SQL[],
        ),
      )
      .orderBy(parcelasComissao.vencimento)
      .limit(30);

    if (rows.length === 0) {
      return { texto: `Nada vencendo nos próximos ${dias} dias e nenhuma parcela em atraso. ✅` };
    }

    const vencidas = rows.filter((r) => diasEntre(r.vencimento, ctx.hoje) > 0);
    const aVencer = rows.filter((r) => diasEntre(r.vencimento, ctx.hoje) <= 0);
    const totalVencidas = vencidas.reduce((s, r) => s + n(r.valor), 0);
    const totalAVencer = aVencer.reduce((s, r) => s + n(r.valor), 0);

    const fmt = (r: (typeof rows)[number]) => {
      const d = diasEntre(r.vencimento, ctx.hoje);
      return `  ${r.opNumero} #${r.numeroParc} · ${r.construtoraNome ?? "—"} · ${formatBRL(n(r.valor))} · ${d > 0 ? `vencida há ${d} dia(s)` : `vence ${fmtData(r.vencimento)}`}`;
    };

    const texto = [
      vencidas.length > 0
        ? `🚨 ${vencidas.length} parcela(s) VENCIDA(S) somando ${formatBRL(totalVencidas)}:\n${vencidas.slice(0, 10).map(fmt).join("\n")}`
        : "Nenhuma parcela vencida. ✅",
      aVencer.length > 0
        ? `Próximos ${dias} dias: ${aVencer.length} parcela(s) somando ${formatBRL(totalAVencer)}:\n${aVencer.slice(0, 12).map(fmt).join("\n")}`
        : `Nada mais vencendo nos próximos ${dias} dias.`,
    ];
    return { texto: texto.join("\n\n") };
  },
};

const calcularOperacao: CiceroTool = {
  nome: "calcular_operacao",
  descricao:
    "Simula uma antecipação: calcula o valor presente (líquido), o deságio e o detalhamento por parcela. Ex.: 'calcula 100 mil em 30/60/90 dias'. Se o usuário der só o total e os prazos, divida em parcelas iguais.",
  roles: null,
  schema: {
    properties: {
      valor_comissao: {
        type: "number",
        description: "Valor total da comissão a antecipar, em reais.",
      },
      prazos_dias: {
        type: "array",
        items: { type: "integer" },
        description: "Prazos de vencimento de cada parcela em dias (ex: [30,60,90]).",
      },
      valores_parcelas: {
        type: "array",
        items: { type: "number" },
        description:
          "Opcional: valor de cada parcela (mesma ordem dos prazos). Se omitido, parcelas iguais.",
      },
      taxa_mensal_pct: {
        type: "number",
        description:
          "Opcional: taxa mensal em % (ex: 6 = 6% a.m.). Default: taxa padrão do fundo/plataforma.",
      },
    },
    required: ["valor_comissao", "prazos_dias"],
  },
  run: async (ctx, args) => {
    const total = Number(args.valor_comissao) || 0;
    const prazos = (Array.isArray(args.prazos_dias) ? args.prazos_dias : [])
      .map((p) => Number(p))
      .filter((p) => Number.isFinite(p) && p > 0 && p <= 365);
    if (total <= 0 || prazos.length === 0) {
      return { texto: "Preciso do valor total e dos prazos em dias (ex: 100000 em 30/60/90)." };
    }
    if (prazos.length > 12) prazos.length = 12;

    let taxa = Number(args.taxa_mensal_pct);
    if (Number.isFinite(taxa) && taxa > 0) {
      taxa = taxa > 1 ? taxa / 100 : taxa; // aceita 6 ou 0.06
    } else {
      taxa = ctx.fundo ? n(ctx.fundo.taxaOperacaoPadrao) : 0.06;
    }

    const valoresRaw = Array.isArray(args.valores_parcelas)
      ? (args.valores_parcelas as unknown[]).map((v) => Number(v))
      : null;
    const valores =
      valoresRaw && valoresRaw.length === prazos.length && valoresRaw.every((v) => v > 0)
        ? valoresRaw
        : prazos.map(() => total / prazos.length);

    const parcelas = prazos.map((dias, i) => ({
      valor: valores[i],
      mesesAteVencimento: dias / 30,
    }));
    const vp = valorPresente(parcelas, taxa);
    const desagio = valores.reduce((s, v) => s + v, 0) - vp;

    const linhas = parcelas.map((p, i) => {
      const vpParc = p.valor / Math.pow(1 + taxa, p.mesesAteVencimento);
      return `  #${i + 1}: ${formatBRL(p.valor)} em ${prazos[i]} dias → líquido ${formatBRL(vpParc)}`;
    });

    return {
      texto: [
        `Simulação a ${(taxa * 100).toFixed(2)}% a.m. (juros compostos):`,
        ...linhas,
        `Total: ${formatBRL(total)} · Deságio: ${formatBRL(desagio)} · **Líquido: ${formatBRL(vp)}**`,
        `Valores estimados — não incluem custos da operação e dependem de aprovação.`,
      ].join("\n"),
    };
  },
};

const prepararCadastro: CiceroTool = {
  nome: "preparar_cadastro_operacao",
  descricao:
    "Prepara o cadastro de uma nova operação: valida os dados, mostra a simulação e envia o link do formulário. Os contratos (venda + comissionamento) precisam ser anexados no formulário — o cadastro não pode ser concluído pelo chat.",
  roles: ["corretor", "imobiliaria"],
  schema: {
    properties: {
      valor_venda: { type: "number", description: "Valor da venda do imóvel (R$)." },
      valor_comissao: { type: "number", description: "Valor da comissão a antecipar (R$)." },
      numero_parcelas: {
        type: "integer",
        description: "Quantidade de parcelas (1 a 4, vencimentos em até 120 dias).",
      },
    },
    required: ["valor_comissao"],
  },
  run: async (ctx, args) => {
    const valorVenda = Number(args.valor_venda) || 0;
    const valorComissao = Number(args.valor_comissao) || 0;
    const nParcelas = Math.min(Math.max(Number(args.numero_parcelas) || 1, 1), 4);

    const problemas: string[] = [];
    if (valorComissao <= 0) problemas.push("valor da comissão inválido");
    if (valorVenda > 0 && valorComissao > valorVenda)
      problemas.push("comissão maior que o valor da venda");
    if (problemas.length > 0) {
      return { texto: `Antes de cadastrar, ajusta isso aqui: ${problemas.join("; ")}.` };
    }

    const taxa = 0.06;
    const prazos = Array.from({ length: nParcelas }, (_, i) => (i + 1) * 30);
    const vp = valorPresente(
      prazos.map((d) => ({ valor: valorComissao / nParcelas, mesesAteVencimento: d / 30 })),
      taxa,
    );

    return {
      texto: [
        `Fechado! Resumo do cadastro:`,
        valorVenda > 0 ? `Venda: ${formatBRL(valorVenda)}` : "",
        `Comissão: ${formatBRL(valorComissao)} em ${nParcelas} parcela(s) (30 em 30 dias)`,
        `Estimativa de líquido a ${(taxa * 100).toFixed(0)}% a.m.: ~${formatBRL(vp)} (deságio ~${formatBRL(valorComissao - vp)})`,
        ``,
        `Regras: máx. 4 parcelas, vencendo em até 120 dias, e a soma das parcelas deve bater com a comissão.`,
        `Pra concluir, preencha o formulário e anexe o contrato de compra e venda + contrato de comissionamento:`,
      ]
        .filter(Boolean)
        .join("\n"),
      links: [{ label: "Cadastrar operação", href: "/painel/operacoes/nova" }],
    };
  },
};

const dadosPagamento: CiceroTool = {
  nome: "dados_pagamento",
  descricao:
    "Retorna os dados pra pagamento das parcelas em aberto (boleto/linha digitável quando emitido, senão dados bancários e PIX do fundo), com valor atualizado de multa e juros quando em atraso. Use quando a construtora pedir 'como pago', 'dados de pagamento', 'segunda via'.",
  roles: ["construtora", "admin"],
  schema: {
    properties: {
      numero_operacao: {
        type: "string",
        description: "Opcional: limita a uma operação específica (ex: OP-2026-0012).",
      },
    },
  },
  run: async (ctx, args) => {
    const conds: (SQL | undefined)[] = [
      opsWhere(ctx),
      inArray(parcelasComissao.status, ["a_vencer", "vencida"]),
    ];
    if (typeof args.numero_operacao === "string" && args.numero_operacao.trim()) {
      const bruto = args.numero_operacao.trim().toUpperCase();
      const dig = bruto.replace(/\D/g, "");
      conds.push(
        bruto.startsWith("OP-")
          ? eq(operacoes.numero, bruto)
          : sql`${operacoes.numero} ILIKE ${"%" + dig.padStart(4, "0")}`,
      );
    }

    const rows = await db
      .select({
        parcelaNumero: parcelasComissao.numero,
        valor: parcelasComissao.valor,
        vencimento: parcelasComissao.vencimento,
        linhaDigitavel: parcelasComissao.linhaDigitavel,
        boletoUrl: parcelasComissao.boletoUrl,
        opNumero: operacoes.numero,
        fundoNome: fundos.nomeFantasia,
        fundoRazao: fundos.razaoSocial,
        multaPct: fundos.multaAtrasoPct,
        jurosPct: fundos.jurosMoraMensalPct,
        bancoNome: fundos.bancoNome,
        bancoAgencia: fundos.bancoAgencia,
        bancoConta: fundos.bancoConta,
        bancoPix: fundos.bancoPix,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
      .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
      .where(and(...conds.filter(Boolean) as SQL[]))
      .orderBy(parcelasComissao.vencimento)
      .limit(12);

    if (rows.length === 0) {
      return { texto: "Nenhuma parcela em aberto encontrada. Tudo em dia. ✅" };
    }

    const blocos = rows.map((r) => {
      const va = calcularValorAtualizado({
        valorOriginal: n(r.valor),
        vencimento: r.vencimento,
        multaAtrasoPct: n(r.multaPct ?? 0.02),
        jurosMoraMensalPct: n(r.jurosPct ?? 0.01),
      });
      const valorLinha =
        va.diasAtraso > 0
          ? `${formatBRL(va.valorAtualizado)} (original ${formatBRL(va.valorOriginal)} + multa ${formatBRL(va.multa)} + mora ${formatBRL(va.jurosMora)}, ${va.diasAtraso} dia(s) de atraso)`
          : `${formatBRL(va.valorOriginal)} — vence ${fmtData(r.vencimento)}`;
      const pagamento = r.linhaDigitavel
        ? `Boleto: ${r.linhaDigitavel}${r.boletoUrl ? ` · PDF: ${r.boletoUrl}` : ""}`
        : [
            r.bancoPix ? `PIX: ${r.bancoPix}` : "",
            r.bancoNome
              ? `Banco: ${r.bancoNome} · Ag ${r.bancoAgencia ?? "—"} · Conta ${r.bancoConta ?? "—"} (${r.fundoRazao ?? r.fundoNome ?? "fundo"})`
              : "",
          ]
            .filter(Boolean)
            .join("\n    ") || "Dados bancários ainda não cadastrados — fale com o suporte.";
      return `${r.opNumero} #${r.parcelaNumero}: ${valorLinha}\n    ${pagamento}`;
    });

    return {
      texto: [
        `${rows.length} parcela(s) em aberto:`,
        ...blocos,
        `Após pagar, anexe o comprovante na duplicata pra dar baixa.`,
      ].join("\n\n"),
      links: [{ label: "Minhas duplicatas", href: `${basePath(ctx)}/duplicatas` }],
    };
  },
};

const faturamentoDia: CiceroTool = {
  nome: "faturamento_dia",
  descricao:
    "Faturamento do dia: parcelas recebidas (baixadas) na data e operações aprovadas na data, com volumes. Admin vê o consolidado da plataforma com quebra por fundo.",
  roles: ["fundo", "admin"],
  schema: {
    properties: {
      data: {
        type: "string",
        description: "Data no formato YYYY-MM-DD (default: hoje).",
      },
    },
  },
  run: async (ctx, args) => {
    const data =
      typeof args.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.data)
        ? args.data
        : ctx.hoje;
    const scope = opsWhere(ctx);

    const [receb] = await db
      .select({
        qtd: sql<number>`count(*)`,
        total: sql<string>`coalesce(sum(coalesce(${parcelasComissao.pagoValor}, ${parcelasComissao.valor})), 0)`,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
      .where(
        and(
          ...[scope, eq(parcelasComissao.status, "paga"), eq(parcelasComissao.pagoEm, data)].filter(
            Boolean,
          ) as SQL[],
        ),
      );

    const aprovadasCond =
      ctx.user.role === "fundo"
        ? sql`(${operacoes.fundoAprovadoEm} AT TIME ZONE 'America/Sao_Paulo')::date = ${data}`
        : sql`(${operacoes.aprovadoEm} AT TIME ZONE 'America/Sao_Paulo')::date = ${data}`;
    const [aprov] = await db
      .select({
        qtd: sql<number>`count(*)`,
        total: sql<string>`coalesce(sum(${operacoes.valorComissao}), 0)`,
      })
      .from(operacoes)
      .where(and(...[scope, aprovadasCond].filter(Boolean) as SQL[]));

    const partes = [
      `📅 ${fmtData(data)}:`,
      `Recebido no dia: ${formatBRL(n(receb?.total))} em ${Number(receb?.qtd ?? 0)} parcela(s) baixada(s).`,
      `Operações aprovadas no dia: ${Number(aprov?.qtd ?? 0)} somando ${formatBRL(n(aprov?.total))} de comissão.`,
    ];

    if (ctx.user.role === "admin") {
      const porFundo = await db
        .select({
          fundoNome: sql<string>`coalesce(${fundos.nomeFantasia}, ${fundos.razaoSocial}, 'Sem fundo')`,
          total: sql<string>`coalesce(sum(coalesce(${parcelasComissao.pagoValor}, ${parcelasComissao.valor})), 0)`,
          qtd: sql<number>`count(*)`,
        })
        .from(parcelasComissao)
        .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
        .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
        .where(and(eq(parcelasComissao.status, "paga"), eq(parcelasComissao.pagoEm, data)))
        .groupBy(sql`1`)
        .orderBy(sql`2 desc`);
      if (porFundo.length > 0) {
        partes.push(
          `Por fundo: ${porFundo.map((f) => `${f.fundoNome} ${formatBRL(n(f.total))} (${f.qtd})`).join(" · ")}`,
        );
      }
    }
    return { texto: partes.join("\n") };
  },
};

const inadimplencia: CiceroTool = {
  nome: "inadimplencia",
  descricao:
    "Panorama da inadimplência: parcelas vencidas e não pagas, total original, estimativa atualizada com multa/juros e os maiores atrasos. Admin vê quebra por fundo.",
  roles: ["fundo", "admin"],
  schema: { properties: {} },
  run: async (ctx) => {
    const scope = opsWhere(ctx);
    const rows = await db
      .select({
        valor: parcelasComissao.valor,
        vencimento: parcelasComissao.vencimento,
        opNumero: operacoes.numero,
        construtoraNome: construtoras.razaoSocial,
        fundoNome: sql<string>`coalesce(${fundos.nomeFantasia}, ${fundos.razaoSocial}, 'Sem fundo')`,
        multaPct: fundos.multaAtrasoPct,
        jurosPct: fundos.jurosMoraMensalPct,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
      .where(
        and(
          ...[
            scope,
            inArray(parcelasComissao.status, ["a_vencer", "vencida"]),
            lt(parcelasComissao.vencimento, ctx.hoje),
          ].filter(Boolean) as SQL[],
        ),
      )
      .orderBy(parcelasComissao.vencimento)
      .limit(200);

    if (rows.length === 0) {
      return { texto: "Zero inadimplência — nenhuma parcela vencida em aberto. ✅" };
    }

    let totalOriginal = 0;
    let totalAtualizado = 0;
    const detalhes = rows.map((r) => {
      const va = calcularValorAtualizado({
        valorOriginal: n(r.valor),
        vencimento: r.vencimento,
        multaAtrasoPct: n(r.multaPct ?? 0.02),
        jurosMoraMensalPct: n(r.jurosPct ?? 0.01),
      });
      totalOriginal += va.valorOriginal;
      totalAtualizado += va.valorAtualizado;
      return { ...r, va };
    });

    const piores = [...detalhes]
      .sort((a, b) => b.va.diasAtraso - a.va.diasAtraso)
      .slice(0, 6)
      .map(
        (d) =>
          `  ${d.opNumero} · ${d.construtoraNome ?? "—"} · ${formatBRL(d.va.valorAtualizado)} · ${d.va.diasAtraso} dia(s) de atraso`,
      );

    const partes = [
      `🚨 ${rows.length} parcela(s) vencida(s): ${formatBRL(totalOriginal)} original → ${formatBRL(totalAtualizado)} atualizado (multa + mora).`,
      `Maiores atrasos:\n${piores.join("\n")}`,
    ];

    if (ctx.user.role === "admin") {
      const porFundo = new Map<string, { total: number; qtd: number }>();
      for (const d of detalhes) {
        const k = d.fundoNome ?? "Sem fundo";
        const cur = porFundo.get(k) ?? { total: 0, qtd: 0 };
        cur.total += d.va.valorAtualizado;
        cur.qtd += 1;
        porFundo.set(k, cur);
      }
      partes.push(
        `Por fundo: ${[...porFundo.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([k, v]) => `${k} ${formatBRL(v.total)} (${v.qtd})`)
          .join(" · ")}`,
      );
    }
    return { texto: partes.join("\n\n") };
  },
};

const dispararCobranca: CiceroTool = {
  nome: "disparar_cobranca_email",
  descricao:
    "Dispara email de cobrança pros devedores das parcelas VENCIDAS (construtora ou compradores, conforme a operação). IMPORTANTE: chame primeiro com confirmar=false pra mostrar a prévia; só chame com confirmar=true depois que o usuário confirmar explicitamente o disparo.",
  roles: ["fundo", "admin"],
  schema: {
    properties: {
      numero_operacao: {
        type: "string",
        description: "Opcional: cobra só as parcelas vencidas dessa operação.",
      },
      confirmar: {
        type: "boolean",
        description: "false = prévia (default). true = dispara os emails de fato.",
      },
    },
  },
  run: async (ctx, args) => {
    const conds: (SQL | undefined)[] = [
      opsWhere(ctx),
      inArray(parcelasComissao.status, ["a_vencer", "vencida"]),
      lt(parcelasComissao.vencimento, ctx.hoje),
    ];
    if (typeof args.numero_operacao === "string" && args.numero_operacao.trim()) {
      const bruto = args.numero_operacao.trim().toUpperCase();
      const dig = bruto.replace(/\D/g, "");
      conds.push(
        bruto.startsWith("OP-")
          ? eq(operacoes.numero, bruto)
          : sql`${operacoes.numero} ILIKE ${"%" + dig.padStart(4, "0")}`,
      );
    }

    const rows = await db
      .select({
        parcelaId: parcelasComissao.id,
        parcelaNumero: parcelasComissao.numero,
        valor: parcelasComissao.valor,
        vencimento: parcelasComissao.vencimento,
        linhaDigitavel: parcelasComissao.linhaDigitavel,
        boletoUrl: parcelasComissao.boletoUrl,
        opId: operacoes.id,
        opNumero: operacoes.numero,
        pagadorTipo: operacoes.pagadorTipo,
        construtoraNome: construtoras.razaoSocial,
        construtoraEmail: construtoras.email,
        fundoRazao: fundos.razaoSocial,
        multaPct: fundos.multaAtrasoPct,
        jurosPct: fundos.jurosMoraMensalPct,
        bancoPix: fundos.bancoPix,
        bancoNome: fundos.bancoNome,
        bancoAgencia: fundos.bancoAgencia,
        bancoConta: fundos.bancoConta,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .leftJoin(fundos, eq(operacoes.fundoId, fundos.id))
      .where(and(...conds.filter(Boolean) as SQL[]))
      .orderBy(parcelasComissao.vencimento)
      .limit(20);

    if (rows.length === 0) {
      return { texto: "Nenhuma parcela vencida pra cobrar. ✅" };
    }

    // Resolve destinatário de cada parcela
    const compradoresPorOp = new Map<string, { nome: string; email: string }[]>();
    const opsCompradores = [...new Set(rows.filter((r) => r.pagadorTipo === "compradores").map((r) => r.opId))];
    if (opsCompradores.length > 0) {
      const comps = await db
        .select({
          operacaoId: operacaoCompradores.operacaoId,
          nome: operacaoCompradores.nome,
          email: operacaoCompradores.email,
        })
        .from(operacaoCompradores)
        .where(inArray(operacaoCompradores.operacaoId, opsCompradores));
      for (const c of comps) {
        const arr = compradoresPorOp.get(c.operacaoId) ?? [];
        arr.push({ nome: c.nome, email: c.email });
        compradoresPorOp.set(c.operacaoId, arr);
      }
    }

    type Alvo = {
      row: (typeof rows)[number];
      destinatarios: { nome: string; email: string }[];
      va: ReturnType<typeof calcularValorAtualizado>;
    };
    const alvos: Alvo[] = [];
    const semEmail: string[] = [];
    for (const r of rows) {
      const va = calcularValorAtualizado({
        valorOriginal: n(r.valor),
        vencimento: r.vencimento,
        multaAtrasoPct: n(r.multaPct ?? 0.02),
        jurosMoraMensalPct: n(r.jurosPct ?? 0.01),
      });
      const dest =
        r.pagadorTipo === "compradores"
          ? (compradoresPorOp.get(r.opId) ?? []).filter((c) => c.email)
          : r.construtoraEmail
            ? [{ nome: r.construtoraNome ?? "Construtora", email: r.construtoraEmail }]
            : [];
      if (dest.length === 0) {
        semEmail.push(`${r.opNumero} #${r.parcelaNumero}`);
      } else {
        alvos.push({ row: r, destinatarios: dest, va });
      }
    }

    if (args.confirmar !== true) {
      const preview = alvos.map(
        (a) =>
          `  ${a.row.opNumero} #${a.row.parcelaNumero} · ${formatBRL(a.va.valorAtualizado)} (${a.va.diasAtraso}d de atraso) → ${a.destinatarios.map((d) => d.email).join(", ")}`,
      );
      return {
        texto: [
          `Prévia do disparo — ${alvos.length} cobrança(s):`,
          ...preview,
          semEmail.length > 0 ? `⚠️ Sem email cadastrado (não serão cobradas): ${semEmail.join(", ")}` : "",
          `Confirma o disparo?`,
        ]
          .filter(Boolean)
          .join("\n"),
        respostas: ["Confirmo, pode disparar as cobranças ✅"],
      };
    }

    let enviados = 0;
    for (const a of alvos) {
      const r = a.row;
      const pagamento = r.linhaDigitavel
        ? `Linha digitável do boleto: ${r.linhaDigitavel}${r.boletoUrl ? `\nBoleto: ${r.boletoUrl}` : ""}`
        : [
            r.bancoPix ? `PIX: ${r.bancoPix}` : "",
            r.bancoNome ? `Banco ${r.bancoNome} · Agência ${r.bancoAgencia ?? "—"} · Conta ${r.bancoConta ?? "—"}` : "",
          ]
            .filter(Boolean)
            .join("\n");
      const corpo = [
        `Olá,`,
        `Identificamos que a parcela ${r.parcelaNumero} da operação ${r.opNumero} venceu em ${fmtData(r.vencimento)} e segue em aberto.`,
        `Valor original: ${formatBRL(a.va.valorOriginal)}`,
        `Valor atualizado (multa de ${(a.va.multaPct * 100).toFixed(1)}% + juros de mora): ${formatBRL(a.va.valorAtualizado)}`,
        pagamento || `Acesse a plataforma pra ver os dados de pagamento.`,
        `Se o pagamento já foi realizado, anexe o comprovante na plataforma pra darmos baixa.`,
        `Atenciosamente,\n${r.fundoRazao ?? "Antecipaqui"} · via Antecipaqui`,
      ].join("\n\n");

      for (const d of a.destinatarios) {
        try {
          await sendEmail({
            to: d.email,
            subject: `Parcela em atraso — operação ${r.opNumero} (${formatBRL(a.va.valorAtualizado)})`,
            body: corpo,
          });
          enviados++;
        } catch (e) {
          console.error("[cicero] erro enviando cobrança:", e);
        }
      }
      await db
        .update(parcelasComissao)
        .set({ cobrancaAtrasoEm: new Date() })
        .where(eq(parcelasComissao.id, r.parcelaId));
    }

    return {
      texto: [
        `✅ Disparei ${enviados} email(s) de cobrança cobrindo ${alvos.length} parcela(s) vencida(s).`,
        semEmail.length > 0 ? `⚠️ Ficaram sem cobrança (sem email cadastrado): ${semEmail.join(", ")}` : "",
        `Cada parcela ficou marcada com a data do aviso de atraso.`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },
};

const minhasComissoes: CiceroTool = {
  nome: "minhas_comissoes",
  descricao:
    "Comissões do comercial logado (10% do lucro líquido da AQ por operação): quanto tem a receber (pendente), quanto já recebeu, o gerado no mês e as últimas comissões. Use pra 'quanto tenho a receber', 'quanto ganhei esse mês', 'minhas comissões'.",
  roles: ["comercial"],
  schema: {
    properties: {
      mes: {
        type: "string",
        description: "Opcional: mês no formato YYYY-MM pra detalhar (default: mês atual).",
      },
    },
  },
  run: async (ctx, args) => {
    if (!ctx.comercialId) {
      return {
        texto:
          "Seu login ainda não está vinculado a um cadastro de comercial — fala com o admin pra ajustar.",
      };
    }
    const rows = await db
      .select({
        opNumero: operacoes.numero,
        opStatus: operacoes.status,
        construtoraNome: construtoras.razaoSocial,
        valorDevido: comissoesComercial.valorDevido,
        valorPago: comissoesComercial.valorPago,
        status: comissoesComercial.status,
        geradaEm: comissoesComercial.geradaEm,
        pagaEm: comissoesComercial.pagaEm,
      })
      .from(comissoesComercial)
      .innerJoin(operacoes, eq(comissoesComercial.operacaoId, operacoes.id))
      .leftJoin(construtoras, eq(operacoes.construtoraId, construtoras.id))
      .where(eq(comissoesComercial.comercialId, ctx.comercialId))
      .orderBy(desc(comissoesComercial.geradaEm))
      .limit(200);

    if (rows.length === 0) {
      return {
        texto:
          "Você ainda não tem comissões geradas. Elas nascem automaticamente quando uma operação sua é aprovada (10% do lucro líquido da AQ).",
        links: [{ label: "Minhas comissões", href: "/painel/comissoes" }],
      };
    }

    const mesRef =
      typeof args.mes === "string" && /^\d{4}-\d{2}$/.test(args.mes)
        ? args.mes
        : ctx.hoje.slice(0, 7);
    const mesDe = (d: Date) =>
      d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 7);

    const ativas = rows.filter((r) => r.status !== "cancelada");
    const aReceber = ativas
      .filter((r) => r.status === "pendente")
      .reduce((s, r) => s + (n(r.valorDevido) - n(r.valorPago)), 0);
    const recebidoTotal = ativas.reduce((s, r) => s + n(r.valorPago), 0);
    const doMes = ativas.filter((r) => mesDe(r.geradaEm) === mesRef);
    const geradoMes = doMes.reduce((s, r) => s + n(r.valorDevido), 0);
    const recebidoMes = ativas
      .filter((r) => r.pagaEm && mesDe(r.pagaEm) === mesRef)
      .reduce((s, r) => s + n(r.valorPago), 0);

    const ultimas = rows.slice(0, 6).map((r) => {
      const situacao =
        r.status === "paga"
          ? `paga em ${fmtData(r.pagaEm)}`
          : r.status === "cancelada"
            ? "cancelada"
            : `pendente (op ${STATUS_LABEL[r.opStatus] ?? r.opStatus})`;
      return `  ${r.opNumero} · ${r.construtoraNome ?? "—"} · ${formatBRL(n(r.valorDevido))} · ${situacao}`;
    });

    return {
      texto: [
        `💰 A receber (pendente): ${formatBRL(aReceber)} · Já recebido (total): ${formatBRL(recebidoTotal)}.`,
        `Mês ${mesRef}: ${formatBRL(geradoMes)} gerado em ${doMes.length} operação(ões) · ${formatBRL(recebidoMes)} recebido.`,
        `Últimas comissões:\n${ultimas.join("\n")}`,
      ].join("\n\n"),
      links: [
        { label: "Minhas comissões", href: "/painel/comissoes" },
        { label: "Holerite mensal", href: "/painel/comissoes/holerite" },
      ],
    };
  },
};

const desempenhoFundos: CiceroTool = {
  nome: "desempenho_fundos",
  descricao:
    "Compara os fundos: operações aguardando decisão, tempo médio de decisão (da criação à aprovação do fundo), volume realizado e inadimplência. Use pra 'qual fundo está demorando mais', 'como estão os fundos'.",
  roles: ["admin"],
  schema: { properties: {} },
  run: async (ctx) => {
    const rows = await db
      .select({
        nome: sql<string>`coalesce(${fundos.nomeFantasia}, ${fundos.razaoSocial})`,
        pendentes: sql<number>`count(*) filter (where ${operacoes.fundoAprovacao} = 'pendente')`,
        decididas: sql<number>`count(*) filter (where ${operacoes.fundoAprovadoEm} is not null)`,
        tempoMedioHoras: sql<string>`coalesce(avg(extract(epoch from (${operacoes.fundoAprovadoEm} - ${operacoes.createdAt})) / 3600) filter (where ${operacoes.fundoAprovadoEm} >= ${operacoes.createdAt}), 0)`,
        volumeRealizado: sql<string>`coalesce(sum(${operacoes.valorComissao}) filter (where ${operacoes.status} = 'realizada'), 0)`,
        totalOps: sql<number>`count(${operacoes.id})`,
      })
      .from(fundos)
      .leftJoin(operacoes, eq(operacoes.fundoId, fundos.id))
      .where(eq(fundos.isActive, true))
      .groupBy(fundos.id, fundos.nomeFantasia, fundos.razaoSocial)
      .orderBy(sql`4 desc`);

    if (rows.length === 0) return { texto: "Nenhum fundo ativo cadastrado." };

    const vencidasPorFundo = await db
      .select({
        nome: sql<string>`coalesce(${fundos.nomeFantasia}, ${fundos.razaoSocial})`,
        vencido: sql<string>`coalesce(sum(${parcelasComissao.valor}), 0)`,
      })
      .from(parcelasComissao)
      .innerJoin(operacoes, eq(parcelasComissao.operacaoId, operacoes.id))
      .innerJoin(fundos, eq(operacoes.fundoId, fundos.id))
      .where(
        and(
          inArray(parcelasComissao.status, ["a_vencer", "vencida"]),
          lt(parcelasComissao.vencimento, ctx.hoje),
        ),
      )
      .groupBy(sql`1`);
    const vencidoMap = new Map(vencidasPorFundo.map((v) => [v.nome, n(v.vencido)]));

    const linhas = rows.map((r) => {
      const horas = n(r.tempoMedioHoras);
      const tempo =
        r.decididas > 0
          ? horas >= 48
            ? `${(horas / 24).toFixed(1)} dias`
            : `${horas.toFixed(1)}h`
          : "sem decisões";
      const vencido = vencidoMap.get(r.nome) ?? 0;
      return `  ${r.nome}: ${r.pendentes} pendente(s) de decisão · tempo médio ${tempo} · realizado ${formatBRL(n(r.volumeRealizado))} · vencido ${formatBRL(vencido)} · ${r.totalOps} ops`;
    });

    return {
      texto: `Desempenho por fundo (ordenado pelo tempo médio de decisão):\n${linhas.join("\n")}`,
      links: [{ label: "Relatório de fundos", href: "/admin/relatorios/fundos" }],
    };
  },
};

const resumoPlataforma: CiceroTool = {
  nome: "resumo_plataforma",
  descricao:
    "Resumo executivo da plataforma: operações por status, volume realizado e recebido no mês, inadimplência total e base de cadastros.",
  roles: ["admin"],
  schema: { properties: {} },
  run: async (ctx) => {
    const mesInicio = ctx.hoje.slice(0, 7) + "-01";

    const porStatus = await db
      .select({ status: operacoes.status, qtd: sql<number>`count(*)`, total: sql<string>`coalesce(sum(${operacoes.valorComissao}), 0)` })
      .from(operacoes)
      .groupBy(operacoes.status);

    const [recebidoMes] = await db
      .select({ total: sql<string>`coalesce(sum(coalesce(${parcelasComissao.pagoValor}, ${parcelasComissao.valor})), 0)`, qtd: sql<number>`count(*)` })
      .from(parcelasComissao)
      .where(and(eq(parcelasComissao.status, "paga"), gte(parcelasComissao.pagoEm, mesInicio)));

    const [vencido] = await db
      .select({ total: sql<string>`coalesce(sum(${parcelasComissao.valor}), 0)`, qtd: sql<number>`count(*)` })
      .from(parcelasComissao)
      .where(
        and(
          inArray(parcelasComissao.status, ["a_vencer", "vencida"]),
          lt(parcelasComissao.vencimento, ctx.hoje),
        ),
      );

    const [base] = await db.select({
      usuarios: sql<number>`(select count(*) from ${users} where ${users.isActive})`,
      construtoras: sql<number>`(select count(*) from ${construtoras} where ${construtoras.isActive})`,
      fundos: sql<number>`(select count(*) from ${fundos} where ${fundos.isActive})`,
      imobiliarias: sql<number>`(select count(*) from ${imobiliarias})`,
    }).from(sql`(select 1) as t`);

    const statusLinha = porStatus
      .filter((s) => s.qtd > 0)
      .map((s) => `${STATUS_LABEL[s.status] ?? s.status}: ${s.qtd} (${formatBRL(n(s.total))})`)
      .join(" · ");

    return {
      texto: [
        `📊 Resumo da plataforma (${fmtData(ctx.hoje)}):`,
        `Operações — ${statusLinha || "nenhuma"}`,
        `Recebido no mês: ${formatBRL(n(recebidoMes?.total))} em ${Number(recebidoMes?.qtd ?? 0)} parcela(s).`,
        `Inadimplência aberta: ${formatBRL(n(vencido?.total))} em ${Number(vencido?.qtd ?? 0)} parcela(s).`,
        `Base: ${base?.usuarios ?? 0} usuários ativos · ${base?.imobiliarias ?? 0} imobiliárias · ${base?.construtoras ?? 0} construtoras · ${base?.fundos ?? 0} fundos.`,
      ].join("\n"),
      links: [{ label: "Relatórios", href: "/admin/relatorios/indices" }],
    };
  },
};

const TOOLS: CiceroTool[] = [
  listarOperacoes,
  detalheOperacao,
  proximosVencimentos,
  calcularOperacao,
  prepararCadastro,
  dadosPagamento,
  faturamentoDia,
  inadimplencia,
  dispararCobranca,
  minhasComissoes,
  desempenhoFundos,
  resumoPlataforma,
];

export function toolsParaRole(role: User["role"]): CiceroTool[] {
  return TOOLS.filter((t) => t.roles === null || t.roles.includes(role));
}

/** Executa uma tool diretamente (testes/manutenção) respeitando a role. */
export async function ciceroRunTool(
  ctx: CiceroCtx,
  nome: string,
  args: ToolArgs = {},
): Promise<CiceroResposta> {
  const tool = toolsParaRole(ctx.user.role).find((t) => t.nome === nome);
  if (!tool) return { texto: `Tool ${nome} indisponível pra role ${ctx.user.role}.` };
  return tool.run(ctx, args);
}

/* =========================================
   Loop do agente
   ========================================= */

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({ timeout: 55_000, maxRetries: 1 });
  }
  return cachedClient;
}

function systemPrompt(ctx: CiceroCtx): string {
  const roleDesc: Record<User["role"], string> = {
    corretor: "corretor (cedente) que antecipa comissões de venda de imóveis",
    imobiliaria: "imobiliária que antecipa comissões de venda de imóveis",
    construtora: "construtora responsável por pagar as parcelas das comissões antecipadas",
    fundo: "fundo investidor que aporta o capital das antecipações",
    admin: "administrador da plataforma Antecipaqui",
    comercial: "comercial parceiro que origina operações",
  };
  return [
    `Você é o Cícero 👔, o atendente de peso da Antecipaqui — plataforma brasileira de antecipação de comissões imobiliárias. Personalidade: consultor financeiro experiente, direto, cordial, português brasileiro. Respostas curtas (2-5 frases + dados), sempre com números reais vindos das ferramentas — NUNCA invente valores.`,
    `Usuário: ${ctx.user.nome ?? ctx.user.email} — ${roleDesc[ctx.user.role]}. Hoje é ${fmtData(ctx.hoje)}.`,
    ctx.fundo ? `Fundo do usuário: ${ctx.fundo.nomeFantasia ?? ctx.fundo.razaoSocial} (taxa padrão de operação ${(n(ctx.fundo.taxaOperacaoPadrao) * 100).toFixed(2)}% a.m.).` : "",
    `Regras:`,
    `- Use as ferramentas pra QUALQUER dado (operações, vencimentos, valores). Se a resposta precisa de dado que você não tem ferramenta, diga que não consegue e sugira o suporte.`,
    `- Glossário: "operação" = antecipação de comissão; "duplicata"/"parcela" = cronograma que a construtora paga; "deságio" = juros da antecipação; "líquido"/"valor presente" = o que o cedente recebe.`,
    `- Formate valores em R$ (pt-BR) e datas em dd/mm/aaaa. NUNCA use tabelas markdown (linhas com |) nem cabeçalhos # — o chat renderiza texto puro. Liste em linhas simples, ex: "#1 · 30 dias · R$ 33.333,33 → líquido R$ 31.446,54".`,
    `- Ações que disparam email/alteram dados: SEMPRE mostre a prévia e peça confirmação explícita antes de executar (confirmar=true só depois do usuário confirmar).`,
    `- Nunca exponha dados de outros usuários/fundos/construtoras — as ferramentas já limitam seu acesso; não tente contornar.`,
    `- Se a pergunta fugir da plataforma (papo aleatório), responda com bom humor em 1 frase e volte pro assunto Antecipaqui.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function ciceroResponde(
  ctx: CiceroCtx,
  pergunta: string,
  historico: { autor: string; texto: string }[],
): Promise<{ resposta: CiceroResposta; meta: CiceroMeta }> {
  const meta: CiceroMeta = { toolsUsadas: [], modelo: MODEL, inputTokens: 0, outputTokens: 0 };

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      resposta: {
        texto:
          "Estou de folga forçada — o administrador ainda não configurou minha chave de IA (ANTHROPIC_API_KEY). Avisa o suporte! 👔",
      },
      meta,
    };
  }

  const disponiveis = toolsParaRole(ctx.user.role);
  const toolDefs: Anthropic.Tool[] = disponiveis.map((t) => ({
    name: t.nome,
    description: t.descricao,
    input_schema: {
      type: "object" as const,
      properties: t.schema.properties,
      required: t.schema.required ?? [],
    },
  }));

  const mensagens: Anthropic.MessageParam[] = [
    ...historico.slice(-10).map(
      (m): Anthropic.MessageParam => ({
        role: m.autor === "user" ? "user" : "assistant",
        content: m.texto,
      }),
    ),
    { role: "user", content: pergunta },
  ];

  const client = getClient();
  const linksColetados: { label: string; href: string }[] = [];
  let respostasColetadas: string[] | undefined;

  for (let i = 0; i < 6; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt(ctx),
      tools: toolDefs,
      messages: mensagens,
    });
    meta.inputTokens += response.usage.input_tokens;
    meta.outputTokens += response.usage.output_tokens;

    const toolUses = response.content.filter(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
    );

    if (toolUses.length === 0 || response.stop_reason !== "tool_use") {
      const texto = response.content
        .filter((c): c is Anthropic.TextBlock => c.type === "text")
        .map((c) => c.text)
        .join(" ")
        .trim();
      return {
        resposta: {
          texto: texto || "Fiquei sem palavras — tenta reformular a pergunta? 👔",
          links: linksColetados.slice(0, 3),
          respostas: respostasColetadas,
        },
        meta,
      };
    }

    mensagens.push({ role: "assistant", content: response.content });
    const resultados: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const tool = disponiveis.find((t) => t.nome === tu.name);
      const args = (tu.input ?? {}) as ToolArgs;
      meta.toolsUsadas.push({ tool: tu.name, args });
      let resultado: CiceroResposta;
      let isError = false;
      if (!tool) {
        resultado = { texto: "Ferramenta indisponível pro seu perfil." };
        isError = true;
      } else {
        try {
          resultado = await tool.run(ctx, args);
        } catch (e) {
          console.error(`[cicero] erro na tool ${tu.name}:`, e);
          resultado = { texto: "Erro interno ao consultar os dados. Tente de novo em instantes." };
          isError = true;
        }
      }
      if (resultado.links) linksColetados.push(...resultado.links);
      if (resultado.respostas) respostasColetadas = resultado.respostas;
      resultados.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: resultado.texto,
        is_error: isError,
      });
    }
    mensagens.push({ role: "user", content: resultados });
  }

  return {
    resposta: {
      texto:
        "Essa consulta ficou grande demais pra uma resposta só — quebra em perguntas menores que eu resolvo. 👔",
      links: linksColetados.slice(0, 3),
    },
    meta,
  };
}
