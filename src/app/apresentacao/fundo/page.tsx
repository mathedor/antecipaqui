import Link from "next/link";
import { ApresentacaoNav } from "@/components/apresentacao/apresentacao-nav";
import { ApresentacaoVideoButton } from "@/components/apresentacao/apresentacao-video-button";
import {
  ApresentacaoSection,
  ApresentacaoFeature,
  ApresentacaoBeneficios,
} from "@/components/apresentacao/apresentacao-section";
import {
  MockupMesaDecisao,
  MockupRegraDryRun,
  MockupRisco,
  MockupCobrancaModos,
  MockupApiCurl,
  MockupWebhookTest,
  MockupDailyFundo,
  MockupFaturas,
  MockupForecastFundo,
  MockupRecaps,
  MockupRecebimentos,
  MockupModoOperacional,
  MockupGenericoSlide,
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra fundos investidores",
  description:
    "Você decide, sistema executa. Mesa de decisão, regras auto, risco, modo operacional por fundo (contrato/assinatura/cobrança), API REST + webhooks. Tour completo.",
};

const NAV_ITEMS = [
  { href: "#decisao", label: "Decisão" },
  { href: "#operacao", label: "Operação" },
  { href: "#risco", label: "Risco" },
  { href: "#cobranca", label: "Cobrança" },
  { href: "#financeiro", label: "Financeiro" },
  { href: "#integracao", label: "Integração" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#cta", label: "Conversar" },
];

export default function ApresentacaoFundoPage() {
  return (
    <>
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body { background: #fff !important; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <ApresentacaoNav brand="ANTECIPAQUI · FUNDO" items={NAV_ITEMS} />

      {/* HERO */}
      <section
        id="topo"
        className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white"
      >
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-3 font-bold">
            Antecipaqui · pra fundos investidores
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Capital + tecnologia.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Rendimento previsível.
            </span>
          </h1>
          <p className="mt-6 text-base md:text-xl text-blue-50 max-w-2xl leading-relaxed">
            Mesa de decisão, regras automáticas, cobrança auto, API REST e
            webhooks. Plataforma completa pra fundos a partir de R$ 5M.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-white text-[#0a0e1a] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Agendar conversa →
            </Link>
            <ApresentacaoVideoButton src="/apresentacao/apresentacao-fundo.mp4" />
          </div>
        </div>
      </section>

      {/* SEÇÃO 1 — DECISÃO */}
      <ApresentacaoSection
        id="decisao"
        eyebrow="DECISÃO · MESA + AUTOMAÇÃO"
        titulo="Aprove em segundos. Automatize as óbvias."
        intro="Score automático de cada construtora, decomposição financeira inline, regras dry-run testáveis contra histórico. Você decide o que delegar."
      >
        <ApresentacaoFeature
          titulo="Mesa de decisão — todas as ops num lugar"
          desc="Score da construtora, validação IA dos docs, decomposição financeira inline. 10-15 ops aprovadas em 30 minutos."
          bullets={[
            "Filtros: pendentes, urgentes, por construtora, por valor",
            "Aprovação em lote pra ops abaixo de threshold",
            "Histórico de cada decisão com motivo (auditável)",
          ]}
          mockup={<MockupMesaDecisao />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Regras automáticas — pare de aprovar 1 a 1"
          desc="Configure critérios e o sistema aprova sozinho as ops 'óbvias'. Simulação dry-run testa contra histórico ANTES de salvar."
          bullets={[
            "Critérios: taxa mínima, prazo, valor, construtora",
            "Dry-run mostra % de cobertura sobre últimas 90 ops",
            "Auditoria registra qual regra acionou cada aprovação",
          ]}
          hint="regras auto cobrem ~70% das ops óbvias em fundos bem calibrados"
          mockup={<MockupRegraDryRun />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO — MODO OPERACIONAL */}
      <ApresentacaoSection
        id="operacao"
        eyebrow="MODO OPERACIONAL · CADA FUNDO DO SEU JEITO"
        titulo="A operação nasce no Antecipaqui. Você define o resto."
        intro="Cada fundo tem sua modulação. Configure quem gera o contrato, quem coleta a assinatura e quem emite as cobranças — o sistema orquestra tudo e mantém construtora, imobiliária e comercial avisados em cada passo."
      >
        <ApresentacaoFeature
          titulo="Contrato e assinatura do seu jeito"
          desc="Escolha quem gera o contrato e quem coleta a assinatura. A Antecipaqui SEMPRE assina como testemunha — regra fixa em toda operação."
          bullets={[
            "Antecipaqui gera + assina: contrato automático via ZapSign",
            "Você gera + Antecipaqui assina: mandamos os dados da op (HMAC), você devolve o contrato e nós coletamos a assinatura",
            "Você gera + assina: devolve o contrato já assinado e a gente só registra e segue pro pagamento",
          ]}
          hint="webhook de retorno por fundo · POST /api/contrato-assinatura/webhook/{fundoId}"
          mockup={<MockupModoOperacional />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Custos, taxas e contrato modelo — pré-configurados"
          desc="Custo do dinheiro e valor da operação por fundo (spread calculado automático). Custos padrão clonados em cada operação aprovada. Contrato modelo e até sistema de assinatura próprio (D4Sign, Clicksign…)."
          bullets={[
            "Custos padrão entram sozinhos em toda op aprovada",
            "Cobrança: você define se quem gera é o fundo ou a Antecipaqui",
            "Assinatura digital própria ou o ZapSign padrão da plataforma",
          ]}
          mockup={
            <MockupGenericoSlide
              emoji="📋"
              title="Modulação por fundo"
              subtitle="custo do dinheiro · valor da operação · custos padrão · contrato modelo"
            />
          }
        />
        <ApresentacaoFeature
          titulo="Sua rede: parceiros e comerciais vinculados"
          desc="Veja as construtoras com quem você opera e os comerciais ligados ao seu fundo. Relacionamento e originação num lugar só."
          bullets={[
            "Construtoras parceiras com histórico de operações",
            "Comerciais vinculados que trazem originação pro fundo",
            "Tudo conectado às operações, recebimentos e faturas",
          ]}
          mockup={
            <MockupGenericoSlide
              emoji="🤝"
              title="Parceiros + comerciais"
              subtitle="construtoras parceiras e captadores ligados ao fundo"
            />
          }
        />
      </ApresentacaoSection>

      {/* SEÇÃO 2 — RISCO */}
      <ApresentacaoSection
        id="risco"
        eyebrow="RISCO · CONCENTRAÇÃO + BLACKLIST"
        titulo="Risco proativo, não reativo"
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Concentração + blacklist"
          desc="Veja quais construtoras concentram seu capital. Alerta automático em 25%, crítico em 40%. Blacklist instantânea pra bloquear."
          bullets={[
            "Concentração por construtora, imobiliária e UF",
            "Blacklist instantânea (não aceita novas ops)",
            "Histórico de alertas com responsável que viu/resolveu",
          ]}
          mockup={<MockupRisco />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 3 — COBRANÇA */}
      <ApresentacaoSection
        id="cobranca"
        eyebrow="COBRANÇA · 3 MODOS"
        titulo="Cobrança do jeito que seu banco trabalha"
      >
        <ApresentacaoFeature
          titulo="Manual, API ou CNAB — você escolhe"
          desc="Manual (você dá baixa). API (banco emite + webhook auto baixa). CNAB (remessa/retorno em lote). Multa + juros automáticos."
          bullets={[
            "Manual: pra fundos em fase piloto",
            "API: integração direta com Itaú, Bradesco, Sicredi, BB",
            "CNAB 240/400: padrão FEBRABAN, qualquer banco",
          ]}
          hint="multa 2% padrão · juros mora 1%/mês · configuráveis por fundo"
          mockup={<MockupCobrancaModos />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Daily — quem precisa pagar HOJE"
          desc="Parcelas vencendo, vencidas e recebidas. Cálculo automático de multa/juros. 1 clique pra cobrar via WhatsApp ou email."
          bullets={[
            "Cron diário às 12h UTC notifica fundos + construtoras",
            "Ticket de confirmação aberto fundo ↔ construtora",
            "Idempotente: não duplica cobranças",
          ]}
          mockup={<MockupDailyFundo />}
        />
        <ApresentacaoFeature
          titulo="Recebimentos — heatmap quinzenal"
          desc="Veja a quinzena inteira de uma vez. Onde concentra dinheiro, onde tem vácuo. Planeje captação ou pause originação."
          bullets={[
            "Heatmap colorido por intensidade de recebimento",
            "Clique no dia: lista de parcelas detalhadas",
            "Exportação pra planilha de tesouraria",
          ]}
          mockup={<MockupRecebimentos />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 4 — FINANCEIRO */}
      <ApresentacaoSection
        id="financeiro"
        eyebrow="FINANCEIRO · FATURAS + FORECAST"
        titulo="Spread, custos e forecast — calculados na hora"
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Faturas AQ — proporcional ao pago"
          desc="AQ só cobra o % efetivamente pago no período. Spread/2 + custos. Transparência total, nenhuma surpresa no boleto."
          bullets={[
            "Fórmula pública: custos + spread/2 (lado AQ)",
            "Detalhamento por operação na fatura PDF",
            "Pagamento via boleto ou TED programado",
          ]}
          hint="invoice = resultado_op_AQ × (pago_no_periodo / valor_comissao)"
          mockup={<MockupFaturas />}
        />
        <ApresentacaoFeature
          onDark
          reverse
          titulo="Forecast — 6 meses de previsão"
          desc="Bruto + parte do fundo (spread/2 + custo capital). Plano de captação claro pra próximos 180 dias."
          bullets={[
            "Cenários (pessimista/esperado/otimista) configuráveis",
            "Comparativo com forecast anterior pra calibrar",
            "Exportação pra Excel ou Google Sheets",
          ]}
          mockup={<MockupForecastFundo />}
        />
        <ApresentacaoFeature
          onDark
          titulo="Recaps — diário, semanal, mensal por email"
          desc="Todo dia 7h, fechamento do anterior cai no seu email. Destaques, KPIs, ops importantes. Você lê em 30 segundos."
          bullets={[
            "Configurável: quais KPIs aparecem",
            "Destaques (op excepcional, atraso crítico)",
            "Envio para múltiplos emails (gestor + comitê)",
          ]}
          mockup={<MockupRecaps />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 5 — INTEGRAÇÃO */}
      <ApresentacaoSection
        id="integracao"
        eyebrow="INTEGRAÇÃO · API + WEBHOOKS"
        titulo="Integre com seu ERP, core bancário ou BI"
      >
        <ApresentacaoFeature
          titulo="API REST — 5 endpoints + Bearer"
          desc="GET /me, /operacoes, /parcelas + POST /decisao. Autenticação Bearer com escopos read_only e read_write. Sandbox com curl pronto."
          bullets={[
            "Token hash SHA-256 (plaintext mostrado uma vez)",
            "Rate limit configurável por chave",
            "Histórico de requests pra debugging",
          ]}
          hint="docs completas em /docs/api · OpenAPI 3.1"
          mockup={<MockupApiCurl />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Webhooks HMAC + retry automático"
          desc="Op aprovada, parcela paga, fundo decidiu — tudo cai no seu sistema em tempo real. Botão 🧪 testar valida antes da produção."
          bullets={[
            "HMAC SHA-256 assina cada payload",
            "Retry exponencial: 1, 5, 25, 125 minutos",
            "Histórico de tentativas + replay manual",
          ]}
          mockup={<MockupWebhookTest />}
        />
      </ApresentacaoSection>

      {/* BENEFÍCIOS */}
      <ApresentacaoBeneficios
        titulo="Por que fundos escolhem"
        items={[
          {
            emoji: "🎯",
            titulo: "Rendimento previsível",
            desc: "Spread + custo capital calibrável por contrato.",
          },
          {
            emoji: "🛡️",
            titulo: "Risco controlado",
            desc: "Alertas em 25% / críticos em 40% / blacklist instantânea.",
          },
          {
            emoji: "⚡",
            titulo: "Operação enxuta",
            desc: "Regras auto cobrem 70% das óbvias. Você foca no resto.",
          },
          {
            emoji: "🔗",
            titulo: "Integra com seu ERP",
            desc: "API REST + webhooks HMAC prontos. SDK em Node/Python.",
          },
        ]}
      />

      {/* CTA FINAL */}
      <section id="cta" className="bg-white py-16 md:py-24 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Pronto pra alocar capital com gestão profissional?
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg leading-relaxed">
            Conversa de 30 minutos com nosso head comercial pra calibrar volume
            (a partir de R$ 5M), retorno alvo, prazo e processo de onboarding.
            Documentos e contratos prontos.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-accent text-white font-bold text-sm inline-flex items-center hover:bg-accent-dark transition"
            >
              Agendar conversa →
            </Link>
            <a
              href="/docs/api"
              className="h-12 px-6 rounded-xl border border-border text-fg font-bold text-sm inline-flex items-center hover:border-accent transition"
            >
              Ver docs da API
            </a>
            <ApresentacaoVideoButton
              src="/apresentacao/apresentacao-fundo.mp4"
              className="border-border text-fg hover:bg-slate-100"
              label="▶ Ver em 60s"
            />
          </div>
        </div>
      </section>
    </>
  );
}
