import Link from "next/link";
import { Calculadora } from "@/components/calculadora";
import { getTaxaMensal } from "@/lib/actions/settings";
import {
  MobileFrame,
  DesktopFrame,
} from "@/components/apresentacao/mockup-frame";
import {
  MobileNovaOp,
  MobileMinhasOps,
  MobileOcrContrato,
  MobileDaily,
  DesktopPainel,
  DesktopRelatorio,
} from "@/components/apresentacao/mockups-content";
import { PrintButton } from "@/components/apresentacao/print-button";

export const metadata = {
  title: "Antecipaqui · Pra imobiliárias e corretores",
  description:
    "Dinheiro na mão hoje, sem demora no seu recebível parcelado. Antecipe a comissão da venda em até 1 dia útil, com cadastro 100% online.",
};

export const dynamic = "force-dynamic";

export default async function ApresentacaoImobiliariaPage() {
  const taxaMensal = await getTaxaMensal();

  return (
    <>
      {/* CSS print: esconde chrome, força quebra de página, simplifica cores */}
      <style>{`
        @media print {
          header, footer { display: none !important; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1c6dd0] via-[#1452a8] to-[#0d4e9e] text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-100 mb-5">
            Antecipaqui · pra imobiliárias e corretores
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Dinheiro na mão{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-yellow-200 bg-clip-text text-transparent">
              hoje
            </span>
            ,<br />
            sem demora no seu{" "}
            <span className="underline decoration-yellow-300/70 decoration-4 underline-offset-4">
              recebível parcelado
            </span>
            .
          </h1>
          <p className="mt-6 text-lg md:text-xl text-blue-50 max-w-2xl leading-relaxed">
            Vendeu? Recebeu uma comissão pra cair em 2, 3 ou 4 vezes? A gente
            paga{" "}
            <strong className="font-bold">o valor presente em 1 dia útil</strong>
            . Você decide quando precisa, sem fila de banco, sem garantia, sem
            avalista.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 no-print">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-white text-[#1c6dd0] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Quero antecipar minha comissão →
            </Link>
            <PrintButton />
          </div>

          {/* Mini-stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-3xl">
            {[
              { v: "1 dia", l: "pra cair na conta" },
              {
                v: `${(taxaMensal * 100).toFixed(2).replace(".", ",")}%`,
                l: "taxa média ao mês",
              },
              { v: "24h", l: "pra aprovação" },
              { v: "100%", l: "online, sem papel" },
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
              o problema
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Você vendeu. Mas o dinheiro{" "}
              <span className="text-rose-500">demora</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Vender um imóvel é trabalho duro. Atender, mostrar, negociar,
              fechar. Aí vem a comissão — e ela cai parcelada, em 60, 90, 120
              dias. Enquanto isso, suas contas chegam toda semana.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mt-12">
            {[
              {
                icon: "⏳",
                title: "Espera longa",
                body: "Comissão cai em até 4 vezes. Mais de 4 meses pra receber tudo. Caixa apertado.",
              },
              {
                icon: "🏦",
                title: "Banco recusa",
                body: "Comprovar comissão parcelada como renda é difícil. Empréstimo sai caro e burocrático.",
              },
              {
                icon: "📑",
                title: "Cartório, papel, garantia",
                body: "Adiantamento via banco pede avalista, garantia, taxa salgada. Quem tem tempo?",
              },
            ].map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-slate-200 p-5 bg-slate-50"
              >
                <div className="text-3xl mb-2">{p.icon}</div>
                <div className="font-bold text-slate-900 mb-1">{p.title}</div>
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
              Pega seu dinheiro <span className="text-[#1c6dd0]">agora</span>.
              <br />
              Construtora paga a gente depois.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              É simples: você cadastra a operação, manda os documentos pelo
              celular, e em 1 dia útil o valor presente da sua comissão cai na
              conta. A construtora paga a Antecipaqui nas datas combinadas — você
              já saiu do circuito.
            </p>
          </div>

          {/* 3 passos */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: "1",
                title: "Cadastra a venda",
                body: "Sobe o contrato pelo app. A gente lê e preenche sozinho. Em 5 minutos você termina.",
              },
              {
                num: "2",
                title: "Análise rápida",
                body: "Em até 24h a operação é aprovada. Sem papelada física, sem indo no banco.",
              },
              {
                num: "3",
                title: "Cai na sua conta",
                body: "PIX em 1 dia útil. Você usa pro que quiser — pagar contas, investir, viver.",
              },
            ].map((p) => (
              <div
                key={p.num}
                className="rounded-3xl bg-white border border-slate-200 p-6 relative overflow-hidden"
              >
                <div className="absolute -top-2 -right-2 text-[120px] font-bold text-[#1c6dd0]/5 leading-none select-none">
                  {p.num}
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[#1c6dd0] text-white font-bold flex items-center justify-center mb-3">
                    {p.num}
                  </div>
                  <div className="font-bold text-xl text-slate-900 mb-2">
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

      {/* ============ MOCKUPS MOBILE ============ */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              do celular, no sofá
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Cadastra a operação{" "}
              <span className="text-[#1c6dd0]">enquanto toma café</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              O Antecipaqui é app instalável (PWA). Funciona offline, lê
              contratos por foto, e tem cálculo em tempo real. Veja o que dá pra
              fazer pelo celular:
            </p>
          </div>

          <div className="flex flex-wrap items-start justify-center gap-8 md:gap-10">
            <MobileFrame
              label="Cadastra a operação — preço em tempo real, ajusta parcelas e vê quanto sai"
              tilt={-3}
            >
              <MobileNovaOp />
            </MobileFrame>
            <MobileFrame
              label="OCR de contrato — fotografa o PDF, a IA preenche tudo. Você só confere."
              tilt={2}
            >
              <MobileOcrContrato />
            </MobileFrame>
            <MobileFrame
              label="Acompanha tudo — status de cada operação, em ordem"
              tilt={-2}
            >
              <MobileMinhasOps />
            </MobileFrame>
            <MobileFrame
              label="Agenda de recebimentos — quando cada centavo cai"
              tilt={3}
            >
              <MobileDaily />
            </MobileFrame>
          </div>
        </div>
      </section>

      {/* ============ CALCULADORA AO VIVO ============ */}
      <section className="bg-white py-16 md:py-24 print-break">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              calcula agora
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Quanto você{" "}
              <span className="text-[#1c6dd0]">recebe hoje</span> mexendo aqui:
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Sem cadastro. Sem login. Mexe nos números abaixo e o cálculo
              acontece em tempo real. Taxa atual:{" "}
              <strong>
                {(taxaMensal * 100).toFixed(2).replace(".", ",")}% a.m.
              </strong>
            </p>
          </div>
          <Calculadora taxaMensalSugerida={taxaMensal} />
        </div>
      </section>

      {/* ============ MOCKUPS DESKTOP ============ */}
      <section className="bg-slate-900 text-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-300 mb-3">
              do escritório também
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Painel completo no <span className="text-blue-300">desktop</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              Quem prefere mesa: o painel web tem tudo. Operações, agenda,
              relatórios, ranking de construtoras, calculadora de imposto.
            </p>
          </div>

          <div className="space-y-10">
            <DesktopFrame
              url="antecipaqui.digital/painel"
              label="Painel do corretor — KPIs do dia, fila de operações, gráfico de 90 dias"
            >
              <DesktopPainel />
            </DesktopFrame>
            <DesktopFrame
              url="antecipaqui.digital/painel/relatorio"
              label="Relatório — quanto você antecipou, economia em juros, seu score, ranking de construtoras"
            >
              <DesktopRelatorio />
            </DesktopFrame>
          </div>
        </div>
      </section>

      {/* ============ FACILIDADES ============ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              o que torna fácil
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Feito por quem entende{" "}
              <span className="text-[#1c6dd0]">o corretor de imóveis</span>.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "📷",
                title: "Leitura de contrato",
                body: "Fotografa o contrato. A IA lê comprador, CPF, valor, parcelas. Você só confere.",
              },
              {
                icon: "🔁",
                title: "Clone de operação",
                body: "Já fez uma op parecida? Clone em 1 toque. Só muda o que mudou.",
              },
              {
                icon: "🏢",
                title: "Busca de CNPJ",
                body: "Digita o CNPJ. Razão social, endereço, telefone, email — vem pronto da Receita.",
              },
              {
                icon: "📞",
                title: "WhatsApp do comprador",
                body: "Manda link de coleta pelo WhatsApp. O comprador preenche os dados dele direto.",
              },
              {
                icon: "🧮",
                title: "Calculadora de IR",
                body: "Vê quanto sobra líquido na sua mão depois do imposto. Sem surpresa no fim do mês.",
              },
              {
                icon: "🎯",
                title: "Score do corretor",
                body: "Sua reputação vira nota. Quanto melhor o histórico, melhor a taxa que você consegue.",
              },
              {
                icon: "📊",
                title: "Ranking de construtoras",
                body: "Veja com qual construtora você performa melhor. Foco onde dá dinheiro.",
              },
              {
                icon: "💬",
                title: "Chat com o time",
                body: "Dúvida em qualquer operação? Chat dedicado por op, sem perder o histórico.",
              },
              {
                icon: "📱",
                title: "App instalável",
                body: "Instala no celular como app de verdade. Notificação quando aprova, quando paga.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 p-5 hover:border-[#1c6dd0] hover:shadow-lg transition"
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

      {/* ============ POR QUE ANTECIPAQUI ============ */}
      <section className="bg-gradient-to-br from-[#1c6dd0] to-[#0d4e9e] text-white py-16 md:py-24 print-break">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-3">
              por que com a gente
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              A gente nasceu pra isso.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                title: "Especialista em comissão imobiliária",
                body: "Não somos banco genérico. Trabalhamos só com antecipação de comissão. Conhecemos cada construtora, cada operação.",
              },
              {
                title: "Sem garantia, sem avalista",
                body: "A garantia é a própria operação cedida. Você não compromete imóvel, carro, nada seu.",
              },
              {
                title: "Taxas competitivas",
                body: `Taxa base ${(taxaMensal * 100).toFixed(2).replace(".", ",")}% ao mês. Quanto mais você opera com a gente, melhor a tarifa pessoal.`,
              },
              {
                title: "Transparência total",
                body: "Mostramos tudo: valor bruto, deságio, custos, líquido. Sem letras pequenas. Você sabe quanto vai receber antes de fechar.",
              },
            ].map((b) => (
              <div
                key={b.title}
                className="rounded-2xl bg-white/10 border border-white/20 p-5 backdrop-blur"
              >
                <div className="font-bold text-lg mb-2">{b.title}</div>
                <div className="text-sm text-blue-50 leading-relaxed">
                  {b.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-3">
              dúvidas frequentes
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Perguntas que todo mundo faz.
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Preciso ter relação prévia com a Antecipaqui?",
                a: "Não. Você se cadastra agora, manda CNPJ/CRECI e contrato social. Validamos em até 24h e já libera operações.",
              },
              {
                q: "A construtora precisa saber?",
                a: "Sim. A operação é cedida a um fundo investidor parceiro nosso, então a construtora paga direto pra ele nas datas combinadas. Avisamos pra você.",
              },
              {
                q: "Quanto posso antecipar?",
                a: "Quanto a comissão valer, até 4 parcelas (120 dias). Não tem teto mínimo nem máximo de valor.",
              },
              {
                q: "Se a construtora atrasar, o problema fica comigo?",
                a: "Não. A partir do momento que cedeu a operação, o risco de cobrança fica com o fundo. Você já recebeu, encerra ali.",
              },
              {
                q: "Quanto custa pra eu manter conta na Antecipaqui?",
                a: "Zero. Você só paga o deságio (a diferença entre o valor da comissão e o que recebe hoje) quando antecipa. Sem mensalidade, sem taxa de abertura.",
              },
              {
                q: "Posso antecipar de qualquer construtora?",
                a: "Sim, desde que a operação seja válida e a construtora aceite ser informada. A gente faz uma análise rápida de risco antes de cada antecipação.",
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
      <section className="bg-slate-900 text-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Sua próxima venda{" "}
            <span className="text-emerald-300">vira dinheiro hoje</span>.
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed">
            Cadastro em 5 minutos. Aprovação em até 24h. PIX em 1 dia útil. Sem
            mensalidade, sem letra miúda.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 no-print">
            <Link
              href="/cadastre-se"
              className="h-14 px-8 rounded-xl bg-emerald-400 text-slate-900 font-bold text-base inline-flex items-center hover:bg-emerald-300 transition"
            >
              Quero me cadastrar agora →
            </Link>
            <Link
              href="/como-funciona"
              className="h-14 px-8 rounded-xl bg-transparent border border-white/30 text-white font-semibold text-base inline-flex items-center hover:bg-white/10 transition"
            >
              Como funciona em detalhe
            </Link>
          </div>
          <div className="mt-12 text-sm text-slate-400">
            Atendimento humano:{" "}
            <a
              href="https://wa.me/5547999999999"
              className="text-emerald-300 hover:underline"
            >
              WhatsApp da equipe
            </a>{" "}
            ·{" "}
            <a
              href="mailto:suporte@antecipaqui.digital"
              className="text-emerald-300 hover:underline"
            >
              suporte@antecipaqui.digital
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
