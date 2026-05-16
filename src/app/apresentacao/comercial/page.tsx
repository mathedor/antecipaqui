import Link from "next/link";
import { PresentationPlayer, type Scene } from "@/components/apresentacao/presentation-player";
import {
  SceneHero,
  MockupMapaProspects,
  MockupPipelineKanban,
  MockupCadastroExpress,
  MockupComissoes,
  MockupGenericoSlide,
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra time comercial",
  description:
    "Capture imobiliárias e construtoras, gerencie pipeline de leads, ganhe comissão recorrente sobre cada operação fechada.",
};

const SCENES: Scene[] = [
  {
    id: "intro",
    duration: 5,
    eyebrow: "comercial Antecipaqui",
    titulo: "Capture mais. Feche mais. Ganhe mais.",
    legenda: "Ferramentas pro time de captação trabalhar com volume e foco.",
    conteudo: <SceneHero emoji="💼" title="Bora prospectar?" subtitle="60s pra ver tudo o que tem aqui" />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "mapa",
    duration: 8,
    eyebrow: "cena 1 · prospecção",
    titulo: "Mapa de prospects",
    legenda: "Veja imobs/construtoras na sua região. Pins coloridos: verde = já cliente, amarelo = lead em andamento, azul = novo.",
    conteudo: <MockupMapaProspects />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1e293b 100%)",
    transicao: "slide-left",
  },
  {
    id: "kanban",
    duration: 8,
    eyebrow: "cena 2 · pipeline",
    titulo: "Kanban de leads",
    legenda: "Move o card pelo funil: novo → contato → visita → proposta → fechado. Sempre sabe onde cada lead está.",
    conteudo: <MockupPipelineKanban />,
    fundo: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    transicao: "fade-up",
  },
  {
    id: "cadastro",
    duration: 7,
    eyebrow: "cena 3 · cadastro express",
    titulo: "Lead fechou? Cadastra em 2 minutos",
    legenda: "Form mobile rápido pra criar conta da imob/construtora. Convite vai por email automático, vínculo com você.",
    conteudo: <MockupCadastroExpress />,
    fundo: "linear-gradient(135deg, #0d4e9e 0%, #1c6dd0 100%)",
    transicao: "slide-right",
  },
  {
    id: "comissoes",
    duration: 8,
    eyebrow: "cena 4 · ganhos",
    titulo: "Comissão por cada op fechada",
    legenda: "Toda operação aprovada das suas contas vinculadas gera comissão automática. Acumula no holerite mensal.",
    conteudo: <MockupComissoes />,
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #15803d 100%)",
    transicao: "fade-up",
  },
  {
    id: "templates",
    duration: 7,
    eyebrow: "cena 5 · velocidade",
    titulo: "Templates WhatsApp prontos",
    legenda: "Primeiro contato, follow-up, confirmação. Variáveis {{nome}} {{empresa}} preenchem sozinhas. Mantém tom consistente.",
    conteudo: <MockupGenericoSlide emoji="💬" title="Templates" subtitle="copia, cola, envia · economiza minutos por contato" />,
    fundo: "linear-gradient(135deg, #1c6dd0 0%, #0d4e9e 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
  {
    id: "daily",
    duration: 7,
    eyebrow: "cena 6 · disciplina",
    titulo: "Daily — foco do dia",
    legenda: "Cada manhã, abre e vê: leads pra contatar, visitas agendadas, ops avançando. Sem sumir tarefa.",
    conteudo: <MockupGenericoSlide emoji="📅" title="Sua agenda do dia" subtitle="leads · visitas · ops · tickets" />,
    fundo: "linear-gradient(135deg, #0d1729 0%, #1c6dd0 100%)",
    overlay: true,
    transicao: "slide-left",
  },
  {
    id: "cta",
    duration: 6,
    eyebrow: "bora?",
    titulo: "Pronto pra começar?",
    legenda: "Tour completo, treinamento e suporte direto pra você arrebentar nos primeiros 30 dias.",
    conteudo: (
      <div className="text-center text-white">
        <div className="text-7xl mb-4 animate-mockup-pop">🚀</div>
        <div className="text-2xl font-bold tracking-tight mb-2 animate-text-stagger" style={{ animationDelay: "0.2s" }}>
          Vamos juntos?
        </div>
        <div className="text-sm text-blue-200/90 animate-text-stagger" style={{ animationDelay: "0.4s" }}>
          fale com nosso RH ou seu líder direto
        </div>
      </div>
    ),
    fundo: "linear-gradient(135deg, #0a0e1a 0%, #1c6dd0 50%, #15803d 100%)",
    overlay: true,
    transicao: "fade-zoom",
  },
];

export default function ApresentacaoComercialPage() {
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
            Antecipaqui · pra time comercial
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            O kit do captador.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Em ~60 segundos.
            </span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-blue-50 max-w-2xl">
            Veja como o comercial usa o painel: mapa de prospects, pipeline de
            leads, cadastro express, comissões automáticas e mais.
          </p>
        </div>
      </section>

      <section className="bg-[#020617] py-10 md:py-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <PresentationPlayer scenes={SCENES} />
          <p className="text-center text-xs text-slate-400 mt-4 font-mono no-print">
            controles: ⏸ pausa · ⏭ pula cena · clique na barra pra avançar
          </p>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Quer fazer parte do time?
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg">
            Comissão atrativa + ferramentas que economizam horas todo dia + base
            de contatos pré-qualificada.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-accent text-white font-bold text-sm inline-flex items-center hover:bg-accent-dark transition"
            >
              Quero entrar →
            </Link>
            <Link
              href="/"
              className="h-12 px-6 rounded-xl border border-border text-fg font-bold text-sm inline-flex items-center hover:border-accent transition"
            >
              Voltar
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
