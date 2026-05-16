import Link from "next/link";
import { PresentationPlayer, type Scene } from "@/components/apresentacao/presentation-player";
import {
  SceneHero,
  MockupAtendimentoParceiro,
  MockupDuplicatas,
  MockupCashbackGrowing,
  MockupScoreBar,
  MockupExtratoConstrutora,
  MockupEmpreendimentos,
  MockupEquipeConstrutora,
  MockupForecastPagamentos,
  MockupPendencias,
  MockupChatSuporte,
  MockupNotificacoes,
  MockupGenericoSlide,
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra construtoras",
  description:
    "Tour completo: atendimentos parceiros, duplicatas, cashback, score, extrato, empreendimentos, equipe com roles, forecast e mais.",
};

const SCENES: Scene[] = [
  {
    id: "intro",
    duration: 5,
    eyebrow: "pra construtora",
    titulo: "Você atrai os melhores corretores. Sem mexer no caixa.",
    legenda: "Tour completo — todas as ferramentas que o sistema oferece pra construtora.",
    conteudo: <SceneHero emoji="🏗️" title="Comissão à vista pro corretor" subtitle="parcelado pra você · como sempre foi" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "fluxo",
    duration: 6,
    eyebrow: "cena 1 · como funciona",
    titulo: "Você paga em parcelas, o fundo paga o corretor à vista",
    legenda: "Você não desembolsa nada a mais. O deságio é do corretor — ele topa porque receber hoje vale mais.",
    conteudo: <MockupGenericoSlide emoji="🔄" title="Mesmas datas. Outro destinatário." subtitle="você → fundo · fundo → corretor (à vista)" />,
    fundo: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
    overlay: true,
    transicao: "fade-up",
  },
  {
    id: "atendimento-parceiro",
    duration: 9,
    eyebrow: "★ cena 2 · diferencial",
    titulo: "Você OPINA antes da venda fechar",
    legenda: "Corretor te convida pra atendimento. Você acompanha em tempo real e responde dúvidas críticas com flag (sim/não/condicional).",
    conteudo: <MockupAtendimentoParceiro />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1c6dd0 100%)",
    transicao: "slide-left",
  },
  {
    id: "pre-aprovacao",
    duration: 5,
    eyebrow: "cena 3 · controle",
    titulo: "Sua confirmação antes da assinatura",
    legenda: "Toda op passa pela sua aprovação antes de virar contrato. Você nunca é cobrada por comissão indevida.",
    conteudo: <MockupGenericoSlide emoji="✅" title="Firewall pessoal" subtitle="nenhuma comissão sai sem seu OK" />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "duplicatas",
    duration: 8,
    eyebrow: "cena 4 · pagamento",
    titulo: "Duplicatas — cronograma transparente",
    legenda: "Mesmas datas e valores que tinha combinado com o corretor. Pagamento em lote, antecipação com desconto, tudo num lugar.",
    conteudo: <MockupDuplicatas />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #0d4e9e 100%)",
    transicao: "slide-right",
  },
  {
    id: "extrato",
    duration: 7,
    eyebrow: "cena 5 · histórico",
    titulo: "Extrato — cada centavo registrado",
    legenda: "Cashback ganho, parcelas pagas, estornos. Filtro por período, exportação contábil pronta.",
    conteudo: <MockupExtratoConstrutora />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "slide-left",
  },
  {
    id: "cashback",
    duration: 8,
    eyebrow: "★ cena 6 · dinheiro de volta",
    titulo: "Cashback automático por pagar em dia",
    legenda: "Cada op aprovada gera % de cashback. Acumula no saldo, você saca quando quiser. Liquidez extra sem esforço.",
    conteudo: <MockupCashbackGrowing />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #15803d 100%)",
    transicao: "fade-up",
  },
  {
    id: "score",
    duration: 7,
    eyebrow: "cena 7 · reputação",
    titulo: "Score transparente — você sabe como melhorar",
    legenda: "0 a 100, fórmula pública. Score alto = aprovações rápidas, ops maiores, taxas melhores. Atraso reduz, em dia aumenta.",
    conteudo: <MockupScoreBar />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #15803d 100%)",
    transicao: "fade-zoom",
  },
  {
    id: "forecast",
    duration: 7,
    eyebrow: "cena 8 · previsibilidade",
    titulo: "Forecast — quanto você vai desembolsar",
    legenda: "Projeção 6 meses de pagamentos. Identifica picos de fluxo de caixa, ajuda planejar tesouraria.",
    conteudo: <MockupForecastPagamentos />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #0d4e9e 100%)",
    transicao: "slide-right",
  },
  {
    id: "empreendimentos",
    duration: 7,
    eyebrow: "cena 9 · seu catálogo",
    titulo: "Empreendimentos — torres + unidades cadastradas",
    legenda: "Cada prédio com suas unidades. Quando corretor cadastra venda, ele só seleciona — zero digitação manual.",
    conteudo: <MockupEmpreendimentos />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #0d4e9e 100%)",
    transicao: "fade-up",
  },
  {
    id: "pendencias",
    duration: 6,
    eyebrow: "cena 10 · TODO",
    titulo: "Pendências — nunca esquece nada",
    legenda: "Docs faltando, aprovações urgentes, tickets abertos. Tudo numa tela, urgentes em vermelho.",
    conteudo: <MockupPendencias />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    transicao: "slide-left",
  },
  {
    id: "equipe",
    duration: 8,
    eyebrow: "cena 11 · governança",
    titulo: "Equipe — roles internas separadas",
    legenda: "Financeiro vê duplicatas. Comercial vê ops. Jurídico vê docs. Owner vê tudo. Auditoria por usuário.",
    conteudo: <MockupEquipeConstrutora />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #0d4e9e 100%)",
    transicao: "slide-right",
  },
  {
    id: "notificacoes",
    duration: 6,
    eyebrow: "cena 12 · alertas",
    titulo: "Notificações em tempo real",
    legenda: "Nova op pra confirmar, doc enviado, parcela vencendo, score mudou. Push + email + in-app.",
    conteudo: <MockupNotificacoes />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #15803d 100%)",
    transicao: "fade-up",
  },
  {
    id: "chat",
    duration: 6,
    eyebrow: "cena 13 · suporte",
    titulo: "Chat direto com fundo + corretor + AQ",
    legenda: "Negociação por categoria, todos os envolvidos no mesmo thread. Sem ticket que dorme.",
    conteudo: <MockupChatSuporte />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "slide-left",
  },
  {
    id: "risco-vendas",
    duration: 5,
    eyebrow: "cena 14 · risco",
    titulo: "Painel de risco — vê vendas em alerta",
    legenda: "Operações com atraso, comissões disputadas, parcelas vencendo. Cada caso com ação sugerida.",
    conteudo: <MockupGenericoSlide emoji="⚠️" title="Risco sob controle" subtitle="alertas amarelos · críticos vermelhos · ação 1-clique" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #dc2626 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "mobile",
    duration: 4,
    eyebrow: "cena 15 · mobile",
    titulo: "Tudo no celular — PWA instalável",
    legenda: "Aprovação rápida do reunião, foto de doc no canteiro, chat na obra. Funciona offline-first.",
    conteudo: <MockupGenericoSlide emoji="📱" title="100% mobile" subtitle="aprove no semáforo · tire foto do doc · chat no canteiro" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-up",
  },
  {
    id: "cta",
    duration: 5,
    eyebrow: "começar",
    titulo: "Pronta pra atrair os melhores corretores?",
    legenda: "Sem custo direto pra você. Zero mensalidade. Plataforma completa.",
    conteudo: (
      <div className="text-center text-white">
        <div className="text-7xl mb-4 animate-mockup-pop">🏗️</div>
        <div className="text-2xl font-bold tracking-tight animate-text-stagger" style={{ animationDelay: "0.2s" }}>
          Vamos conversar?
        </div>
      </div>
    ),
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 50%, #15803d 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
];

export default function ApresentacaoConstrutoraPage() {
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
            Antecipaqui · pra construtoras
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Corretor recebe hoje.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Você paga no prazo combinado.
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-blue-50 max-w-2xl">
            Tour completo (~2 min) — todas as ferramentas que sua construtora
            ganha sem custo direto.
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
            Quer atrair os melhores corretores?
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg">
            Sem custo direto. O deságio é do corretor (ele topa porque receber
            hoje vale mais). Você ganha um diferencial competitivo enorme — e
            ainda recebe cashback por pagar em dia.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-accent text-white font-bold text-sm inline-flex items-center hover:bg-accent-dark transition"
            >
              Falar com comercial →
            </Link>
            <Link
              href="/para-construtoras"
              className="h-12 px-6 rounded-xl border border-border text-fg font-bold text-sm inline-flex items-center hover:border-accent transition"
            >
              Ler em detalhe
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
