import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { TextReveal } from "@/components/text-reveal";
import { LINKS } from "@/lib/links";

export const metadata = {
  title: "Para construtoras",
  description:
    "Mantenha seus prazos de pagamento — alivie seus corretores. Antecipaqui é parceiro de fluxo de caixa: corretor recebe à vista, você paga conforme combinado.",
};

const beneficios = [
  {
    num: "01",
    title: "Mantém o seu fluxo",
    body: "Você continua pagando conforme negociado com o corretor. Não antecipa nada do seu caixa. Antecipaqui é quem assume o financiamento.",
  },
  {
    num: "02",
    title: "Corretor mais motivado",
    body: "Corretor que recebe à vista vende mais. Você ganha um time comercial menos pressionado por fluxo, mais focado no resultado.",
  },
  {
    num: "03",
    title: "Sem risco operacional",
    body: "Validamos cada operação antes de aprovar. Você acompanha tudo em tempo real no seu painel — confirma a comissão, autoriza o repasse.",
  },
  {
    num: "04",
    title: "Sem custo pra você",
    body: "Quem paga o deságio é o corretor que antecipou. Pra construtora, o serviço é zero custo direto. Você só ganha um parceiro.",
  },
];

const fluxo = [
  {
    title: "Corretor cadastra a operação",
    body: "Vinculada à sua construtora. Anexa contrato de venda + contrato de comissão.",
  },
  {
    title: "Você acompanha pelo painel",
    body: "Recebe notificação. No seu dashboard, vê todas as operações vinculadas e os documentos.",
  },
  {
    title: "Análise técnica + sua confirmação",
    body: "Antecipaqui analisa, e você confirma que a comissão é devida nos termos informados.",
  },
  {
    title: "Contrato + assinatura",
    body: "Geramos o contrato de cessão. Você assina junto com o corretor pra garantir vinculação jurídica.",
  },
  {
    title: "Operação ativa",
    body: "Antecipaqui paga o corretor. Você paga conforme datas originais — pra Antecipaqui, não pro corretor mais.",
  },
];

export default function ParaConstrutorasPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" aria-hidden />
        <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
        <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-24 pb-16 relative">
          <div className="eyebrow fade-up mb-5">para construtoras</div>
          <h1 className="max-w-4xl">
            <span className="block text-display-xl">
              <TextReveal>Mantém o que paga,</TextReveal>
            </span>
            <span className="block text-display-xl text-gradient-blue">
              <TextReveal delayMs={250}>alivia quem te vende.</TextReveal>
            </span>
          </h1>
          <p
            className="fade-up mt-6 max-w-2xl text-fg-muted text-lg md:text-xl leading-relaxed"
            style={{ animationDelay: "650ms" }}
          >
            O Antecipaqui não muda seu cronograma de pagamentos. Continua igual —
            apenas com um parceiro no meio que entrega à vista pro seu corretor e
            recebe de você no prazo combinado.
          </p>
          <div
            className="fade-up mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "850ms" }}
          >
            <Link href={LINKS.cadastrar} className="btn-primary">
              Cadastrar minha construtora <span className="arrow">→</span>
            </Link>
            <Link href={LINKS.simulador} className="btn-ghost">
              Ver simulador
            </Link>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="max-w-2xl mb-14">
            <div className="eyebrow mb-4">o que você ganha</div>
            <h2 className="text-display-lg">
              <TextReveal>
                Quatro motivos pra{" "}
                <span className="text-gradient-blue">virar parceiro</span>.
              </TextReveal>
            </h2>
          </div>
        </Reveal>
        <Reveal className="grid md:grid-cols-2 gap-px bg-border rounded-3xl overflow-hidden border border-border reveal-stagger">
          {beneficios.map((b) => (
            <div
              key={b.num}
              className="bg-bg-elev p-8 md:p-10 hover:bg-bg-card transition-colors group"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-xs text-accent">{b.num}</span>
                <span className="size-2 rounded-full bg-fg-dim group-hover:bg-accent transition-colors" />
              </div>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                {b.title}
              </h3>
              <p className="mt-4 text-fg-muted leading-relaxed">{b.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* FLUXO */}
      <section className="border-y border-border bg-bg-card">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <Reveal>
            <div className="max-w-2xl mb-14">
              <div className="eyebrow mb-4">o fluxo</div>
              <h2 className="text-display-lg">
                <TextReveal>
                  Como uma operação acontece com{" "}
                  <span className="text-gradient-blue">você no meio</span>.
                </TextReveal>
              </h2>
            </div>
          </Reveal>
          <Reveal className="reveal-stagger">
            <ol className="space-y-px bg-border rounded-3xl overflow-hidden border border-border">
              {fluxo.map((f, i) => (
                <li
                  key={f.title}
                  className="bg-bg-elev p-7 md:p-8 grid md:grid-cols-12 gap-4 md:gap-8 items-start hover:bg-bg-card transition-colors"
                >
                  <span className="md:col-span-1 font-mono text-xs text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="md:col-span-4 text-xl font-bold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="md:col-span-7 text-fg-muted leading-relaxed">
                    {f.body}
                  </p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="rounded-[2rem] bg-bg-dark text-fg-inverse p-10 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-mesh-dark mesh-float-2 pointer-events-none" aria-hidden />
            <div className="relative max-w-3xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent mb-5">
                pra construtoras
              </div>
              <h2 className="text-display-lg">
                <TextReveal>
                  Vamos falar sobre{" "}
                  <span className="text-gradient-blue">parceria</span>?
                </TextReveal>
              </h2>
              <p className="mt-6 text-fg-inverse/70 text-xl leading-relaxed max-w-xl">
                Cadastre sua construtora pra começar a receber operações dos
                seus corretores. Time comercial mais feliz, fluxo intacto.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href={LINKS.cadastrar} className="btn-primary">
                  Cadastrar construtora <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
