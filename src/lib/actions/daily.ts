"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth-user";
import { sendEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import { formatBRL } from "@/lib/format";

function extractRows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === "object" && "rows" in r) {
    return (r as { rows: T[] }).rows;
  }
  return [];
}

export type DailyFilters = {
  /** Preset: "hoje" | "semana" | "mes" | "3m" | "custom" */
  periodo?: string;
  from?: string;
  to?: string;
  /** "atrasadas" | "a_vencer" | "" */
  status?: string;
  fundoId?: string;
  construtoraId?: string;
  imobiliariaId?: string;
  /** Filtra por comercial responsável (operação) ou por ops cuja
   *  construtora/imobiliária têm esse comercial. */
  comercialId?: string;
  /** Se true, NÃO exige requireAdmin (usado pra comercial logado ver só
   *  as próprias parcelas — autorização externa). */
  skipAuthCheck?: boolean;
};

/**
 * Calcula encargos: 2% multa + juros pro-rata pela taxa mensal da operação.
 *
 * encargos = (valor_parcela × 0.02) + (valor_parcela × taxa_mensal × dias_atraso / 30)
 *
 * Se dias_atraso <= 0 (ainda não venceu), encargos = 0.
 */
function calcEncargos(
  valorParcela: number,
  taxaMensal: number,
  diasAtraso: number,
): { multa: number; jurosMora: number; total: number } {
  if (diasAtraso <= 0) return { multa: 0, jurosMora: 0, total: 0 };
  const multa = valorParcela * 0.02;
  const jurosMora = valorParcela * taxaMensal * (diasAtraso / 30);
  return { multa, jurosMora, total: multa + jurosMora };
}

export type DailyRow = {
  parcelaId: string;
  parcelaNumero: number;
  vencimento: string;
  valorParcela: number;
  parcelaStatus: string;
  diasAtraso: number;
  // operação
  operacaoId: string;
  operacaoNumero: string;
  operacaoStatus: string;
  dataOperacao: string;
  valorOperacao: number;
  taxaMensal: number;
  // partes
  construtoraId: string | null;
  construtoraNome: string | null;
  construtoraTelefone: string | null;
  construtoraEmail: string | null;
  imobiliariaId: string | null;
  imobiliariaNome: string | null;
  imobiliariaTelefone: string | null;
  corretorId: string | null;
  corretorNome: string | null;
  corretorEmail: string | null;
  corretorTelefone: string | null;
  fundoId: string | null;
  fundoNome: string | null;
  comercialId: string | null;
  comercialNome: string | null;
  // calculados
  jurosParcela: number;
  encargosMulta: number;
  encargosJurosMora: number;
  encargosTotal: number;
  valorAtual: number;
};

