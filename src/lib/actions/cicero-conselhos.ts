"use server";

/**
 * "Cícero sugere" — conselho proativo por papel, sempre com número real do
 * banco e sempre puxando pra próxima operação.
 *
 * Ângulo de cada papel (definido pelo dono):
 *  - imobiliária/corretor: mais vale um na mão que vários a prazo
 *  - construtora: proteja o caixa parcelando o comissionamento — a AQ paga
 *    o corretor à vista
 *  - fundo/admin: postura ativa — campanha, e-mail marketing, push, conteúdo
 *
 * Sem dado suficiente, cai num conselho genérico do papel em vez de inventar
 * número.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/auth-user";
import { buildCiceroCtx } from "@/lib/cicero";

export type CiceroConselho = {
  /** Frase curta de abertura, no tom do Cícero. */
  texto: string;
  /** Número que dá peso ao conselho (já formatado). Opcional. */
  destaque?: string;
  legendaDestaque?: string;
  cta?: { label: string; href: string };
  /** Perguntas clicáveis que continuam a conversa. */
  perguntas: string[];
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function um<T extends Record<string, unknown>>(
  q: ReturnType<typeof sql>,
): Promise<T | null> {
  const r = await db.execute(q);
  const rows = (
    Array.isArray(r) ? r : ((r as unknown as { rows: T[] }).rows ?? [])
  ) as T[];
  return rows[0] ?? null;
}

