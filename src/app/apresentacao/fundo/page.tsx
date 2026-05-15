import Link from "next/link";
import { Calculadora } from "@/components/calculadora";
import { getTaxaMensal } from "@/lib/actions/settings";
import { DesktopFrame } from "@/components/apresentacao/mockup-frame";
import {
  DesktopMesaFundo,
  DesktopFundoDashboard,
  DesktopFundoApi,
} from "@/components/apresentacao/mockups-content";
import { PrintButton } from "@/components/apresentacao/print-button";

export const metadata = {
  title: "Antecipaqui · Pra fundos investidores",
  description:
    "Originação pronta, decisão guiada e cobrança automatizada. Antecipação de comissões imobiliárias com pipeline pré-filtrado, score por construtora e API completa pra plugar no seu sistema.",
};

export const dynamic = "force-dynamic";

export default async function ApresentacaoFundoPage() {
  const taxaMensal = await getTaxaMensal();

  return (
    <>
      <style>{`
        @media print {
          header, footer { display: none !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-5">
            Antecipaqui · pra fundos investidores
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Originação pronta.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Yield consistente.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-blue-50 max-w-2xl leading-relaxed">
            Coloque seu capital pra trabalhar em comissões imobiliárias
            antecipadas. Pipeline pré-filtrado de corretores e construtoras,
            mesa de decisão com score automático,{" "}
            <strong className="font-bold">
              cobrança e repasse no piloto automático
            </strong>
            .
          </p>
          <div className="mt-10 flex flex-wrap gap-3 no-print">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-white text-[#1c6dd0] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Quero ser fundo parceiro →
            </Link>
            <PrintButton />
          </div>

          {/* Mini-stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-3xl">
            {[
              {
                v: `${(taxaMensal * 100).toFixed(2).replace(".", ",")}%`,
                l: "taxa média mensal",
              },
              { v: "1,2%", l: "inadimplência média" },
              { v: "24h", l: "ciclo de decisão" },
              { v: "100%", l: "auditado, sem papel" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-3xl md:text-4xl font-bold tracking-tight">
                  {s.v}
                </div>
                <div className="text-xs md:text-sm text-blue-100 mt-1">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROBLEMA ============ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-3">
              o problema do fundo médio
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Capital sobra. O que falta é{" "}
              <span className="text-rose-500">originar bem</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Você tem capital. Quer rentabilizar com segurança. Mas montar uma
              esteira própria de originação, análise e cobrança custa caro,
              demanda equipe e leva anos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-12">
            {[
              {
                icon: "🎯",
                title: "Originação cara",
                body: "Investir em equipe comercial pra prospectar corretor e construtora é caro e lento. Pipeline pequeno = capital parado.",
              },
              {
                icon: "📋",
                title: "Análise pesada",
                body: "Pra cada operação: KYC, due diligence, score, comprovações. Sua equipe gasta 80% do tempo nisso.",
              },
              {
                icon: "⚠️",
                title: "Risco mal medido",
                body: "Sem histórico estruturado de construtoras, decisões viram aposta. Inadimplência detona o yield.",
              },
              {
                icon: "💸",
                title: "Cobrança burocrática",
                body: "Gerar boletos, conciliar pagamentos, cobrar atraso. Custo operacional come a margem.",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-slate-200 p-6 bg-slate-50"
              >
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="font-bold text-slate-900 mb-1 text-lg">
                  {p.title}
                </div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  {p.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SOLUÇÃO ============ */}
      <section className="bg-slate-50 py-16 md:py-24 print-break">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              a solução
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              A esteira pronta.{" "}
              <span className="text-[#1c6dd0]">Você só decide e investe.</span>
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              A Antecipaqui já faz a parte chata: traz corretores e
              construtoras pré-cadastrados, analisa documentos com IA, calcula
              score, e te entrega operações filtradas. Você aprova e o sistema
              cuida do resto.
            </p>
          </div>

          {/* 4 pilares */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                num: "01",
                title: "Pipeline contínuo",
                body: "Corretores cadastrados trazem ops todos os dias. Sem custo de aquisição.",
              },
              {
                num: "02",
                title: "Análise automática",
                body: "KYC, OCR de contrato, score por construtora. Você vê só ops triadas.",
              },
              {
                num: "03",
                title: "Decisão guiada",
                body: "Mesa unificada com score, taxa, risco. Aprovação manual ou regra automática.",
              },
              {
                num: "04",
                title: "Cobrança automática",
                body: "Boleto CNAB ou API do banco. Conciliação automática. Repasse mensal.",
              },
            ].map((p) => (
              <div
                key={p.num}
                className="rounded-3xl bg-white border border-slate-200 p-6 relative overflow-hidden"
              >
                <div className="absolute -top-3 -right-3 text-[100px] font-bold text-[#1c6dd0]/5 leading-none select-none">
                  {p.num}
                </div>
                <div className="relative">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#1c6dd0] font-bold mb-3">
                    pilar {p.num}
                  </div>
                  <div className="font-bold text-xl text-slate-900 mb-2 tracking-tight">
                    {p.title}
                  </div>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    {p.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NOVAS OPERAÇÕES — MESA DE DECISÃO ============ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              novas operações
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Mesa de decisão{" "}
              <span className="text-[#1c6dd0]">com score embutido</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Cada operação chega já com score da construtora (0–100), análise
              documental, taxa proposta e histórico. Você aprova com um
              clique. Ou define regras que aprovam sozinhas.
            </p>
          </div>

          <DesktopFrame
            url="antecipaqui.digital/painel/aprovar"
            label="Inbox de decisão — operações ordenadas por urgência, score visível, dois cliques pra decidir. Regras de auto-aprovação rodam em paralelo."
          >
            <DesktopMesaFundo />
          </DesktopFrame>

          {/* Sublist de regras */}
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              {
                icon: "🎯",
                t: "Score automático",
                d: "Calculado a partir do histórico de cada construtora: parcelas pagas, atrasos, recusas, retornos.",
              },
              {
                icon: "⚙️",
                t: "Regras de auto-aprovação",
                d: "Defina: 'score ≥ 85 + taxa ≥ 6% + construtora X aprovada'. Sistema decide sozinho.",
              },
              {
                icon: "👥",
                t: "Pareceres em equipe",
                d: "Vários membros do fundo podem analisar a mesma op antes de aprovar. Auditável.",
              },
            ].map((r) => (
              <div
                key={r.t}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="text-2xl mb-2">{r.icon}</div>
                <div className="font-bold text-slate-900 mb-1">{r.t}</div>
                <div className="text-sm text-slate-600">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ NOVOS CLIENTES — ORIGINAÇÃO ============ */}
      <section className="bg-slate-50 py-16 md:py-24 print-break">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              novos clientes
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Originação que{" "}
              <span className="text-[#1c6dd0]">cresce sozinha</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Cada corretor e construtora cadastrado na plataforma é potencial
              fluxo pro seu fundo — sem você pagar comissão de captação. Você
              vê a carteira crescer em tempo real.
            </p>
          </div>

          <DesktopFrame
            url="antecipaqui.digital/painel"
            label="Painel do fundo — capital exposto, rentabilidade, inadimplência, distribuição da carteira, projeção 30 dias. Tudo em tempo real."
          >
            <DesktopFundoDashboard />
          </DesktopFrame>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { v: "Imobiliárias", l: "cadastradas e pré-aprovadas" },
              { v: "Construtoras", l: "com score público e histórico" },
              { v: "Corretores", l: "todos com KYC validado" },
              { v: "Ranking", l: "veja quem performa melhor" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-white border border-slate-200 p-5 text-center"
              >
                <div className="text-xl font-bold text-[#1c6dd0] mb-1">
                  {s.v}
                </div>
                <div className="text-xs text-slate-600 leading-snug">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ OPERAÇÃO SEGURA ============ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-600 mb-3">
              operação segura
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Auditável,{" "}
              <span className="text-emerald-600">rastreável, em conformidade</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Plataforma desenhada pra trabalhar com fundo de verdade. Tudo
              fica registrado, assinado, com histórico pra qualquer auditoria.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "🪪",
                title: "KYC validado",
                body: "Cada corretor, imobiliária e construtora passa por verificação documental antes de operar. CPF/CNPJ, comprovante, contrato social.",
              },
              {
                icon: "🤖",
                title: "OCR + IA Claude",
                body: "Documentos analisados automaticamente. RG, comprovante, contrato. Sistema flagueia inconsistências antes da decisão.",
              },
              {
                icon: "📊",
                title: "Score evolutivo",
                body: "Toda construtora tem score histórico. Você vê se está melhorando ou piorando ao longo do tempo. Snapshot a cada evento.",
              },
              {
                icon: "✍️",
                title: "Assinatura digital",
                body: "Contratos assinados via ZapSign com validade jurídica. Hash do documento gravado, link público pra auditoria.",
              },
              {
                icon: "🔒",
                title: "Webhooks com HMAC",
                body: "Eventos da plataforma chegam no seu sistema com assinatura HMAC-SHA256. Retry exponencial. Audit log completo.",
              },
              {
                icon: "💾",
                title: "Backup diário",
                body: "Dump SQL automático todo dia 03h. Histórico completo de auditoria preservado. Recovery em minutos.",
              },
              {
                icon: "📜",
                title: "Audit log irretroativo",
                body: "Toda ação fica registrada com user, IP, timestamp. Decisão, alteração, login. Pronto pra auditoria interna ou externa.",
              },
              {
                icon: "🏦",
                title: "Cobrança CNAB padrão",
                body: "Geração de remessa FEBRABAN, importação de retorno automatizada. Compatível com qualquer banco.",
              },
              {
                icon: "🇧🇷",
                title: "Conformidade LGPD",
                body: "Dados pessoais segregados, criptografados em trânsito. Direito a esquecimento implementado. Logs anonimizáveis.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 p-5 hover:border-emerald-500 hover:shadow-lg transition bg-white"
              >
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="font-bold text-slate-900 mb-1.5">
                  {f.title}
                </div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  {f.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ INTEGRAÇÃO API ============ */}
      <section className="bg-slate-900 text-white py-16 md:py-24 print-break">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-300 mb-3">
              plugue no seu sistema
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              API REST + Webhooks{" "}
              <span className="text-blue-300">documentados</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              Já tem seu próprio sistema de gestão? Plugue direto. Operações,
              parcelas, decisões — tudo via REST. Webhooks assinados pra cada
              evento.
            </p>
          </div>

          <DesktopFrame
            url="antecipaqui.digital/docs/api"
            label="API REST documentada em OpenAPI 3.1. Bearer token por fundo, escopo configurável. Webhooks com HMAC-SHA256 e retry exponencial."
          >
            <DesktopFundoApi />
          </DesktopFrame>

          <div className="mt-10 text-center">
            <Link
              href="/docs/api"
              target="_blank"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-blue-50 transition"
            >
              Abrir documentação completa →
            </Link>
          </div>
        </div>
      </section>

      {/* ============ COMO FUNCIONA O MODELO FINANCEIRO ============ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              modelo transparente
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Spread + custos.{" "}
              <span className="text-[#1c6dd0]">Sem letra miúda.</span>
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Você define sua taxa-base. Antecipaqui cobra spread acima dela.
              Simule abaixo com a taxa atual da plataforma:
            </p>
          </div>
          <Calculadora taxaMensalSugerida={taxaMensal} />

          <div className="mt-8 grid md:grid-cols-3 gap-4 text-center">
            {[
              { l: "Taxa base do fundo", v: "definida por você" },
              {
                l: "Taxa atual plataforma",
                v: `${(taxaMensal * 100).toFixed(2).replace(".", ",")}%`,
              },
              { l: "Spread mínimo", v: "configurável no admin" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-slate-50 border border-slate-200 p-5"
              >
                <div className="text-[11px] uppercase tracking-wider font-mono text-slate-500 mb-1">
                  {s.l}
                </div>
                <div className="text-lg font-bold text-slate-900">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-slate-50 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-3">
              dúvidas frequentes · fundo
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Perguntas de fundo médio.
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Qual o tamanho mínimo de carteira pra começar?",
                a: "Não há mínimo formal. Fundos a partir de R$ 500k já operam bem na plataforma. Quanto maior o capital, maior o pipeline disponível.",
              },
              {
                q: "A Antecipaqui é cedente ou intermediária?",
                a: "Intermediária. As operações são cedidas diretamente do corretor pro fundo investidor. A Antecipaqui faz a esteira tecnológica (cadastro, análise, decisão, cobrança) e recebe pelo serviço.",
              },
              {
                q: "Como funciona o repasse mensal pra Antecipaqui?",
                a: "Fatura mensal automatizada por fundo. Você vê o detalhamento (operações × custo da plataforma) antes de pagar. Pagamento via PIX, boleto ou TED.",
              },
              {
                q: "Posso integrar com meu CRM/ERP?",
                a: "Sim. API REST documentada em OpenAPI 3.1 + webhooks assinados HMAC-SHA256. Eventos: operação cadastrada, aprovada, recusada, parcela paga, antecipação solicitada, etc.",
              },
              {
                q: "E se o corretor não pagar a operação?",
                a: "O risco fica com o fundo (você é o cessionário). Pra mitigar: score automático por construtora, regras de auto-aprovação por critério, blacklist por construtora, painel de inadimplência em tempo real.",
              },
              {
                q: "Quanto tempo leva pra começar a operar?",
                a: "Após cadastro do fundo (CNPJ, conta bancária, configuração de cobrança e contrato), você já pode receber operações em ~48h. Onboarding guiado disponível.",
              },
            ].map((f, i) => (
              <details
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4 group open:bg-slate-50 open:border-[#1c6dd0]/30"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-bold text-slate-900">{f.q}</span>
                  <span className="text-[#1c6dd0] font-bold text-xl group-open:rotate-45 transition">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="bg-gradient-to-br from-[#0a0e1a] to-[#0d4e9e] text-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Capital que{" "}
            <span className="text-emerald-300">trabalha sozinho</span>.
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed">
            Pipeline, decisão, cobrança e auditoria — tudo automatizado.
            Você foca em alocar capital e acompanhar a rentabilidade.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 no-print">
            <Link
              href="/cadastre-se"
              className="h-14 px-8 rounded-xl bg-emerald-400 text-slate-900 font-bold text-base inline-flex items-center hover:bg-emerald-300 transition"
            >
              Conhecer a plataforma →
            </Link>
            <a
              href="mailto:contato@antecipaqui.digital?subject=Quero%20ser%20fundo%20parceiro"
              className="h-14 px-8 rounded-xl bg-transparent border border-white/30 text-white font-semibold text-base inline-flex items-center hover:bg-white/10 transition"
            >
              Falar com a equipe
            </a>
          </div>
          <div className="mt-12 text-sm text-slate-400">
            Atendimento dedicado pra fundos:{" "}
            <a
              href="mailto:fundos@antecipaqui.digital"
              className="text-emerald-300 hover:underline"
            >
              fundos@antecipaqui.digital
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
