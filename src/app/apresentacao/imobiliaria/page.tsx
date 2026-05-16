import Link from "next/link";
import { PresentationPlayer, type Scene } from "@/components/apresentacao/presentation-player";
import {
  SceneHero,
  MockupAtendimentosCRM,
  MockupLinkDados,
  MockupOperacaoFlow,
  MockupProjecaoCorretor,
  MockupNovaOperacao,
  MockupEquipeCorretor,
  MockupRelatorioCorretor,
  MockupConvitesCorretor,
  MockupSimulador,
  MockupChatSuporte,
  MockupNotificacoes,
  MockupGenericoSlide,
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra corretor e imobiliária",
  description:
    "Tour completo: CRM, link de dados, simulador, antecipação 1 clique, projeção pessoal, equipe e mais. Cada ferramenta do painel do corretor.",
};

const SCENES: Scene[] = [
  {
    id: "intro",
    duration: 5,
    eyebrow: "corretor / imobiliária",
    titulo: "Sua comissão. Hoje. Não em 30, 60, 90 dias.",
    legenda: "Tour completo pelo painel — 15+ ferramentas que você usa todo dia.",
    conteudo: <SceneHero emoji="🏠" title="Comissão à vista" subtitle="sem stress de fluxo de caixa" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "simulador",
    duration: 7,
    eyebrow: "cena 1 · antes de cadastrar",
    titulo: "Simulador — veja na hora quanto cai pra você",
    legenda: "Coloca valor da comissão + parcelas → mostra valor presente, deságio, % líquido. Sem cadastrar nada.",
    conteudo: <MockupSimulador />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1c6dd0 100%)",
    transicao: "fade-up",
  },
  {
    id: "atendimentos",
    duration: 8,
    eyebrow: "cena 2 · CRM",
    titulo: "Atendimentos — seu kanban pessoal",
    legenda: "Cada cliente vira card. Move pelo funil (contato → visita → proposta → fechado). Registra tudo na timeline.",
    conteudo: <MockupAtendimentosCRM />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "slide-left",
  },
  {
    id: "link-dados",
    duration: 8,
    eyebrow: "cena 3 · velocidade",
    titulo: "Link de dados — chega de foto no WhatsApp",
    legenda: "Gera URL única, manda pro cliente. Ele preenche CPF/RG/telefone no celular. Dados caem direto na operação.",
    conteudo: <MockupLinkDados />,
    fundo: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
    transicao: "slide-right",
  },
  {
    id: "convidar-construtora",
    duration: 6,
    eyebrow: "cena 4 · negociação assistida",
    titulo: "Convide a construtora pro atendimento",
    legenda: "Antes de fechar, peça opinião dela: 'pode liberar 8% desconto?'. Ela responde com flag (sim/não/condicional).",
    conteudo: <MockupGenericoSlide emoji="🤝" title="Construtora opina ANTES" subtitle="sim · não · condicional · ninguém é pego de surpresa" />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "atalho-fechar",
    duration: 5,
    eyebrow: "cena 5 · atalho",
    titulo: "Fechou? 1 clique → operação rascunho pronta",
    legenda: "Status 'fechado' mostra botão 'Encaminhar pra antecipação'. Sistema cria a op com tudo preenchido.",
    conteudo: <MockupGenericoSlide emoji="⚡" title="Atendimento → Operação" subtitle="atalho que economiza horas de digitação" />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #0d4e9e 100%)",
    overlay: true,
    transicao: "fade-up",
  },
  {
    id: "nova-op",
    duration: 8,
    eyebrow: "cena 6 · cadastro",
    titulo: "Nova operação — anexa contrato, IA preenche",
    legenda: "Solta o PDF do contrato. Claude lê e preenche comprador, unidade, parcelas, datas. Você só revisa.",
    conteudo: <MockupNovaOperacao />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #0d4e9e 100%)",
    transicao: "slide-left",
  },
  {
    id: "fluxo-op",
    duration: 8,
    eyebrow: "cena 7 · operação aprovada",
    titulo: "Análise → fundo → ZapSign → dinheiro",
    legenda: "Mesa AQ analisa em 24h. Fundo aprova. Você assina por ZapSign. Em 4h o valor cai com transferência.",
    conteudo: <MockupOperacaoFlow />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #15803d 100%)",
    transicao: "fade-up",
  },
  {
    id: "notificacoes",
    duration: 6,
    eyebrow: "cena 8 · alertas",
    titulo: "Notificações em tempo real — push + email + in-app",
    legenda: "Op aprovada, parcela paga, doc pendente, score mudou — tudo cai no seu celular na hora.",
    conteudo: <MockupNotificacoes />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #15803d 100%)",
    transicao: "fade-zoom",
  },
  {
    id: "projecao",
    duration: 7,
    eyebrow: "cena 9 · previsibilidade",
    titulo: "Projeção pessoal — 6 meses à frente",
    legenda: "Veja exatamente quanto vai cair na sua conta nos próximos meses. Planeja viagem, investimento, parcela do carro.",
    conteudo: <MockupProjecaoCorretor />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #0d4e9e 100%)",
    transicao: "slide-left",
  },
  {
    id: "relatorio",
    duration: 7,
    eyebrow: "cena 10 · performance",
    titulo: "Relatório + ranking interno",
    legenda: "KPIs do mês (ops, volume, comissão), ranking da imobiliária, histórico. Tudo exportável.",
    conteudo: <MockupRelatorioCorretor />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1c6dd0 100%)",
    transicao: "slide-right",
  },
  {
    id: "equipe",
    duration: 8,
    eyebrow: "cena 11 · multi-corretor",
    titulo: "Imobiliária? Convide sua equipe",
    legenda: "Cada corretor tem login. Roles: owner vê tudo, gerente vê relatórios, corretor só suas ops. Audit por usuário.",
    conteudo: <MockupEquipeCorretor />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    transicao: "slide-left",
  },
  {
    id: "convites",
    duration: 6,
    eyebrow: "cena 12 · mobilidade",
    titulo: "Convites de imobiliárias pra você",
    legenda: "Solo? Imobiliárias podem te convidar pro time. Aceita ou recusa — você decide com quem trabalha.",
    conteudo: <MockupConvitesCorretor />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #0d4e9e 100%)",
    transicao: "fade-up",
  },
  {
    id: "chat",
    duration: 7,
    eyebrow: "cena 13 · suporte",
    titulo: "Chat direto — sem ticket que dorme",
    legenda: "Suporte AQ, negociações com a construtora, dúvidas docs. Categoria certa, gente certa, resposta em minutos.",
    conteudo: <MockupChatSuporte />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "slide-right",
  },
  {
    id: "mobile",
    duration: 5,
    eyebrow: "cena 14 · mobile",
    titulo: "Tudo funciona no celular — PWA instalável",
    legenda: "Adiciona à tela inicial. Push real. Trabalha do carro, do café, da praia.",
    conteudo: <MockupGenericoSlide emoji="📱" title="100% mobile" subtitle="PWA · offline-first · push real" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "extras",
    duration: 6,
    eyebrow: "cena 15 · outros",
    titulo: "Mais ferramentas no painel",
    legenda: "Coleta de doc por OCR, ZapSign integrado, tour interativo, perfil financeiro, exportação CSV — explore.",
    conteudo: <MockupGenericoSlide emoji="✨" title="OCR · ZapSign · CSV · Tour" subtitle="cada detalhe pensado pro corretor" />,
    fundo: "linear-gradient(135deg, #15803d 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-up",
  },
  {
    id: "cta",
    duration: 5,
    eyebrow: "começar",
    titulo: "Cadastro rápido. Primeira operação na primeira semana.",
    legenda: "Sem mensalidade. Sem fidelidade. Você só paga deságio quando usa.",
    conteudo: (
      <div className="text-center text-white">
        <div className="text-7xl mb-4 animate-mockup-pop">🚀</div>
        <div className="text-2xl font-bold tracking-tight animate-text-stagger" style={{ animationDelay: "0.2s" }}>
          Bora?
        </div>
      </div>
    ),
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 50%, #15803d 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
];

export default function ApresentacaoImobiliariaPage() {
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
            Antecipaqui · pra corretor e imobiliária
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Sua comissão.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Hoje. Não em 30 dias.
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-blue-50 max-w-2xl">
            Tour completo (~2 min) pelo painel do corretor — 15+ ferramentas que
            você usa todo dia.
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
            Cadastro rápido. Primeira operação na primeira semana.
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg">
            Zero mensalidade. Você só paga deságio quando antecipa uma comissão
            — sai do bolso do <em>seu</em> caixa, não da construtora.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-accent text-white font-bold text-sm inline-flex items-center hover:bg-accent-dark transition"
            >
              Cadastrar agora →
            </Link>
            <Link
              href="/como-funciona"
              className="h-12 px-6 rounded-xl border border-border text-fg font-bold text-sm inline-flex items-center hover:border-accent transition"
            >
              Como funciona em detalhe
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
