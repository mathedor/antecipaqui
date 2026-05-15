import Link from "next/link";
import { getTaxaMensal } from "@/lib/actions/settings";
import { DesktopFrame } from "@/components/apresentacao/mockup-frame";
import {
  DesktopConstrutoraPainel,
  DesktopConstrutoraBI,
  DesktopConstrutoraCobranca,
} from "@/components/apresentacao/mockups-content";
import { PrintButton } from "@/components/apresentacao/print-button";

export const metadata = {
  title: "Antecipaqui · Pra construtoras",
  description:
    "Parcele a comissão. Mantenha seus corretores recebendo à vista. Cobrança unificada, fluxo de caixa previsível e BI completo dos seus empreendimentos.",
};

export const dynamic = "force-dynamic";

export default async function ApresentacaoConstrutoraPage() {
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

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white">
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 35%, white 1px, transparent 1px), radial-gradient(circle at 75% 65%, white 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-5">
            Antecipaqui · pra construtoras
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
            Parcela a comissão.
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              Corretor recebe hoje.
            </span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-blue-50 max-w-2xl leading-relaxed">
            Mantém o seu fluxo de caixa{" "}
            <strong className="font-bold">como você precisa</strong> — pagando
            em parcelas — sem perder corretor que prefere receber à vista.
            Antecipaqui resolve o resto: cobrança, conciliação e BI do seu
            comercial.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 no-print">
            <Link
              href="/cadastre-se"
              className="h-12 px-6 rounded-xl bg-white text-[#1c6dd0] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Quero conhecer →
            </Link>
            <PrintButton />
          </div>

          {/* Mini-stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 max-w-3xl">
            {[
              { v: "4x", l: "parcelas, prazo natural" },
              { v: "0%", l: "custo de cobrança" },
              { v: "1", l: "portal pra tudo" },
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

      {/* PROBLEMA */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-3">
              o impasse da construtora
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Você não pode pagar comissão à vista. Mas{" "}
              <span className="text-rose-500">o corretor quer</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Seu fluxo de caixa funciona com a venda parcelada. Pagar comissão
              à vista descasa tudo. Por outro lado, o corretor que recebe à
              vista trabalha mais motivado, fecha mais. E sua equipe interna
              gasta horas conciliando boleto, atraso, baixa manual.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-12">
            {[
              {
                icon: "💸",
                title: "Descasamento de caixa",
                body: "Pagar comissão à vista significa antecipar receita que ainda não entrou. Caixa fica negativo, banco cobra capital de giro caro.",
              },
              {
                icon: "🏃",
                title: "Corretor desmotivado",
                body: "Quem recebe a comissão parcelada em 4x não dedica o mesmo esforço da venda. Você perde velocidade no comercial.",
              },
              {
                icon: "📂",
                title: "Cobrança fragmentada",
                body: "Boleto por aqui, baixa manual ali, conciliação no Excel. Sua equipe financeira vira operadora de papel.",
              },
              {
                icon: "📊",
                title: "BI inexistente",
                body: "Quanto cada empreendimento performou? Qual corretor gira mais? Cadê o relatório consolidado? Quem sabe é o estagiário.",
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

      {/* SOLUÇÃO */}
      <section className="bg-slate-50 py-16 md:py-24 print-break">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              o melhor de dois mundos
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Você paga parcelado.{" "}
              <span className="text-[#1c6dd0]">Corretor recebe à vista.</span>
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              A Antecipaqui antecipa a comissão do corretor com{" "}
              <strong>capital de fundos investidores parceiros</strong>. Você
              segue pagando como sempre pagou — em parcelas, nas datas
              combinadas. Mas em vez de receber 100 boletos diferentes, recebe
              um portal unificado de cobrança.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                num: "01",
                title: "Fluxo intacto",
                body: "Você continua pagando comissão em parcelas. Sem alterar contrato, sem antecipar caixa, sem capital de giro.",
              },
              {
                num: "02",
                title: "Corretor motivado",
                body: "Quem fechou a venda recebe à vista, no mesmo dia. Engaja mais, fideliza, traz mais cliente.",
              },
              {
                num: "03",
                title: "Cobrança unificada",
                body: "1 portal, 1 conciliação, 1 ponto de contato. Boletos automáticos, baixa por API, multa/juros na régua.",
              },
              {
                num: "04",
                title: "BI dos empreendimentos",
                body: "Dashboards completos: vendas por empreendimento, ranking de corretores, velocidade, conversão. Saída CSV/PDF.",
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

      {/* PAINEL CONSTRUTORA */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              painel da construtora
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Tudo em um lugar.{" "}
              <span className="text-[#1c6dd0]">Em tempo real.</span>
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Saldo a pagar, cashback acumulado, vendas, próximos pagamentos.
              Visão financeira consolidada — pronta pra o diretor, pra o
              contador, pra o controller.
            </p>
          </div>

          <DesktopFrame
            url="antecipaqui.digital/painel"
            label="Painel da construtora — saldo a pagar, antecipações, cashback, vendas. Próximos 30 dias com semáforo de status."
          >
            <DesktopConstrutoraPainel />
          </DesktopFrame>
        </div>
      </section>

      {/* COBRANÇA UNIFICADA */}
      <section className="bg-slate-50 py-16 md:py-24 print-break">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1c6dd0] mb-3">
              assistência de cobrança
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Sua equipe financeira{" "}
              <span className="text-[#1c6dd0]">livra a pauta</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Boleto gerado automaticamente, baixa pelo CNAB de retorno ou via
              API do banco, multa e juros aplicados pela régua configurada. Sua
              equipe foca em decisão, não em planilha.
            </p>
          </div>

          <DesktopFrame
            url="antecipaqui.digital/painel/duplicatas"
            label="Central de cobrança — duplicatas a pagar com semáforo de vencimento, fundo cessionário, boleto pronto, baixa automática."
          >
            <DesktopConstrutoraCobranca />
          </DesktopFrame>

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {[
              {
                icon: "🤖",
                t: "Boletos automáticos",
                d: "Geração CNAB 240 FEBRABAN compatível com qualquer banco. Ou API direta com o banco do fundo.",
              },
              {
                icon: "🔁",
                t: "Baixa automática",
                d: "Retorno CNAB importado todo dia. Conciliação automática. Excel sem precisar abrir.",
              },
              {
                icon: "⚖️",
                t: "Régua de cobrança",
                d: "Notificação 5d antes, lembrete na data, cobrança escalada. Tudo via chat ou whatsapp do corretor.",
              },
            ].map((r) => (
              <div
                key={r.t}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="text-2xl mb-2">{r.icon}</div>
                <div className="font-bold text-slate-900 mb-1">{r.t}</div>
                <div className="text-sm text-slate-600">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* B.I. */}
      <section className="bg-slate-900 text-white py-16 md:py-24 print-break">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-300 mb-3">
              business intelligence
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              Saiba quem,{" "}
              <span className="text-blue-300">quanto e onde</span>.
            </h2>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed">
              Cada venda alimenta o dashboard. VGV por empreendimento,
              velocidade de venda, comissão total paga, ranking de corretores
              com score. O reporting pra diretoria, pronto.
            </p>
          </div>

          <DesktopFrame
            url="antecipaqui.digital/painel/empreendimentos"
            label="B.I. comercial — VGV consolidado, vendas por empreendimento, ranking de corretores com score, tempo médio de cadastro até venda."
          >
            <DesktopConstrutoraBI />
          </DesktopFrame>

          <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { v: "VGV consolidado", l: "por empreendimento" },
              { v: "Velocidade venda", l: "dias do cadastro até op" },
              { v: "Ranking corretor", l: "ops, valor, score" },
              { v: "Export CSV/PDF", l: "pra contabilidade e diretoria" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center backdrop-blur"
              >
                <div className="text-xl font-bold text-blue-300 mb-1">
                  {s.v}
                </div>
                <div className="text-xs text-blue-100/70 leading-snug">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESSO 100% DIGITAL */}
      <section className="bg-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald-600 mb-3">
              processo 100% digital
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Sem papel.{" "}
              <span className="text-emerald-600">Sem reunião. Sem incômodo.</span>
            </h2>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed">
              Você confirma a operação no celular. Acompanha pelo painel. Vê
              o relatório por email. Equipe interna não precisa abrir Excel.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: "📲",
                title: "Confirmação digital",
                body: "Toda operação cedida pra um fundo pede sua confirmação via app ou portal. 1 clique, com hash do contrato.",
              },
              {
                icon: "🆔",
                title: "KYC dos corretores",
                body: "Corretor que opera com você passa por validação documental. CPF, CRECI, contrato social — tudo no banco.",
              },
              {
                icon: "📨",
                title: "Recap diário",
                body: "Email automático às 7h: vendas do dia, comissão acumulada, pagamentos próximos, inadimplência.",
              },
              {
                icon: "💬",
                title: "Chat por operação",
                body: "Cada op tem chat dedicado. Dúvida do corretor, da Antecipaqui, do fundo — tudo no mesmo lugar.",
              },
              {
                icon: "✍️",
                title: "Assinatura ZapSign",
                body: "Contratos de cessão assinados digitalmente. Validade jurídica. Pra auditoria, link público acessível.",
              },
              {
                icon: "🎁",
                title: "Cashback de fidelidade",
                body: "Construtora ativa recebe cashback. Quanto mais corretor antecipa com você, mais retorno.",
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

      {/* FAQ */}
      <section className="bg-slate-50 py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-400 mb-3">
              perguntas frequentes · construtora
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight text-slate-900">
              Antes de você perguntar.
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Eu preciso pagar mais caro pra antecipar?",
                a: "Não. Você paga a comissão exatamente como pactuou com o corretor — em parcelas, nas datas acordadas. O custo da antecipação é do corretor (ele recebe o valor presente). Você ganha o cashback de fidelidade.",
              },
              {
                q: "E se eu não confirmar a operação cedida?",
                a: "A operação não sai do papel. Sua confirmação digital é o gatilho. Se houver divergência (valor, data), você tem chat dedicado pra alinhar com Antecipaqui e fundo antes.",
              },
              {
                q: "Posso continuar com meu sistema atual de boletos?",
                a: "Sim, você pode. Mas a maioria das construtoras migra a cobrança das comissões pra Antecipaqui (gratuito) pra ter conciliação automática e cobrança escalada incluídas.",
              },
              {
                q: "Como funciona o BI dos empreendimentos?",
                a: "Cada operação é tagueada por empreendimento (você cadastra os empreendimentos no painel). O sistema agrega: VGV, comissões, velocidade, conversão, ranking de corretores. Disponível em tempo real, export CSV/PDF.",
              },
              {
                q: "Tenho score? Como ele afeta?",
                a: "Sim. Construtora tem score 0–100 baseado em parcelas pagas em dia. Score alto destrava mais corretores pra operar com você, taxas competitivas pra antecipação, prioridade na fila do fundo.",
              },
              {
                q: "Quanto tempo leva pra começar?",
                a: "Cadastro do CNPJ + dados financeiros: 15 minutos. Confirmação da Antecipaqui: até 24h. A partir daí, qualquer corretor cadastrado pode antecipar operações suas.",
              },
              {
                q: "Existe contrato de adesão?",
                a: "Sim, contrato simples assinado digitalmente. Sem fidelidade, sem multa de saída. Você sai quando quiser — sem retroatividade nas operações já cedidas.",
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

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#0a0e1a] to-[#0d4e9e] text-white py-16 md:py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Seu fluxo de caixa intacto.{" "}
            <span className="text-emerald-300">Seu corretor satisfeito.</span>
          </h2>
          <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed">
            Cadastro em 15 minutos. Sem fidelidade. Sem custo recorrente. Você
            ainda ganha cashback pelas operações cedidas.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 no-print">
            <Link
              href="/cadastre-se"
              className="h-14 px-8 rounded-xl bg-emerald-400 text-slate-900 font-bold text-base inline-flex items-center hover:bg-emerald-300 transition"
            >
              Cadastrar construtora →
            </Link>
            <a
              href="mailto:construtoras@antecipaqui.digital?subject=Quero%20conhecer%20o%20Antecipaqui%20como%20construtora"
              className="h-14 px-8 rounded-xl bg-transparent border border-white/30 text-white font-semibold text-base inline-flex items-center hover:bg-white/10 transition"
            >
              Falar com a equipe
            </a>
          </div>
          <div className="mt-12 text-sm text-slate-400">
            Atendimento dedicado:{" "}
            <a
              href="mailto:construtoras@antecipaqui.digital"
              className="text-emerald-300 hover:underline"
            >
              construtoras@antecipaqui.digital
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
