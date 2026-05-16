import Link from "next/link";
import { PresentationPlayer, type Scene } from "@/components/apresentacao/presentation-player";
import {
  SceneHero,
  MockupAtendimentosCRM,
  MockupLinkDados,
  MockupOperacaoFlow,
  MockupProjecaoCorretor,
  MockupGenericoSlide,
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra corretor e imobiliária",
  description:
    "Receba comissão à vista no dia que fechar a venda. CRM, antecipação em 1 clique, projeção pessoal e suporte.",
};

const SCENES: Scene[] = [
  {
    id: "intro",
    duration: 5,
    eyebrow: "corretor / imobiliária",
    titulo: "Sua comissão. Hoje. Não em 30, 60, 90 dias.",
    legenda: "Tour de 60s pelas ferramentas que você usa todo dia.",
    conteudo: <SceneHero emoji="🏠" title="Comissão à vista" subtitle="sem stress de fluxo de caixa" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "atendimentos",
    duration: 8,
    eyebrow: "cena 1 · CRM",
    titulo: "Atendimentos — seu kanban pessoal",
    legenda: "Cada cliente vira card. Move pelo funil (contato → visita → proposta → fechado). Registra tudo na timeline.",
    conteudo: <MockupAtendimentosCRM />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "slide-left",
  },
  {
    id: "link-dados",
    duration: 8,
    eyebrow: "cena 2 · velocidade",
    titulo: "Link de dados — chega de foto no WhatsApp",
    legenda: "Gera URL única, manda pro cliente. Ele preenche CPF/RG/telefone no celular. Dados caem direto na operação.",
    conteudo: <MockupLinkDados />,
    fundo: "linear-gradient(135deg, #15803d 0%, #166534 100%)",
    transicao: "slide-right",
  },
  {
    id: "convidar-construtora",
    duration: 7,
    eyebrow: "cena 3 · negociação assistida",
    titulo: "Convide a construtora pro atendimento",
    legenda: "Antes de fechar, peça opinião dela: 'pode liberar 8% desconto?'. Ela responde com flag (sim/não/condicional).",
    conteudo: <MockupGenericoSlide emoji="🤝" title="Construtora opina ANTES" subtitle="sim · não · condicional · ninguém é pego de surpresa" />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "fechar",
    duration: 7,
    eyebrow: "cena 4 · atalho",
    titulo: "Fechou? 1 clique → antecipação",
    legenda: "Status 'fechado' mostra botão 'Encaminhar pra antecipação'. Sistema cria a operação rascunho com tudo preenchido.",
    conteudo: <MockupGenericoSlide emoji="⚡" title="Atendimento → Operação" subtitle="atalho que economiza horas de digitação" />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #0d4e9e 100%)",
    overlay: true,
    transicao: "fade-up",
  },
  {
    id: "fluxo-op",
    duration: 8,
    eyebrow: "cena 5 · operação aprovada",
    titulo: "Mesa AQ → fundo → dinheiro na conta",
    legenda: "Análise em 24h. Aprovação do fundo + ZapSign. Em até 1 dia útil, o valor cai com transferência.",
    conteudo: <MockupOperacaoFlow />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #15803d 100%)",
    transicao: "fade-up",
  },
  {
    id: "projecao",
    duration: 7,
    eyebrow: "cena 6 · previsibilidade",
    titulo: "Projeção pessoal — 6 meses à frente",
    legenda: "Veja exatamente quanto vai cair na sua conta nos próximos meses. Planeja viagem, investimento, parcela do carro.",
    conteudo: <MockupProjecaoCorretor />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #0d4e9e 100%)",
    transicao: "slide-left",
  },
  {
    id: "equipe",
    duration: 6,
    eyebrow: "cena 7 · multi-corretor",
    titulo: "Imobiliária? Convide sua equipe",
    legenda: "Cada corretor tem login próprio com permissões certas (corretor só vê os dele; gerente vê tudo). Sem compartilhar senha.",
    conteudo: <MockupGenericoSlide emoji="👥" title="Time inteiro no painel" subtitle="roles internas · audit por usuário" />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
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
            CRM completo + antecipação em 1 clique. Veja o tour de 60 segundos
            por todas as ferramentas.
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
