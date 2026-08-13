import Link from "next/link";
import { ApresentacaoNav } from "@/components/apresentacao/apresentacao-nav";
import { ApresentacaoVideoButton } from "@/components/apresentacao/apresentacao-video-button";
import {
  ApresentacaoSection,
  ApresentacaoFeature,
  ApresentacaoBeneficios,
} from "@/components/apresentacao/apresentacao-section";
import {
  MockupMapaProspects,
  MockupPipelineKanban,
  MockupCadastroExpress,
  MockupComissoes,
  MockupTemplatesWhatsapp,
  MockupDailyComercial,
  MockupHolerite,
  MockupConviteLink,
  MockupRelatorioCorretor,
  MockupChatSuporte,
  MockupNotificacoes,
  MockupGenericoSlide,
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra time comercial",
  description:
    "Capture imobiliárias e construtoras, gerencie pipeline, ganhe comissão recorrente. Mapa, pipeline, daily, templates WA, holerite e mais.",
};

const NAV_ITEMS = [
  { href: "#captacao", label: "Captação" },
  { href: "#diaria", label: "Rotina diária" },
  { href: "#ganhos", label: "Ganhos" },
  { href: "#performance", label: "Performance" },
  { href: "#suporte", label: "Suporte" },
  { href: "#kit", label: "Kit de venda" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#cta", label: "Entrar" },
];

/** Deck standalone "Manual do Comercial" — treinamento completo da plataforma. */
const MANUAL_COMERCIAL_URL = "https://antecipaqui-comercial.vercel.app";

/** O que o comercial manda pra cada público. */
const KIT = [
  {
    num: "01",
    titulo: "Vai apresentar pra uma imobiliária ou corretor?",
    desc: "Apresentação feita pra quem vende e quer receber hoje: simulador, cadastro da operação, projeção de recebíveis, equipe e pagamento em 1 dia útil.",
    href: "/apresentacao/imobiliaria",
    label: "antecipaqui.digital/apresentacao/imobiliaria",
  },
  {
    num: "02",
    titulo: "Vai apresentar pra uma construtora?",
    desc: "Apresentação feita pra quem deve a comissão: confirmação de duplicatas, extrato do que vence, risco e concentração, documentos — e zero mudança no prazo de pagamento.",
    href: "/apresentacao/construtora",
    label: "antecipaqui.digital/apresentacao/construtora",
  },
  {
    num: "03",
    titulo: "Quer mostrar a plataforma inteira?",
    desc: "O deck completo, nível por nível: Cícero (IA), imobiliária, construtora, fundo e comercial. Pra reunião com sócio, investidor ou quem quer ver tudo antes de decidir.",
    href: "https://antecipaqui-apresentacao.vercel.app/publica",
    label: "antecipaqui-apresentacao.vercel.app/publica",
    externo: true,
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
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <ApresentacaoNav brand="ANTECIPAQUI · COMERCIAL" items={NAV_ITEMS} />

      {/* HERO */}
      <section
        id="topo"
        className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white"
      >
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-3 font-bold">
            Antecipaqui · pra time comercial
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Capture mais.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Ganhe mais.
            </span>
          </h1>
          <p className="mt-6 text-base md:text-xl text-blue-50 max-w-2xl leading-relaxed">
            O kit do captador: mapa geo, pipeline, templates WhatsApp, cadastro
            express, comissões automáticas e holerite mensal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/quero-ser-comercial"
              className="h-12 px-6 rounded-xl bg-white text-[#0a0e1a] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Quero entrar →
            </Link>
            <a
              href={MANUAL_COMERCIAL_URL}
              target="_blank"
              rel="noopener"
              className="h-12 px-6 rounded-xl border border-white/30 text-white font-bold text-sm inline-flex items-center hover:bg-white/10 transition"
            >
              Manual do Comercial ↗
            </a>
            <ApresentacaoVideoButton src="/apresentacao/apresentacao-comercial.mp4" />
          </div>
        </div>
      </section>

      {/* SEÇÃO 1 — CAPTAÇÃO */}
      <ApresentacaoSection
        id="captacao"
        eyebrow="CAPTAÇÃO · MAPA + PIPELINE"
        titulo="Prospecta, qualifica, cadastra — em 1 fluxo"
        intro="Mapa por geo mostra prospects da sua região. Pipeline kanban controla cada lead. Cadastro express converte em 2 minutos quando fechar."
      >
        <ApresentacaoFeature
          titulo="Mapa de prospects geolocalizado"
          desc="Veja imobs/construtoras na sua região. Pins coloridos: verde = já cliente, amarelo = lead em andamento, azul = novo."
          bullets={[
            "Filtro por raio, tipo, porte, CRECI",
            "1 clique adiciona ao seu pipeline",
            "Funciona em mobile com GPS pra captação na rua",
          ]}
          mockup={<MockupMapaProspects />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Kanban de leads — funil completo"
          desc="Move o card pelo funil: novo → contato → visita → proposta → fechado. Sempre sabe onde cada lead está e o que falta."
          bullets={[
            "Anotações + histórico de contatos por lead",
            "Reagenda automática quando esquece de retornar",
            "Métricas: taxa de conversão por etapa",
          ]}
          mockup={<MockupPipelineKanban />}
        />
        <ApresentacaoFeature
          titulo="Cadastro express — converte em 2 minutos"
          desc="Lead fechou? Form mobile rápido pra criar conta da imob/construtora. Convite por email automático, vínculo com você."
          bullets={[
            "Pré-validação CNPJ (Receita Federal)",
            "Auto-preenchimento via CEP",
            "Email de boas-vindas configurável",
          ]}
          mockup={<MockupCadastroExpress />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Link único de convite + QR code"
          desc="Manda só o link no WhatsApp ou QR no evento. Qualquer imob que cadastrar vira sua. Métricas em tempo real."
          bullets={[
            "Cliques, cadastros e ativos visíveis",
            "QR code pronto pra imprimir (alta resolução)",
            "Múltiplos links pra campanhas diferentes",
          ]}
          mockup={<MockupConviteLink />}
        />
        <ApresentacaoFeature
          titulo="Cadastrou a imob? Já lança a primeira operação"
          desc="Não para na captação: você mesmo cadastra a operação do parceiro — solta o contrato, a IA preenche, e ela entra no mesmo fluxo de análise e assinatura."
          bullets={[
            "Nova operação direto pelo seu painel",
            "IA lê o contrato e preenche os dados",
            "Acompanha o status até virar comissão sua",
          ]}
          mockup={
            <MockupGenericoSlide
              emoji="📝"
              title="Nova operação"
              subtitle="você cadastra a op do parceiro e acompanha até o fim"
            />
          }
        />
      </ApresentacaoSection>

      {/* SEÇÃO 2 — ROTINA DIÁRIA */}
      <ApresentacaoSection
        id="diaria"
        eyebrow="ROTINA · DAILY + TEMPLATES"
        titulo="Cada manhã, abre e sabe o que fazer"
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Daily — sua agenda focada"
          desc="Leads pra contatar, visitas agendadas, ops avançando, tickets pra responder. Sem sumir tarefa, sem prioridade ambígua."
          bullets={[
            "Ordenado por urgência (atrasado em vermelho)",
            "Atalhos: ligar, mandar WA, abrir lead, marcar feito",
            "Resumo diário por email pra começar bem o dia",
          ]}
          mockup={<MockupDailyComercial />}
        />
        <ApresentacaoFeature
          onDark
          reverse
          titulo="Templates WhatsApp prontos"
          desc="Primeiro contato, follow-up, confirmação. Variáveis {{nome}} {{empresa}} preenchem sozinhas. Tom consistente do time."
          bullets={[
            "Versionados (gestor aprova mudanças)",
            "Métricas: quais templates convertem mais",
            "Lib de imagens/PDFs pra anexar rápido",
          ]}
          mockup={<MockupTemplatesWhatsapp />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 3 — GANHOS */}
      <ApresentacaoSection
        id="ganhos"
        eyebrow="GANHOS · COMISSÃO + HOLERITE"
        titulo="Comissão recorrente, pagamento automático"
      >
        <ApresentacaoFeature
          titulo="Comissões acumuladas, mês a mês"
          desc="Toda operação aprovada das suas contas vinculadas gera comissão automática. Gráfico mensal + breakdown por status."
          bullets={[
            "% configurável por nível (júnior, pleno, sênior)",
            "Comissão recorrente sobre todas as ops da imob",
            "Histórico desde o início + comparativo com meta",
          ]}
          mockup={<MockupComissoes />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Holerite mensal — PDF + PIX"
          desc="Fechamento automático no dia 1º. PDF assinado pra contabilidade. Pagamento via PIX em 5 dias úteis."
          bullets={[
            "Detalhamento: ops, bônus meta, descontos (IR, INSS)",
            "Histórico de holerites baixáveis a qualquer momento",
            "Configura conta PIX pra receber automaticamente",
          ]}
          mockup={<MockupHolerite />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 4 — PERFORMANCE */}
      <ApresentacaoSection
        id="performance"
        eyebrow="PERFORMANCE · RELATÓRIOS + RANKING"
        titulo="Você vê onde precisa apertar — antes do gestor cobrar"
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Relatórios completos do seu trabalho"
          desc="Ops fechadas, taxa de conversão, ranking interno do time. Comparativo com mês anterior, meta e top performers."
          bullets={[
            "Funnel: leads → contato → visita → fechado",
            "Tempo médio de cada etapa (gargalos)",
            "Filtros: período, origem, região, vertical",
          ]}
          mockup={<MockupRelatorioCorretor />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 5 — SUPORTE */}
      <ApresentacaoSection
        id="suporte"
        eyebrow="SUPORTE · CHAT + NOTIFICAÇÕES"
        titulo="Acompanhamento em tempo real"
      >
        <ApresentacaoFeature
          titulo="Chat — direto com cliente + AQ"
          desc="Suporte AQ, conversa com sua imob vinculada, dúvidas administrativas. Sem ticket que dorme, sem email perdido."
          mockup={<MockupChatSuporte />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Notificações — não perde lead"
          desc="Lead respondeu, op aprovada, parcela paga, comissão fechada. Push real no celular + email + in-app."
          mockup={<MockupNotificacoes />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 6 — KIT DE APRESENTAÇÃO */}
      <section
        id="kit"
        className="bg-[#0a0e1a] text-white py-16 md:py-24 scroll-mt-20"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-300 mb-3 font-bold">
            Kit de venda · o que você manda
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl">
            Vai apresentar pra quem?
          </h2>
          <p className="mt-5 text-blue-100/80 max-w-2xl leading-relaxed">
            Você não precisa decorar taxa, esteira nem jurídico. Cada público
            tem a própria apresentação pronta, na linguagem dele. Abre no
            celular na frente do cliente — ou manda o link depois da reunião.
          </p>

          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {KIT.map((k) => {
              const inner = (
                <>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1c6dd0] to-[#0d4e9e] flex items-center justify-center font-mono text-xs font-bold mb-4">
                    {k.num}
                  </div>
                  <h3 className="font-bold text-lg leading-snug mb-2">
                    {k.titulo}
                  </h3>
                  <p className="text-sm text-blue-100/70 leading-relaxed flex-1">
                    {k.desc}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 self-start rounded-full border border-blue-400/50 px-3 py-1.5 font-mono text-[11px] text-blue-200 max-w-full">
                    <span className="truncate">{k.label}</span> ↗
                  </span>
                </>
              );
              const cls =
                "flex flex-col rounded-2xl border border-white/15 bg-white/[0.04] p-6 transition hover:border-blue-400/70 hover:bg-white/[0.07]";
              return k.externo ? (
                <a
                  key={k.num}
                  href={k.href}
                  target="_blank"
                  rel="noopener"
                  className={cls}
                >
                  {inner}
                </a>
              ) : (
                <Link key={k.num} href={k.href} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-white/15 bg-white/[0.04] p-6 md:p-7 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h3 className="font-bold text-lg">
                Novo no time? Comece pelo Manual do Comercial
              </h3>
              <p className="text-sm text-blue-100/70 mt-1.5 max-w-xl leading-relaxed">
                Deck de treinamento: o problema, o fluxo do dinheiro, a
                matemática de uma operação real, as objeções que você vai ouvir
                e o método de campo semana a semana.
              </p>
            </div>
            <a
              href={MANUAL_COMERCIAL_URL}
              target="_blank"
              rel="noopener"
              className="h-12 px-6 rounded-xl bg-white text-[#0a0e1a] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition whitespace-nowrap"
            >
              Abrir o manual ↗
            </a>
          </div>

          <p className="mt-6 font-mono text-[11px] text-blue-200/60">
            dica de campo: mande um link só, o do público certo. enviar tudo de
            uma vez confunde e derruba a resposta.
          </p>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <ApresentacaoBeneficios
        titulo="Por que captadores escolhem"
        items={[
          {
            emoji: "🚀",
            titulo: "Captação na rua",
            desc: "PWA + GPS + QR code + push real. Funciona offline.",
          },
          {
            emoji: "💸",
            titulo: "Comissão recorrente",
            desc: "Ganha em toda op aprovada das suas contas vinculadas.",
          },
          {
            emoji: "🎓",
            titulo: "Programa Acelera",
            desc: "Mentor 1:1 + leads pré-aquecidos nos primeiros 30 dias.",
          },
          {
            emoji: "📈",
            titulo: "Holerite automático",
            desc: "PDF assinado + PIX no dia 5 útil de cada mês.",
          },
        ]}
      />

      {/* CTA FINAL */}
      <section id="cta" className="bg-white py-16 md:py-24 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Quer fazer parte do time?
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg leading-relaxed">
            Comissão atrativa + ferramentas que economizam horas todo dia + base
            de contatos pré-qualificada. Vagas abertas pra capital e interior.
            Você preenche a ficha, a Antecipaqui aprova e o seu acesso já abre o
            painel do comercial.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/quero-ser-comercial"
              className="h-12 px-6 rounded-xl bg-accent text-white font-bold text-sm inline-flex items-center hover:bg-accent-dark transition"
            >
              Quero ser comercial →
            </Link>
            <Link
              href="/"
              className="h-12 px-6 rounded-xl border border-border text-fg font-bold text-sm inline-flex items-center hover:border-accent transition"
            >
              Voltar
            </Link>
            <ApresentacaoVideoButton
              src="/apresentacao/apresentacao-comercial.mp4"
              className="border-border text-fg hover:bg-slate-100"
              label="▶ Ver em 60s"
            />
          </div>
        </div>
      </section>
    </>
  );
}
