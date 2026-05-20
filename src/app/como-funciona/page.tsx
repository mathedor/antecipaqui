import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { TextReveal } from "@/components/text-reveal";
import { Calculadora } from "@/components/calculadora";
import { CtaCadastro } from "@/components/cta-buttons";
import { getTaxaMensal } from "@/lib/actions/settings";
import { LINKS } from "@/lib/links";

export const metadata = {
  title: "Como funciona",
  description:
    "Antecipação de comissão imobiliária em 3 passos: cadastro, registro da operação, recebimento à vista. Aprovação em até 24h.",
};

const passos = [
  {
    num: "01",
    title: "Cadastro KYC em 5 minutos",
    body: "Você cria sua conta como corretor, imobiliária ou construtora. Envia CNPJ, contrato social, comprovante de endereço, dados bancários. Validamos e liberamos o acesso.",
    detalhe: [
      "Cadastro 100% online",
      "Confirmação por email + SMS",
      "Validação documental em 24h úteis",
      "Sem custo de adesão",
    ],
  },
  {
    num: "02",
    title: "Registro da operação",
    body: "No painel, você cria uma operação informando: valor da venda, valor da comissão, parcelas (data + valor), construtora compradora, e anexa contrato + nota fiscal. O simulador mostra o valor presente na hora.",
    detalhe: [
      "Valor da venda + comissão + parcelas",
      "Cadastro de construtoras (auto-cadastro disponível)",
      "Anexo de contrato de venda, contrato de comissão e NF",
      "Cálculo do deságio em tempo real",
    ],
  },
  {
    num: "03",
    title: "Aprovação + assinatura digital",
    body: "Equipe Antecipaqui analisa em até 24h úteis. Aprovado, geramos o contrato de cessão e enviamos pra assinatura digital (você + construtora). Após assinado, valor cai na sua conta em 1 dia útil.",
    detalhe: [
      "Análise técnica em até 24h",
      "Contrato gerado automaticamente",
      "Assinatura via plataforma certificada (ICP-Brasil)",
      "Liquidação em D+1 da assinatura",
    ],
  },
];

const dores = [
  {
    antes: "Esperar 4 meses",
    depois: "1 dia útil",
  },
  {
    antes: "Negociar com banco",
    depois: "Cadastro online",
  },
  {
    antes: "Caixa apertado",
    depois: "Capital de giro",
  },
  {
    antes: "Burocracia em papel",
    depois: "Tudo digital",
  },
];

export default async function ComoFuncionaPage() {
  const taxaMensalSugerida = await getTaxaMensal();
  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" aria-hidden />
        <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
        <div className="mx-auto max-w-6xl px-6 pt-20 md:pt-24 pb-16 relative">
          <div className="eyebrow fade-up mb-5">como funciona</div>
          <h1 className="max-w-4xl">
            <span className="block text-display-xl">
              <TextReveal>Da venda</TextReveal>
            </span>
            <span className="block text-display-xl text-gradient-blue">
              <TextReveal delayMs={250}>ao recebimento.</TextReveal>
            </span>
            <span className="block text-display-xl-half text-fg-muted mt-3">
              <TextReveal delayMs={500}>Em 24 horas, com método.</TextReveal>
            </span>
          </h1>
          <p
            className="fade-up mt-6 max-w-2xl text-fg-muted text-lg md:text-xl leading-relaxed"
            style={{ animationDelay: "750ms" }}
          >
            Três passos pra transformar comissão futura em dinheiro hoje. Sem
            consultoria, sem reunião, sem dor.
          </p>
        </div>
      </section>

      {/* PASSOS */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28 space-y-16 md:space-y-24">
        {passos.map((p, idx) => (
          <Reveal key={p.num}>
            <div
              className={`grid md:grid-cols-12 gap-10 md:gap-16 items-start ${
                idx % 2 === 1 ? "md:[&>div:first-child]:order-2" : ""
              }`}
            >
              <div className="md:col-span-5">
                <div className="font-mono text-display-md text-accent tabular leading-none">
                  {p.num}
                </div>
                <h2 className="mt-4 text-display-md">{p.title}</h2>
                <p className="mt-5 text-fg-muted text-lg leading-relaxed">{p.body}</p>
              </div>
              <div className="md:col-span-7">
                <ul className="space-y-px bg-border rounded-2xl overflow-hidden border border-border">
                  {p.detalhe.map((d, i) => (
                    <li
                      key={d}
                      className="bg-bg-elev hover:bg-bg-card transition-colors p-5 md:p-6 flex items-start gap-4 group"
                    >
                      <span className="font-mono text-xs text-accent mt-0.5 shrink-0 w-8">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-fg leading-relaxed">{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        ))}
      </section>

      {/* ANTES / DEPOIS */}
      <section className="border-y border-border bg-bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal>
            <div className="max-w-2xl mb-12">
              <div className="eyebrow mb-4">antes vs depois</div>
              <h2 className="text-display-lg">
                <TextReveal>
                  O mesmo cliente.{" "}
                  <span className="text-gradient-blue">Outra realidade.</span>
                </TextReveal>
              </h2>
            </div>
          </Reveal>
          <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 reveal-stagger">
            {dores.map((d) => (
              <div
                key={d.antes}
                className="rounded-2xl border border-border bg-bg-elev p-6"
              >
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-2">
                  antes
                </div>
                <div className="text-lg font-bold text-fg-muted line-through decoration-1">
                  {d.antes}
                </div>
                <div className="my-4 h-px bg-border" />
                <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
                  com Antecipaqui
                </div>
                <div className="text-2xl font-bold text-fg">{d.depois}</div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* SIMULADOR */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal>
          <div className="max-w-2xl mb-10">
            <div className="eyebrow mb-4">simule</div>
            <h2 className="text-display-lg">
              <TextReveal>
                Veja o seu caso{" "}
                <span className="text-gradient-blue">sem sair daqui</span>.
              </TextReveal>
            </h2>
          </div>
        </Reveal>
        <Reveal>
          <Calculadora taxaMensalSugerida={taxaMensalSugerida} />
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="rounded-3xl border border-border bg-bg-elev p-10 md:p-14 text-center">
            <h2 className="text-display-md max-w-2xl mx-auto">
              <TextReveal>
                Pronto pra antecipar sua{" "}
                <span className="text-gradient-blue">primeira operação</span>?
              </TextReveal>
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <CtaCadastro className="btn-primary">
                Cadastre-se grátis <span className="arrow">→</span>
              </CtaCadastro>
              <Link href={LINKS.perguntas} className="btn-ghost">
                Tenho perguntas
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
