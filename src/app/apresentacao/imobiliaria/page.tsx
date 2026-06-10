import Link from "next/link";
import { ApresentacaoNav } from "@/components/apresentacao/apresentacao-nav";
import { ApresentacaoVideoButton } from "@/components/apresentacao/apresentacao-video-button";
import {
  ApresentacaoSection,
  ApresentacaoFeature,
  ApresentacaoBeneficios,
} from "@/components/apresentacao/apresentacao-section";
import {
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
    "Receba comissão à vista no dia que fechar a venda. CRM, simulador, antecipação em 1 clique, projeção pessoal, equipe e suporte. Tour completo.",
};

const NAV_ITEMS = [
  { href: "#crm", label: "CRM" },
  { href: "#operacao", label: "Operação" },
  { href: "#dinheiro", label: "Dinheiro" },
  { href: "#equipe", label: "Equipe" },
  { href: "#suporte", label: "Suporte" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#cta", label: "Começar" },
];

export default function ApresentacaoImobiliariaPage() {
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

      <ApresentacaoNav brand="ANTECIPAQUI · CORRETOR" items={NAV_ITEMS} />

      {/* HERO */}
      <section
        id="topo"
        className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white"
      >
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-3 font-bold">
            Antecipaqui · pra corretor e imobiliária
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Sua comissão.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Hoje. Não em 30 dias.
            </span>
          </h1>
          <p className="mt-6 text-base md:text-xl text-blue-50 max-w-2xl leading-relaxed">
            CRM completo + antecipação em 1 clique. Veja por que mais de mil
            corretores trocaram a planilha pelo Antecipaqui.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-white text-[#0a0e1a] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Cadastrar agora →
            </Link>
            <ApresentacaoVideoButton src="/apresentacao/apresentacao-imobiliaria.mp4" />
          </div>
        </div>
      </section>

      {/* SEÇÃO 1 — CRM */}
      <ApresentacaoSection
        id="crm"
        eyebrow="CRM · GESTÃO DE CLIENTES"
        titulo="Tudo que você precisa pra fechar — num lugar só"
        intro="Capture clientes, mova pelo funil, e quando fechar, manda direto pra antecipação. Sem planilha, sem WhatsApp perdido."
      >
        <ApresentacaoFeature
          titulo="Kanban de atendimentos"
          desc="Cada cliente vira card. Move pelo funil (contato → visita → proposta → fechado). Timeline registra cada interação."
          bullets={[
            "5 colunas configuráveis por etapa",
            "Filtros por origem, valor, prazo, corretor",
            "Comentários internos visíveis só pra equipe",
          ]}
          mockup={<MockupAtendimentosCRM />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Link de dados — chega de foto no WhatsApp"
          desc="Gera URL única, manda pro cliente. Ele preenche CPF/RG/telefone no celular. Dados caem direto na operação validados."
          bullets={[
            "Mobile-first, otimizado pro celular do cliente",
            "Progress bar mostra o que falta preencher",
            "Você recebe notificação quando completa",
          ]}
          mockup={<MockupLinkDados />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 2 — OPERAÇÃO */}
      <ApresentacaoSection
        id="operacao"
        eyebrow="OPERAÇÃO · DO RASCUNHO AO DINHEIRO"
        titulo="Da venda fechada até o PIX, em horas"
        intro="Solta o contrato, IA preenche o cadastro, mesa AQ analisa, fundo aprova, ZapSign assina, dinheiro cai. Tudo rastreável."
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Nova operação — IA preenche pra você"
          desc="Solta o PDF do contrato. Claude Haiku lê e preenche comprador, unidade, valor, parcelas, datas. Você só revisa e envia."
          bullets={[
            "OCR funciona com escaneamentos de qualidade baixa",
            "Campos validados automaticamente (CPF, datas, valores)",
            "Você sempre confere antes — IA não envia sozinha",
          ]}
          hint="modelo: claude-haiku-4-5 · fail-open se key indisponível"
          mockup={<MockupNovaOperacao />}
        />
        <ApresentacaoFeature
          onDark
          reverse
          titulo="Análise → fundo → ZapSign → dinheiro"
          desc="Mesa AQ analisa em até 24h. Fundo aprova. Você assina via ZapSign. Em 4h o valor cai na sua conta com TED ou PIX."
          bullets={[
            "Status atualizado em tempo real (push + email)",
            "Notificação quando precisa de doc extra",
            "Histórico completo de cada etapa pra auditoria",
          ]}
          mockup={<MockupOperacaoFlow />}
        />
        <ApresentacaoFeature
          onDark
          titulo="Volume? Cadastre em lote ou importe"
          desc="Imobiliária com muitas vendas não cadastra uma a uma. Suba várias operações de uma vez ou importe de planilha — a IA preenche o que faltar."
          bullets={[
            "Cadastro em lote de várias operações na mesma tela",
            "Importação a partir de planilha (CSV/Excel)",
            "Cada operação segue o mesmo fluxo de análise e assinatura",
          ]}
          mockup={
            <MockupGenericoSlide
              emoji="📦"
              title="Operações em lote"
              subtitle="cadastre várias de uma vez ou importe de planilha"
            />
          }
        />
      </ApresentacaoSection>

      {/* SEÇÃO 3 — DINHEIRO */}
      <ApresentacaoSection
        id="dinheiro"
        eyebrow="$ · PREVISIBILIDADE FINANCEIRA"
        titulo="Veja exatamente quanto vai cair, e quando"
      >
        <ApresentacaoFeature
          titulo="Simulador — antes mesmo de cadastrar"
          desc="Coloca valor da comissão + parcelas. Mostra valor presente, deságio total, % líquido. Sem cadastrar nada, sem compromisso."
          bullets={[
            "Taxas e prazos atualizados do mercado",
            "Compare cenários (à vista vs parcelado)",
            "Salve simulações pra mostrar pro cliente",
          ]}
          mockup={<MockupSimulador />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Projeção pessoal — 6 meses à frente"
          desc="Quanto vai cair na sua conta nos próximos meses. Planeja viagem, investimento, parcela do carro. Atualiza em tempo real."
          bullets={[
            "Calendário visual com valores por mês",
            "Distingue entradas confirmadas vs previstas",
            "Exportação pra Excel ou Google Sheets",
          ]}
          mockup={<MockupProjecaoCorretor />}
        />
        <ApresentacaoFeature
          titulo="Relatório + ranking interno"
          desc="KPIs do mês (ops, volume, comissão), ranking da imobiliária, comparativo com mês anterior. Tudo exportável."
          bullets={[
            "Performance individual + da imobiliária inteira",
            "Filtros por período, construtora, status",
            "Compartilhamento por link com permissão limitada",
          ]}
          mockup={<MockupRelatorioCorretor />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 4 — EQUIPE */}
      <ApresentacaoSection
        id="equipe"
        eyebrow="TIME · MULTI-CORRETOR"
        titulo="Pra imobiliária ou corretor solo — funciona igual bem"
        intro="Cada corretor tem login. Owner vê tudo, gerente vê relatórios, corretor só suas ops. Auditoria por usuário sempre."
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Equipe com permissões certas"
          desc="Define quem vê o quê. Owner gerencia time + finanças. Gerente vê relatórios consolidados. Corretor só suas próprias ops."
          bullets={[
            "3 níveis de permissão pré-configurados",
            "Convide por email — vínculo automático",
            "Auditoria mostra quem fez cada ação",
          ]}
          mockup={<MockupEquipeCorretor />}
        />
        <ApresentacaoFeature
          onDark
          reverse
          titulo="Convites — imobiliárias podem te chamar"
          desc="Solo? Imobiliárias podem te convidar pro time delas. Aceita ou recusa — você decide com quem trabalha."
          bullets={[
            "Convites têm validade (não ficam abertos pra sempre)",
            "Histórico de convites recebidos/enviados",
            "Sair de uma imob com 1 clique (suas ops ficam)",
          ]}
          mockup={<MockupConvitesCorretor />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 5 — SUPORTE */}
      <ApresentacaoSection
        id="suporte"
        eyebrow="ATENDIMENTO · CHAT EM TEMPO REAL"
        titulo="Suporte humano sem ticket que dorme"
      >
        <ApresentacaoFeature
          titulo="Chat direto — categorias certas, pessoas certas"
          desc="Suporte AQ, negociações com construtora, dúvidas de docs. Cada categoria vai pro time certo. Resposta em minutos."
          bullets={[
            "Histórico fica anexo à operação correspondente",
            "Pode anexar arquivos (PDF, foto, áudio)",
            "Notificação push quando responder",
          ]}
          mockup={<MockupChatSuporte />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Notificações em tempo real"
          desc="Op aprovada, parcela paga, doc pendente, score mudou — tudo cai no seu celular na hora. Push + email + in-app."
          bullets={[
            "Configurável: silencia o que não interessa",
            "Push real (não é só ícone, vibra mesmo)",
            "Resumo diário por email pra quem prefere",
          ]}
          mockup={<MockupNotificacoes />}
        />
      </ApresentacaoSection>

      {/* BENEFÍCIOS */}
      <ApresentacaoBeneficios
        titulo="Por que mil corretores escolheram"
        items={[
          {
            emoji: "💰",
            titulo: "Comissão em 4h",
            desc: "Não em 30, 60 ou 90 dias. PIX ou TED na sua conta.",
          },
          {
            emoji: "🚫",
            titulo: "Zero mensalidade",
            desc: "Sem fidelidade. Paga deságio só quando usa.",
          },
          {
            emoji: "📈",
            titulo: "Ranking + projeção",
            desc: "Performance clara, ganho previsível, decisão fácil.",
          },
          {
            emoji: "🔒",
            titulo: "ZapSign integrado",
            desc: "Contrato assinado em 1 clique, sem cartório.",
          },
        ]}
      />

      {/* CTA FINAL */}
      <section
        id="cta"
        className="bg-white py-16 md:py-24 scroll-mt-20"
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Cadastro rápido. Primeira operação na primeira semana.
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg leading-relaxed">
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
            <ApresentacaoVideoButton
              src="/apresentacao/apresentacao-imobiliaria.mp4"
              className="border-border text-fg hover:bg-slate-100"
              label="▶ Ver em 60s"
            />
          </div>
        </div>
      </section>
    </>
  );
}
