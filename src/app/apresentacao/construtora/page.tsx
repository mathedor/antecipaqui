import Link from "next/link";
import { ApresentacaoNav } from "@/components/apresentacao/apresentacao-nav";
import { ApresentacaoVideoButton } from "@/components/apresentacao/apresentacao-video-button";
import {
  ApresentacaoSection,
  ApresentacaoFeature,
  ApresentacaoBeneficios,
} from "@/components/apresentacao/apresentacao-section";
import {
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
} from "@/components/apresentacao/scene-mockups";

export const metadata = {
  title: "Antecipaqui · Pra construtoras",
  description:
    "Atraia corretores top sem desembolsar nada extra. Atendimento parceiro, duplicatas, cashback, score, extrato, empreendimentos e mais.",
};

const NAV_ITEMS = [
  { href: "#fluxo", label: "Como funciona" },
  { href: "#parceria", label: "Parceria" },
  { href: "#financeiro", label: "Financeiro" },
  { href: "#operacional", label: "Operacional" },
  { href: "#governanca", label: "Governança" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#cta", label: "Conversar" },
];

export default function ApresentacaoConstrutoraPage() {
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

      <ApresentacaoNav brand="ANTECIPAQUI · CONSTRUTORA" items={NAV_ITEMS} />

      {/* HERO */}
      <section
        id="topo"
        className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white"
      >
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-3 font-bold">
            Antecipaqui · pra construtoras
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Corretor recebe hoje.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Você paga no prazo combinado.
            </span>
          </h1>
          <p className="mt-6 text-base md:text-xl text-blue-50 max-w-2xl leading-relaxed">
            Mesmas parcelas que combinou. Outro destinatário. Sem custo direto.
            Cashback de presente. Atrai os melhores corretores da praça.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-white text-[#0a0e1a] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Falar com comercial →
            </Link>
            <ApresentacaoVideoButton src="/apresentacao/apresentacao-construtora.mp4" />
          </div>
        </div>
      </section>

      {/* SEÇÃO 1 — COMO FUNCIONA */}
      <ApresentacaoSection
        id="fluxo"
        eyebrow="COMO FUNCIONA"
        titulo="Mesmas datas. Outro destinatário."
        intro="Você não desembolsa nada a mais. O deságio é cobrado do corretor — ele topa porque receber hoje vale mais que receber em 90 dias."
      >
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: "1",
              t: "Corretor fecha venda",
              d: "Cliente assina contrato com sua construtora normalmente — nada muda na operação comercial.",
            },
            {
              n: "2",
              t: "Antecipaqui paga o corretor à vista",
              d: "Mesa AQ analisa, fundo aprova, em 4h cai PIX/TED na conta do corretor. Você só confirma a venda.",
            },
            {
              n: "3",
              t: "Você paga as parcelas pro fundo",
              d: "Mesmas datas, mesmos valores que combinou com o corretor. Só o destinatário muda. Caixa intacto.",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-bg p-6"
            >
              <div className="size-12 rounded-xl bg-accent text-white text-xl font-bold flex items-center justify-center mb-4">
                {s.n}
              </div>
              <h3 className="text-lg font-bold tracking-tight mb-2">{s.t}</h3>
              <p className="text-sm text-fg-muted leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </ApresentacaoSection>

      {/* SEÇÃO 2 — PARCERIA */}
      <ApresentacaoSection
        id="parceria"
        eyebrow="PARCERIA · DIFERENCIAL"
        titulo="Você opina ANTES da venda fechar"
        intro="Diferente de outras factorings: aqui você acompanha cada atendimento em tempo real e responde dúvidas críticas com flag (sim/não/condicional)."
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Atendimento parceiro — você dentro da conversa"
          desc="Corretor te convida pro atendimento. Cliente pediu 8% desconto? Você responde com flag. Nunca mais será pega de surpresa."
          bullets={[
            "Acompanha em tempo real (notificação push)",
            "3 flags pra responder rápido: sim, não, condicional",
            "Histórico fica anexo à venda pra futuras consultas",
          ]}
          mockup={<MockupAtendimentoParceiro />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 3 — FINANCEIRO */}
      <ApresentacaoSection
        id="financeiro"
        eyebrow="FINANCEIRO · TRANSPARÊNCIA"
        titulo="Cronograma transparente + cashback automático"
      >
        <ApresentacaoFeature
          titulo="Duplicatas — cronograma claro"
          desc="Mesmas datas e valores que tinha combinado com o corretor. Pagamento em lote, antecipação com desconto, tudo num lugar."
          bullets={[
            "Filtros por mês, status, empreendimento",
            "Exportação pronta pra contabilidade",
            "Pagamento em lote via PIX, TED ou boleto",
          ]}
          mockup={<MockupDuplicatas />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Extrato — cada centavo registrado"
          desc="Cashback ganho, parcelas pagas, estornos. Filtro por período, exportação contábil pronta."
          bullets={[
            "Conciliação fácil com seu ERP/banco",
            "Anexo de comprovantes em cada lançamento",
            "Reconciliação automática com pagamentos PIX",
          ]}
          mockup={<MockupExtratoConstrutora />}
        />
        <ApresentacaoFeature
          titulo="Cashback automático por pagar em dia"
          desc="Cada op aprovada gera % de cashback. Acumula no saldo, você saca quando quiser. Liquidez extra sem esforço."
          bullets={[
            "Taxa de cashback configurável por contrato",
            "Saque via PIX em até 1 dia útil",
            "Histórico completo de ganhos no extrato",
          ]}
          hint="condicionado a pagamento em dia das parcelas anteriores"
          mockup={<MockupCashbackGrowing />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Forecast — quanto vai desembolsar"
          desc="Projeção 6 meses de pagamentos. Identifica picos de fluxo de caixa, ajuda planejar tesouraria com antecedência."
          bullets={[
            "Gráfico mensal + tabela detalhada por op",
            "Cenários: pessimista, esperado, otimista",
            "Alertas automáticos quando concentração em algum mês passa do limite",
          ]}
          mockup={<MockupForecastPagamentos />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 4 — OPERACIONAL */}
      <ApresentacaoSection
        id="operacional"
        eyebrow="OPERACIONAL · CATÁLOGO + PENDÊNCIAS"
        titulo="Empreendimentos cadastrados, pendências sempre à vista"
        bg="dark"
      >
        <ApresentacaoFeature
          onDark
          titulo="Empreendimentos — torres + unidades"
          desc="Cada prédio com suas unidades. Quando corretor cadastra venda, só seleciona — zero digitação manual, zero erro de typing."
          bullets={[
            "Importação em lote via CSV",
            "Atualização de status (disponível, vendida, reservada)",
            "Métricas: % vendido, vendas/mês, tempo médio de venda",
          ]}
          mockup={<MockupEmpreendimentos />}
        />
        <ApresentacaoFeature
          onDark
          reverse
          titulo="Pendências — nunca esquece nada"
          desc="Docs faltando, aprovações urgentes, tickets abertos. Tudo numa tela, urgentes em vermelho, agrupado por categoria."
          bullets={[
            "Atribuível a membros da equipe interna",
            "Notificação 24h antes do vencimento",
            "Snooze (lembrar depois) pra coisas não urgentes",
          ]}
          mockup={<MockupPendencias />}
        />
      </ApresentacaoSection>

      {/* SEÇÃO 5 — GOVERNANÇA */}
      <ApresentacaoSection
        id="governanca"
        eyebrow="GOVERNANÇA · TIME + COMUNICAÇÃO"
        titulo="Roles internas separadas, comunicação rastreável"
      >
        <ApresentacaoFeature
          titulo="Equipe com roles internas"
          desc="Financeiro vê duplicatas. Comercial vê ops. Jurídico vê docs. Owner vê tudo. Cada um no seu quadrado, auditoria por usuário."
          bullets={[
            "4 roles pré-configuradas (owner, financeiro, comercial, jurídico)",
            "Audit log completo: quem fez o quê e quando",
            "2FA opcional pra ações sensíveis (saque, alteração de conta)",
          ]}
          mockup={<MockupEquipeConstrutora />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Score transparente — você sabe como melhorar"
          desc="0 a 100, fórmula pública. Score alto = aprovações rápidas, ops maiores, taxas melhores. Atraso reduz, em dia aumenta."
          bullets={[
            "Histórico do score mês a mês",
            "Dicas específicas pra subir o seu",
            "Comparativo com outras construtoras da praça (anonimizado)",
          ]}
          hint="fórmula em /docs · public · sem mistérios"
          mockup={<MockupScoreBar />}
        />
        <ApresentacaoFeature
          titulo="Chat com fundo + corretor + AQ"
          desc="Negociação por categoria, todos os envolvidos no mesmo thread. Sem ticket que dorme, sem email perdido."
          bullets={[
            "Histórico fica anexo à operação correspondente",
            "Anexos de arquivo (PDF, foto, planilha)",
            "Notificação push quando responder",
          ]}
          mockup={<MockupChatSuporte />}
        />
        <ApresentacaoFeature
          reverse
          titulo="Notificações em tempo real"
          desc="Nova op pra confirmar, doc enviado, parcela vencendo, score mudou. Push + email + in-app."
          mockup={<MockupNotificacoes />}
        />
      </ApresentacaoSection>

      {/* BENEFÍCIOS */}
      <ApresentacaoBeneficios
        titulo="Por que construtoras escolhem"
        items={[
          {
            emoji: "💚",
            titulo: "Caixa intacto",
            desc: "Mesmas datas, mesmos valores. Só o destinatário muda.",
          },
          {
            emoji: "🎁",
            titulo: "Cashback automático",
            desc: "Liquidez extra grátis por pagar em dia. Saque PIX.",
          },
          {
            emoji: "🚀",
            titulo: "Atrai corretores top",
            desc: "Comissão à vista vs 90 dias. Diferencial enorme.",
          },
          {
            emoji: "🔍",
            titulo: "Auditoria + compliance",
            desc: "Roles internas + audit log. Pronto pra ISO/SOX.",
          },
        ]}
      />

      {/* CTA FINAL */}
      <section id="cta" className="bg-white py-16 md:py-24 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-tight">
            Quer atrair os melhores corretores?
          </h2>
          <p className="text-fg-muted mb-8 text-base md:text-lg leading-relaxed">
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
            <ApresentacaoVideoButton
              src="/apresentacao/apresentacao-construtora.mp4"
              className="border-border text-fg hover:bg-slate-100"
              label="▶ Ver em 60s"
            />
          </div>
        </div>
      </section>
    </>
  );
}
