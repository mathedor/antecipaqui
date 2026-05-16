import Link from "next/link";
import { PresentationPlayer, type Scene } from "@/components/apresentacao/presentation-player";
import {
  SceneHero,
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
  MockupChatSuporte,
  MockupGenericoSlide,
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra fundos investidores",
  description:
    "Tour completo: mesa de decisão, regras auto, risco, daily, recebimentos, faturas, forecast, recaps, cobrança, API REST, webhooks.",
};

const SCENES: Scene[] = [
  {
    id: "intro",
    duration: 5,
    eyebrow: "pra fundo investidor",
    titulo: "Você decide. O sistema executa.",
    legenda: "Tour completo (~2 min) pela cabine de comando de um fundo de antecipação.",
    conteudo: <SceneHero emoji="🏦" title="Capital + Tecnologia" subtitle="rendimento previsível · risco controlado" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "mesa",
    duration: 8,
    eyebrow: "cena 1 · operação diária",
    titulo: "Mesa de decisão — aprove em segundos",
    legenda: "Score automático da construtora, validação IA de docs, decomposição financeira inline. 10-15 ops em 30 min.",
    conteudo: <MockupMesaDecisao />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "slide-left",
  },
  {
    id: "regras",
    duration: 9,
    eyebrow: "★ cena 2 · automação",
    titulo: "Regras automáticas — pare de aprovar 1 a 1",
    legenda: "Configure critérios e o sistema aprova sozinho as ops 'óbvias'. Simulação dry-run testa contra histórico ANTES de salvar.",
    conteudo: <MockupRegraDryRun />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #0d4e9e 100%)",
    transicao: "slide-right",
  },
  {
    id: "risco",
    duration: 7,
    eyebrow: "cena 3 · risco proativo",
    titulo: "Concentração + blacklist",
    legenda: "Veja quais construtoras concentram seu capital. Alerta automático em 25%, crítico em 40%. Blacklist instantânea.",
    conteudo: <MockupRisco />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1c6dd0 100%)",
    transicao: "fade-up",
  },
  {
    id: "daily",
    duration: 7,
    eyebrow: "cena 4 · cobrança do dia",
    titulo: "Daily — quem precisa pagar HOJE",
    legenda: "Parcelas vencendo, vencidas e recebidas. Cálculo automático de multa/juros. 1 clique pra cobrar.",
    conteudo: <MockupDailyFundo />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    transicao: "slide-left",
  },
  {
    id: "recebimentos",
    duration: 7,
    eyebrow: "cena 5 · fluxo",
    titulo: "Recebimentos — heatmap dos próximos 14 dias",
    legenda: "Veja a quinzena inteira de uma vez. Onde concentra dinheiro, onde tem vácuo. Planeje captação.",
    conteudo: <MockupRecebimentos />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #15803d 100%)",
    transicao: "slide-right",
  },
  {
    id: "cobranca",
    duration: 8,
    eyebrow: "cena 6 · cobrança",
    titulo: "3 modos de cobrança — escolha o seu",
    legenda: "Manual (você dá baixa), API (banco emite + webhook auto), CNAB (remessa/retorno em lote). Multa + juros automáticos.",
    conteudo: <MockupCobrancaModos />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #15803d 100%)",
    transicao: "fade-up",
  },
  {
    id: "faturas",
    duration: 7,
    eyebrow: "cena 7 · cobrança AQ",
    titulo: "Faturas AQ — proporcional ao que entrou",
    legenda: "AQ só cobra o % efetivamente pago no período. Spread/2 + custos. Transparência total.",
    conteudo: <MockupFaturas />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "fade-zoom",
  },
  {
    id: "forecast",
    duration: 7,
    eyebrow: "cena 8 · estratégia",
    titulo: "Forecast — 6 meses de previsão",
    legenda: "Bruto + parte do fundo (spread/2 + custo capital). Plano de captação claro pra próximos 180 dias.",
    conteudo: <MockupForecastFundo />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #0d4e9e 100%)",
    transicao: "slide-left",
  },
  {
    id: "recaps",
    duration: 7,
    eyebrow: "cena 9 · resumos",
    titulo: "Recaps — diário, semanal, mensal",
    legenda: "Email todo dia 7h com fechamento. Destaques, KPIs, ops importantes. Você lê em 30 segundos.",
    conteudo: <MockupRecaps />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #1c6dd0 100%)",
    transicao: "slide-right",
  },
  {
    id: "api",
    duration: 8,
    eyebrow: "★ cena 10 · API REST",
    titulo: "Integre com seu ERP/core bancário",
    legenda: "5 endpoints REST, autenticação Bearer, escopos read_only/read_write. Sandbox com curl pronto pra colar.",
    conteudo: <MockupApiCurl />,
    fundo: "linear-gradient(135deg, #020617 0%, #0d1729 100%)",
    transicao: "slide-left",
  },
  {
    id: "webhooks",
    duration: 8,
    eyebrow: "★ cena 11 · push em tempo real",
    titulo: "Webhooks com HMAC + retry automático",
    legenda: "Op aprovada, parcela paga, fundo decidiu — tudo cai no seu sistema em tempo real. Botão 🧪 testar valida antes da produção.",
    conteudo: <MockupWebhookTest />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1e293b 100%)",
    transicao: "fade-zoom",
  },
  {
    id: "chat",
    duration: 6,
    eyebrow: "cena 12 · comunicação",
    titulo: "Chat por operação — fundo ↔ construtora",
    legenda: "Dúvida em uma op? Abre chat direto com a construtora. Histórico fica anexo à operação.",
    conteudo: <MockupChatSuporte />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "fade-up",
  },
  {
    id: "parceiros",
    duration: 5,
    eyebrow: "cena 13 · rede",
    titulo: "Parceiros + Comerciais vinculados",
    legenda: "Construtoras que você financia, time comercial dedicado ao seu fundo. Tudo num só lugar.",
    conteudo: <MockupGenericoSlide emoji="🤝" title="Sua rede de parceiros" subtitle="construtoras fidelizadas · time AQ dedicado" />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #0d4e9e 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "pendencias",
    duration: 5,
    eyebrow: "cena 14 · TODOs",
    titulo: "Pendências de decisão — nada cai no esquecimento",
    legenda: "Tudo que precisa do seu olho: confirmações, ops pra rever, docs anexados. Priorizado por urgência.",
    conteudo: <MockupGenericoSlide emoji="📋" title="Sua caixa de entrada" subtitle="ops pendentes · docs novos · respostas urgentes" />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "slide-left",
  },
  {
    id: "mobile",
    duration: 4,
    eyebrow: "cena 15 · mobile",
    titulo: "Mesa de decisão no celular",
    legenda: "Aprovar 5 ops no carro? Funciona. PWA instalável, push real, gestos rápidos.",
    conteudo: <MockupGenericoSlide emoji="📱" title="Aprove em qualquer lugar" subtitle="PWA · push · gestos · biometria" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "cta",
    duration: 5,
    eyebrow: "vamos conversar?",
    titulo: "Capital de R$ 5M+ pronto pra alocar?",
    legenda: "Conversa de 30 min com nosso head comercial pra calibrar volume, retorno alvo e processo de onboarding.",
    conteudo: (
      <div className="text-center text-white">
        <div className="text-7xl mb-4 animate-mockup-pop">🤝</div>
        <div className="text-2xl font-bold tracking-tight animate-text-stagger" style={{ animationDelay: "0.2s" }}>
          Bora alocar?
        </div>
        <div className="text-sm text-blue-200/90 mt-2 animate-text-stagger" style={{ animationDelay: "0.4s" }}>
          fundo@antecipaqui.digital
        </div>
      </div>
    ),
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 50%, #15803d 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
];

export default function ApresentacaoFundoPage() {
  return (
    <>
      <style>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white">
        <div className="relative max-w-6xl mx-auto px-6 py-10 md:py-14">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-3">
            Antecipaqui · pra fundos investidores
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Capital + tecnologia.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Rendimento previsível.
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-blue-50 max-w-2xl">
            Tour cinematográfico (~2 min) de todas as ferramentas: mesa, regras,
            risco, cobrança auto, API REST, webhooks, forecast e mais.
          </p>
        </div>
      </section>

      <section className="bg-[#020617] py-10 md:py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <PresentationPlayer scenes={SCENES} />
          <p className="text-center text-xs text-slate-400 mt-4 font-mono no-print">
            ⏸ pausa · ⏭ pula cena · clique na barra pra avançar
          </p>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Pronto pra alocar capital com gestão profissional?
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg">
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
          </div>
        </div>
      </section>
    </>
  );
}