export async function getDailyParcelas(
  filters: DailyFilters = {},
): Promise<DailyRow[]> {
  if (!filters.skipAuthCheck) await requireAdmin();

  // Resolve período em datas
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);

  function offsetISO(days: number): string {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  let from: string | undefined;
  let to: string | undefined;
  switch (filters.periodo) {
    case "hoje":
      from = todayISO;
      to = todayISO;
      break;
    case "semana":
      from = todayISO;
      to = offsetISO(7);
      break;
    case "mes":
      from = todayISO;
      to = offsetISO(30);
      break;
    case "3m":
      from = todayISO;
      to = offsetISO(90);
      break;
    case "custom":
      from = filters.from || undefined;
      to = filters.to || undefined;
      break;
    default:
      // sem preset → todo o período
      from = filters.from || undefined;
      to = filters.to || undefined;
  }

  const conds: ReturnType<typeof sql>[] = [
    sql`o.status NOT IN ('rascunho', 'recusada', 'cancelada')`,
    sql`p.status != 'paga'`, // só parcelas em aberto
  ];

  // Status (atrasadas / a vencer)
  if (filters.status === "atrasadas") {
    conds.push(sql`p.vencimento < CURRENT_DATE`);
  } else if (filters.status === "a_vencer") {
    conds.push(sql`p.vencimento >= CURRENT_DATE`);
  }

  if (from) conds.push(sql`p.vencimento >= ${from}::date`);
  if (to) conds.push(sql`p.vencimento <= ${to}::date`);

  if (filters.fundoId === "_no_fundo_") {
    conds.push(sql`o.fundo_id IS NULL`);
  } else if (filters.fundoId) {
    conds.push(sql`o.fundo_id = ${filters.fundoId}::uuid`);
  }
  if (filters.construtoraId) {
    conds.push(sql`o.construtora_id = ${filters.construtoraId}::uuid`);
  }
  if (filters.imobiliariaId) {
    conds.push(sql`o.imobiliaria_id = ${filters.imobiliariaId}::uuid`);
  }
  if (filters.comercialId) {
    // Operação OU construtora OU imobiliária com esse comercial responsável
    conds.push(
      sql`(o.comercial_id = ${filters.comercialId}::uuid
        OR c.comercial_id = ${filters.comercialId}::uuid
        OR im.comercial_id = ${filters.comercialId}::uuid)`,
    );
  }

  const where = sql.join(conds, sql` AND `);

  const result = await db.execute(sql`
    SELECT
      p.id AS parcela_id,
      p.numero AS parcela_numero,
      p.vencimento,
      p.valor::float AS valor_parcela,
      p.status AS parcela_status,
      (CURRENT_DATE - p.vencimento)::int AS dias_atraso,
      o.id AS operacao_id,
      o.numero AS operacao_numero,
      o.status AS operacao_status,
      o.data_venda AS data_operacao,
      o.valor_venda::float AS valor_operacao,
      o.taxa_mensal::float AS taxa_mensal,
      c.id AS construtora_id,
      c.razao_social AS construtora_nome,
      c.telefone AS construtora_telefone,
      c.email AS construtora_email,
      im.id AS imobiliaria_id,
      im.razao_social AS imobiliaria_nome,
      im.telefone AS imobiliaria_telefone,
      u.id AS corretor_id,
      u.nome AS corretor_nome,
      u.email AS corretor_email,
      u.telefone AS corretor_telefone,
      f.id AS fundo_id,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome,
      COALESCE(o.comercial_id, c.comercial_id, im.comercial_id) AS comercial_id,
      COALESCE(com_op.apelido, com_op.nome_completo, com_c.apelido, com_c.nome_completo, com_i.apelido, com_i.nome_completo) AS comercial_nome
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN users u ON u.id = o.corretor_user_id
    LEFT JOIN fundos f ON f.id = o.fundo_id
    LEFT JOIN comerciais com_op ON com_op.id = o.comercial_id
    LEFT JOIN comerciais com_c ON com_c.id = c.comercial_id
    LEFT JOIN comerciais com_i ON com_i.id = im.comercial_id
    WHERE ${where}
    ORDER BY p.vencimento ASC, o.numero
    LIMIT 1000
  `);

  const raw = extractRows<{
    parcela_id: string;
    parcela_numero: number;
    vencimento: string;
    valor_parcela: number;
    parcela_status: string;
    dias_atraso: number;
    operacao_id: string;
    operacao_numero: string;
    operacao_status: string;
    data_operacao: string;
    valor_operacao: number;
    taxa_mensal: number;
    construtora_id: string | null;
    construtora_nome: string | null;
    construtora_telefone: string | null;
    construtora_email: string | null;
    imobiliaria_id: string | null;
    imobiliaria_nome: string | null;
    imobiliaria_telefone: string | null;
    corretor_id: string | null;
    corretor_nome: string | null;
    corretor_email: string | null;
    corretor_telefone: string | null;
    fundo_id: string | null;
    fundo_nome: string | null;
    comercial_id: string | null;
    comercial_nome: string | null;
  }>(result);

  return raw.map((r) => {
    const dias = Math.max(r.dias_atraso, 0);
    // "Juros da parcela" = taxa mensal × valor_parcela (mensalidade básica)
    // Convencionado como referência informativa; encargos por atraso é separado.
    const jurosParcela = r.valor_parcela * r.taxa_mensal;
    const enc = calcEncargos(r.valor_parcela, r.taxa_mensal, dias);
    return {
      parcelaId: r.parcela_id,
      parcelaNumero: r.parcela_numero,
      vencimento: r.vencimento,
      valorParcela: r.valor_parcela,
      parcelaStatus: r.parcela_status,
      diasAtraso: r.dias_atraso,
      operacaoId: r.operacao_id,
      operacaoNumero: r.operacao_numero,
      operacaoStatus: r.operacao_status,
      dataOperacao: r.data_operacao,
      valorOperacao: r.valor_operacao,
      taxaMensal: r.taxa_mensal,
      construtoraId: r.construtora_id,
      construtoraNome: r.construtora_nome,
      construtoraTelefone: r.construtora_telefone,
      construtoraEmail: r.construtora_email,
      imobiliariaId: r.imobiliaria_id,
      imobiliariaNome: r.imobiliaria_nome,
      imobiliariaTelefone: r.imobiliaria_telefone,
      corretorId: r.corretor_id,
      corretorNome: r.corretor_nome,
      corretorEmail: r.corretor_email,
      corretorTelefone: r.corretor_telefone,
      fundoId: r.fundo_id,
      fundoNome: r.fundo_nome,
      comercialId: r.comercial_id,
      comercialNome: r.comercial_nome,
      jurosParcela,
      encargosMulta: enc.multa,
      encargosJurosMora: enc.jurosMora,
      encargosTotal: enc.total,
      valorAtual: r.valor_parcela + enc.total,
    };
  });
}