export async function getCiceroConselho(): Promise<CiceroConselho | null> {
  const user = await getCurrentDbUser();
  if (!user || !user.isActive) return null;

  const ctx = await buildCiceroCtx(user);

  /* ---------- IMOBILIÁRIA / CORRETOR ---------- */
  if (user.role === "imobiliaria" || user.role === "corretor") {
    const ids = ctx.imobiliariaIds.length > 0 ? ctx.imobiliariaIds : null;
    const filtro = ids
      ? sql`o.imobiliaria_id IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})`
      : sql`o.corretor_user_id = ${user.id}`;

    const r = await um<{ a_receber: number; parcelas: number; pendentes: number }>(sql`
      SELECT
        COALESCE(SUM(p.valor) FILTER (WHERE p.vencimento > CURRENT_DATE), 0)::float8 AS a_receber,
        COUNT(p.id) FILTER (WHERE p.vencimento > CURRENT_DATE)::int AS parcelas,
        (SELECT COUNT(*)::int FROM operacoes o2
           WHERE ${ids ? sql`o2.imobiliaria_id IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})` : sql`o2.corretor_user_id = ${user.id}`}
             AND o2.status = 'documentos_incompletos') AS pendentes
      FROM operacoes o
      LEFT JOIN parcelas_comissao p ON p.operacao_id = o.id
      WHERE ${filtro}
    `);

    const aReceber = Number(r?.a_receber ?? 0);
    const pendentes = Number(r?.pendentes ?? 0);

    if (pendentes > 0) {
      return {
        texto: `Você tem ${pendentes} operação(ões) parada(s) só esperando documento. Enquanto o papel não sobe, o dinheiro não anda — me manda o que falta que eu destravo.`,
        destaque: String(pendentes),
        legendaDestaque: "parada(s) por documento",
        cta: { label: "Ver o que falta", href: "/painel/operacoes" },
        perguntas: [
          "O que falta nas minhas operações?",
          "Quero cadastrar uma operação",
          "Calcula 100 mil em 30/60/90 dias",
        ],
      };
    }

    if (aReceber > 0) {
      return {
        texto: `Mais vale um na mão do que vários a prazo. Você tem ${brl(aReceber)} a receber lá na frente — antecipe e trabalhe com o seu dinheiro agora, em vez de esperar a construtora.`,
        destaque: brl(aReceber),
        legendaDestaque: "a receber a prazo",
        cta: { label: "Antecipar agora", href: "/painel/operacoes/nova" },
        perguntas: [
          "Quanto sai líquido se eu antecipar tudo?",
          "Próximos vencimentos",
          "Quero cadastrar uma operação",
        ],
      };
    }

    return {
      texto:
        "Mais vale um na mão do que vários a prazo. Fechou venda? Traz a comissão pra cá e recebe agora, em vez de esperar 30, 60, 90 dias.",
      cta: { label: "Simular antecipação", href: "/painel/operacoes/nova" },
      perguntas: [
        "Calcula 100 mil em 30/60/90 dias",
        "Como funciona a antecipação?",
        "Quero cadastrar uma operação",
      ],
    };
  }

  /* ---------- CONSTRUTORA ---------- */
  if (user.role === "construtora") {
    if (ctx.construtoraIds.length === 0) return null;
    const ids = sql.join(
      ctx.construtoraIds.map((i) => sql`${i}::uuid`),
      sql`, `,
    );
    const r = await um<{ a_pagar: number; parcelas: number }>(sql`
      SELECT COALESCE(SUM(p.valor), 0)::float8 AS a_pagar,
             COUNT(p.id)::int AS parcelas
      FROM parcelas_comissao p
      JOIN operacoes o ON o.id = p.operacao_id
      WHERE o.construtora_id IN (${ids})
        AND p.vencimento > CURRENT_DATE
    `);
    const aPagar = Number(r?.a_pagar ?? 0);

    if (aPagar > 0) {
      return {
        texto: `Proteja seu fluxo de caixa: parcele o comissionamento e deixe que a gente paga o corretor à vista. Você tem ${brl(aPagar)} em comissões a vencer — dilua no seu prazo sem deixar o corretor esperando.`,
        destaque: brl(aPagar),
        legendaDestaque: "em comissões a vencer",
        cta: { label: "Ver duplicatas", href: "/painel/duplicatas" },
        perguntas: [
          "O que tenho pra pagar?",
          "Como faço pra parcelar mais e pagar o corretor à vista?",
          "Dados de pagamento das parcelas",
        ],
      };
    }

    return {
      texto:
        "Proteja seu fluxo de caixa: parcele o comissionamento no seu prazo e a gente paga o corretor à vista. Seu corretor vende mais quando recebe rápido — e o caixa da obra continua no lugar.",
      cta: { label: "Falar com a gente", href: "/painel/suporte" },
      perguntas: [
        "Como funciona pagar o corretor à vista?",
        "O que tenho pra pagar?",
        "Quais são as vantagens pra construtora?",
      ],
    };
  }

  /* ---------- FUNDO ---------- */
  if (user.role === "fundo") {
    if (!ctx.fundo) return null;
    const r = await um<{ aguardando: number; investido_mes: number }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('aguardando_aprovacao','pre_aprovada'))::int AS aguardando,
        COALESCE(SUM(valor_presente) FILTER (
          WHERE aprovado_em >= date_trunc('month', CURRENT_DATE)
        ), 0)::float8 AS investido_mes
      FROM operacoes WHERE fundo_id = ${ctx.fundo.id}::uuid
    `);
    const aguardando = Number(r?.aguardando ?? 0);
    const investido = Number(r?.investido_mes ?? 0);

    if (aguardando > 0) {
      return {
        texto: `Tem ${aguardando} operação(ões) esperando sua decisão. Fundo que responde rápido recebe mais originação — e quem decide devagar vê a fila migrar pro concorrente.`,
        destaque: String(aguardando),
        legendaDestaque: "na sua mesa agora",
        cta: { label: "Abrir a mesa", href: "/painel/aprovar" },
        perguntas: [
          "O que está na minha mesa?",
          "Que campanha eu faço pra atrair mais originação?",
          "Como está a inadimplência?",
        ],
      };
    }

    return {
      texto: `Mesa limpa — hora de gerar demanda. ${investido > 0 ? `Você aportou ${brl(investido)} este mês.` : ""} Dispare uma campanha pras imobiliárias parceiras: e-mail marketing com sua taxa, push de "antecipe hoje" e conteúdo mostrando quanto o corretor leva líquido. Me pede ideias que eu escrevo.`,
      destaque: investido > 0 ? brl(investido) : undefined,
      legendaDestaque: investido > 0 ? "aportado no mês" : undefined,
      cta: { label: "Ver parceiros", href: "/painel/parceiros" },
      perguntas: [
        "Escreve um e-mail marketing pras imobiliárias",
        "Que campanha traz mais operação?",
        "Faturamento de hoje",
      ],
    };
  }

  /* ---------- ADMIN ---------- */
  if (user.role === "admin") {
    const r = await um<{ paradas: number; imobs_ociosas: number }>(sql`
      SELECT
        (SELECT COUNT(*)::int FROM operacoes WHERE status = 'documentos_incompletos') AS paradas,
        (SELECT COUNT(*)::int FROM imobiliarias i
          WHERE NOT EXISTS (
            SELECT 1 FROM operacoes o
             WHERE o.imobiliaria_id = i.id
               AND o.created_at > CURRENT_DATE - INTERVAL '30 days'
          )) AS imobs_ociosas
    `);
    const paradas = Number(r?.paradas ?? 0);
    const ociosas = Number(r?.imobs_ociosas ?? 0);

    if (ociosas > 0) {
      return {
        texto: `${ociosas} imobiliária(s) não operam há mais de 30 dias${paradas > 0 ? ` e ${paradas} operação(ões) estão paradas por documento` : ""}. Base parada é receita dormindo: dispare e-mail marketing e push com "antecipe agora", e me peça o texto da campanha.`,
        destaque: String(ociosas),
        legendaDestaque: "imobiliárias sem operar há 30d",
        cta: { label: "Ver imobiliárias", href: "/admin/usuarios" },
        perguntas: [
          "Escreve uma campanha de reativação",
          "Quais imobiliárias estão paradas?",
          "Resumo da plataforma",
        ],
      };
    }

    return {
      texto:
        "Base ativa. Pra crescer agora, o caminho é campanha: e-mail marketing por segmento, push de oportunidade e conteúdo que mostre o líquido na mão do corretor. Me peça o texto que eu escrevo.",
      cta: { label: "Resumo da plataforma", href: "/admin" },
      perguntas: [
        "Escreve um e-mail marketing pra imobiliárias",
        "Que conteúdo gera mais operação?",
        "Resumo da plataforma",
      ],
    };
  }

  /* ---------- COMERCIAL ---------- */
  if (user.role === "comercial") {
    return {
      texto:
        "Cada imobiliária que você ativa vira comissão recorrente. Puxa uma lista dos parceiros parados e oferece uma simulação — o número convence mais que o discurso.",
      cta: { label: "Meus prospects", href: "/painel/prospects" },
      perguntas: [
        "Quanto tenho a receber?",
        "Escreve uma mensagem pra reativar parceiro",
        "Minhas operações",
      ],
    };
  }

  return null;
}