/* =========================================
   AÇÕES DE NOTIFICAÇÃO E BOLETO
   ========================================= */

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.antecipaqui.digital";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

/**
 * Notifica construtora + imobiliária por email sobre atraso de parcela.
 * Cada lado recebe sua mensagem específica.
 */
export async function notificarParcelaPorEmailAction(parcelaId: string) {
  await requireAdmin();

  // Carrega dados da parcela e operação
  const result = await db.execute(sql`
    SELECT
      p.id, p.numero AS parcela_numero, p.vencimento, p.valor::float AS valor_parcela,
      (CURRENT_DATE - p.vencimento)::int AS dias_atraso,
      o.id AS operacao_id, o.numero AS operacao_numero,
      o.taxa_mensal::float AS taxa_mensal,
      c.razao_social AS construtora_nome, c.email AS construtora_email,
      im.razao_social AS imobiliaria_nome,
      u.nome AS corretor_nome, u.email AS corretor_email
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN construtoras c ON c.id = o.construtora_id
    LEFT JOIN imobiliarias im ON im.id = o.imobiliaria_id
    LEFT JOIN users u ON u.id = o.corretor_user_id
    WHERE p.id = ${parcelaId}::uuid
    LIMIT 1
  `);
  const rows = extractRows<{
    id: string;
    parcela_numero: number;
    vencimento: string;
    valor_parcela: number;
    dias_atraso: number;
    operacao_id: string;
    operacao_numero: string;
    taxa_mensal: number;
    construtora_nome: string | null;
    construtora_email: string | null;
    imobiliaria_nome: string | null;
    corretor_nome: string | null;
    corretor_email: string | null;
  }>(result);
  const r = rows[0];
  if (!r) throw new Error("Parcela não encontrada");

  const dias = Math.max(r.dias_atraso, 0);
  const enc = calcEncargos(r.valor_parcela, r.taxa_mensal, dias);
  const valorAtual = r.valor_parcela + enc.total;

  let enviadosConstrutora = false;
  let enviadosImob = false;

  // Email pra construtora
  if (r.construtora_email) {
    const subject = dias > 0
      ? `Antecipaqui · Parcela em atraso · operação ${r.operacao_numero}`
      : `Antecipaqui · Lembrete de parcela · operação ${r.operacao_numero}`;
    const body = `Olá,

${dias > 0
  ? `Identificamos que a parcela #${String(r.parcela_numero).padStart(2, "0")} da operação ${r.operacao_numero} venceu em ${fmtDate(r.vencimento)} e está com ${dias} dia(s) de atraso.`
  : `Esse é um lembrete da parcela #${String(r.parcela_numero).padStart(2, "0")} da operação ${r.operacao_numero}, com vencimento em ${fmtDate(r.vencimento)}.`}

Detalhes:
• Cedente: ${r.imobiliaria_nome ?? r.corretor_nome ?? "—"}
• Valor original da parcela: ${formatBRL(r.valor_parcela)}
${dias > 0
  ? `• Encargos (multa 2% + juros mora): ${formatBRL(enc.total)}
• Valor atualizado: ${formatBRL(valorAtual)}`
  : ""}

Acesse o painel: ${SITE_URL}/painel/duplicatas

Em caso de dúvida, responda este email.

Equipe Antecipaqui`;
    try {
      await sendEmail({
        to: r.construtora_email,
        subject,
        body,
      });
      enviadosConstrutora = true;
    } catch (e) {
      console.error("[daily/notificar-construtora]", e);
    }
  }

  // Email pra imobiliária / corretor
  if (r.corretor_email) {
    const subject = dias > 0
      ? `Antecipaqui · Pagamento da parcela em atraso · ${r.operacao_numero}`
      : `Antecipaqui · Status da parcela · ${r.operacao_numero}`;
    const body = `Olá ${(r.corretor_nome ?? "").split(" ")[0] ?? ""},

${dias > 0
  ? `A parcela #${String(r.parcela_numero).padStart(2, "0")} da operação ${r.operacao_numero}, vinculada a ${r.construtora_nome ?? "a construtora"}, venceu em ${fmtDate(r.vencimento)} e está com ${dias} dia(s) de atraso.`
  : `A parcela #${String(r.parcela_numero).padStart(2, "0")} da operação ${r.operacao_numero}, vinculada a ${r.construtora_nome ?? "a construtora"}, vence em ${fmtDate(r.vencimento)}.`}

Estamos em contato com a construtora pra regularizar. Você pode acompanhar a operação no painel.

Acesse: ${SITE_URL}/painel/operacoes

Equipe Antecipaqui`;
    try {
      await sendEmail({
        to: r.corretor_email,
        subject,
        body,
      });
      enviadosImob = true;
    } catch (e) {
      console.error("[daily/notificar-corretor]", e);
    }
  }

  audit({
    action: "daily_notificar_email",
    targetType: "operacao",
    targetId: r.operacao_id,
    targetLabel: r.operacao_numero,
    metadata: {
      parcelaId,
      parcelaNumero: r.parcela_numero,
      diasAtraso: dias,
      construtora: enviadosConstrutora,
      corretor: enviadosImob,
    },
  }).catch(() => undefined);

  return {
    ok: true as const,
    enviados: {
      construtora: enviadosConstrutora,
      imobiliaria: enviadosImob,
    },
  };
}

/**
 * Stub de geração de boleto. Por enquanto:
 * - Se o fundo da operação tem boletos_api_url configurado, retorna a URL
 *   pra admin abrir em nova aba (manualmente integra com a API externa).
 * - Caso contrário, retorna erro orientando configurar.
 */
export async function gerarBoletoParcelaAction(parcelaId: string) {
  await requireAdmin();

  const result = await db.execute(sql`
    SELECT
      p.id, p.numero, p.vencimento, p.valor::float AS valor,
      o.numero AS operacao_numero, o.id AS operacao_id,
      f.id AS fundo_id, f.boletos_api_url, f.boletos_banco_nome,
      COALESCE(f.nome_fantasia, f.razao_social) AS fundo_nome
    FROM parcelas_comissao p
    INNER JOIN operacoes o ON o.id = p.operacao_id
    LEFT JOIN fundos f ON f.id = o.fundo_id
    WHERE p.id = ${parcelaId}::uuid
    LIMIT 1
  `);
  const rows = extractRows<{
    id: string;
    numero: number;
    vencimento: string;
    valor: number;
    operacao_numero: string;
    operacao_id: string;
    fundo_id: string | null;
    boletos_api_url: string | null;
    boletos_banco_nome: string | null;
    fundo_nome: string | null;
  }>(result);
  const r = rows[0];
  if (!r) throw new Error("Parcela não encontrada");

  if (!r.fundo_id) {
    throw new Error(
      "Operação ainda não tem fundo vinculado. Aprove a operação selecionando um fundo antes de gerar o boleto.",
    );
  }
  if (!r.boletos_api_url) {
    throw new Error(
      `Fundo "${r.fundo_nome}" não tem URL da API de boletos configurada. Cadastre em /admin/fundos/${r.fundo_id}/editar (seção Configurações).`,
    );
  }

  audit({
    action: "daily_gerar_boleto",
    targetType: "operacao",
    targetId: r.operacao_id,
    targetLabel: r.operacao_numero,
    metadata: {
      parcelaId,
      parcelaNumero: r.numero,
      fundoId: r.fundo_id,
    },
  }).catch(() => undefined);

  return {
    ok: true as const,
    apiUrl: r.boletos_api_url,
    bancoNome: r.boletos_banco_nome,
    fundoNome: r.fundo_nome,
    parcela: {
      numero: r.numero,
      vencimento: r.vencimento,
      valor: r.valor,
      operacaoNumero: r.operacao_numero,
    },
  };
}
