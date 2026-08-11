import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { TextReveal } from "@/components/text-reveal";
import { TypeText } from "@/components/type-text";
import { AnimatedCounter } from "@/components/animated-counter";
import { Calculadora } from "@/components/calculadora";
import { CtaCadastro, CtaSimular } from "@/components/cta-buttons";
import { getTaxaMensal } from "@/lib/actions/settings";
import { LINKS } from "@/lib/links";

const stats = [
  { value: 1, suffix: " dia", label: "pra cair na conta" },
  { value: 100, suffix: "%", label: "digital" },
  { value: 24, suffix: "h", label: "pra aprovação" },
  { value: 0, suffix: "", label: "papelada física" },
];

type Perfil = {
  num: string;
  title: string;
  body: string;
  cta: string;
  href?: string;
  signup?: boolean;
  accent?: boolean;
};

const perfis: Perfil[] = [
  {
    num: "01",
    title: "Imobiliária / Corretor",
    body: "Vendeu? Recebe a comissão hoje. Antecipa até 5 parcelas (150 dias). Cadastra a operação, envia os contratos e recebe o valor presente direto na sua conta.",
    cta: "É meu caso",
    signup: true,
    accent: true,
  },
  {
    num: "02",
    title: "Imobiliária",
    body: "Antecipe as comissões da sua equipe sem comprometer o caixa. Mantenha seus corretores motivados com pagamento à vista.",
    cta: "Cadastrar minha imobiliária",
    signup: true,
  },
  {
    num: "03",
    title: "Construtora",
    body: "Mantenha o que paga, alivie quem te vende. Seus corretores recebem à vista, você paga conforme combinado, e ganha um parceiro que cuida da operação.",
    cta: "Saber mais",
    href: LINKS.paraConstrutoras,
  },
];

const passos = [
  {
    num: "01",
    title: "Cadastra",
    body: "Cadastro 100% online. Em 5 minutos você envia CNPJ, contrato social, comprovante de endereço. Validamos e liberamos seu acesso.",
  },
  {
    num: "02",
    title: "Registra a operação",
    body: "Informa valor da venda, da comissão, parcelas e construtora. Anexa contrato e nota. Veja o valor que recebe hoje na hora.",
  },
  {
    num: "03",
    title: "Recebe à vista",
    body: "Aprovamos em até 24 horas. Geramos contrato digital, você assina online, e o valor cai na sua conta em até 1 dia útil.",
  },
];

const diferenciais = [
  {
    icon: "⚡",
    title: "Aprovação em 24h",
    body: "Análise técnica rápida. Você não fica em fila esperando 'a próxima reunião do comitê'.",
  },
  {
    icon: "🔒",
    title: "Sem burocracia física",
    body: "Tudo digital. Documento sobe pela web, contrato assina pela web, dinheiro cai na conta.",
  },
  {
    icon: "📊",
    title: "Painel transparente",
    body: "Acompanhe cada operação, vencimento e pagamento em tempo real. Construtora também acompanha.",
  },
  {
    icon: "💰",
    title: "Taxas claras",
    body: "Sem cláusulas escondidas. Você vê o deságio antes de aceitar — calcula no simulador, decide com calma.",
  },
];

export default async function Home() {
  const taxaMensalSugerida = await getTaxaMensal();
  return (
    <>
      {/* ============== HERO ============== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-60" aria-hidden />
        <div className="absolute inset-0 bg-mesh mesh-float-1 pointer-events-none" aria-hidden />
        <div className="spot bg-accent top-0 left-1/4 w-[640px] h-[640px] opacity-[0.10]" aria-hidden />

        <div className="mx-auto max-w-6xl px-6 pt-16 md:pt-24 pb-16 relative">
          <div className="fade-up flex items-center gap-3 mb-6">
            <span className="dot-pulse" />
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-fg-muted">
              comissão imobiliária ·{" "}
              <TypeText
                texts={[
                  "antecipada",
                  "à vista",
                  "sem espera",
                  "em 1 dia",
                ]}
                className="text-accent"
                cursorClassName="text-accent ml-0.5"
                speed={50}
                pause={1400}
              />
            </span>
          </div>

          <h1 className="max-w-5xl">
            <span className="block text-display-xl">
              <TextReveal>Receba sua comissão</TextReveal>
            </span>
            <span className="block text-display-xl text-gradient-blue">
              <TextReveal delayMs={250}>hoje.</TextReveal>
            </span>
            <span className="block text-display-xl-half text-fg-muted mt-3">
              <TextReveal delayMs={500}>
                Mesmo que parcelada em até 5x (150 dias).
              </TextReveal>
            </span>
          </h1>

          <p
            className="fade-up mt-8 max-w-xl text-fg-muted text-lg md:text-xl leading-relaxed"
            style={{ animationDelay: "850ms" }}
          >
            Antecipa a comissão futura da sua próxima venda imobiliária.
            Cadastra, envia os contratos, e em 1 dia útil o valor cai na sua conta.
            Você vê o deságio e quanto recebe líquido antes de aceitar — sem surpresa.
          </p>

          <div
            className="fade-up mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "950ms" }}
          >
            <CtaCadastro className="btn-primary">
              Cadastre-se grátis <span className="arrow">→</span>
            </CtaCadastro>
            <CtaSimular className="btn-ghost">Simular agora</CtaSimular>
          </div>

          <Reveal className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10 border-t border-border pt-10 reveal-stagger">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-display-md text-fg tabular">
                  <AnimatedCounter to={s.value} suffix={s.suffix} />
                </div>
                <div className="mt-2 text-xs uppercase tracking-wider text-fg-dim font-mono">
                  {s.label}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ============== CALCULADORA ============== */}
      <section
        id="simulador"
        className="border-t border-border bg-bg-card scroll-mt-24"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Reveal className="max-w-2xl mb-10">
            <div className="eyebrow mb-4">simulador em tempo real</div>
            <h2 className="text-display-lg">
              <TextReveal>
                Veja agora{" "}
                <span className="text-gradient-blue">quanto você recebe</span>.
              </TextReveal>
            </h2>
            <p className="mt-4 text-fg-muted text-lg leading-relaxed">
              Sem cadastro, sem login. Arraste os controles e simule cenários
              reais de comissão e veja quanto recebe líquido.
            </p>
          </Reveal>
          <Reveal>
            <Calculadora taxaMensalSugerida={taxaMensalSugerida} />
          </Reveal>
        </div>
      </section>

      {/* ============== COMO FUNCIONA ============== */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="flex items-end justify-between gap-4 mb-14 flex-wrap">
            <div className="max-w-2xl">
              <div className="eyebrow mb-4">como funciona</div>
              <h2 className="text-display-lg">
                <TextReveal>
                  Três passos.{" "}
                  <span className="text-gradient-blue">24 horas.</span>{" "}
                  Sem dor.
                </TextReveal>
              </h2>
            </div>
            <Link
              href={LINKS.comoFunciona}
              className="link-underline text-fg-muted hover:text-fg"
            >
              Ver detalhado <span className="arrow">→</span>
            </Link>
          </div>
        </Reveal>

        <Reveal className="grid md:grid-cols-3 gap-5 reveal-stagger">
          {passos.map((p) => (
            <div
              key={p.num}
              className="card-glow rounded-2xl border border-border bg-bg-elev p-7 md:p-8"
            >
              <div className="font-mono text-xs text-accent mb-5">{p.num}</div>
              <h3 className="text-2xl font-bold tracking-tight">{p.title}</h3>
              <p className="mt-3 text-fg-muted leading-relaxed text-sm">
                {p.body}
              </p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ============== PARA QUEM ============== */}
      <section className="border-y border-border bg-bg-card">
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <Reveal>
            <div className="max-w-2xl mb-14">
              <div className="eyebrow mb-4">para quem</div>
              <h2 className="text-display-lg">
                <TextReveal>
                  Três perfis.{" "}
                  <span className="text-gradient-blue">Uma plataforma</span>.
                </TextReveal>
              </h2>
              <p className="mt-4 text-fg-muted text-lg leading-relaxed">
                Corretor recebe à vista. Imobiliária mantém o caixa.
                Construtora ganha um parceiro de fluxo.
              </p>
            </div>
          </Reveal>

          <Reveal className="grid md:grid-cols-3 gap-5 reveal-stagger">
            {perfis.map((p) => (
              <div
                key={p.num}
                className={`card-glow rounded-2xl p-7 md:p-9 group transition-colors ${
                  p.accent
                    ? "bg-bg-dark border border-bg-dark text-fg-inverse"
                    : "bg-bg-elev border border-border"
                }`}
              >
                <div
                  className={`font-mono text-xs mb-5 ${
                    p.accent ? "text-accent" : "text-fg-dim"
                  }`}
                >
                  {p.num}
                </div>
                <h3
                  className={`text-3xl font-bold tracking-tight ${
                    p.accent ? "text-fg-inverse" : "text-fg"
                  }`}
                >
                  {p.title}
                </h3>
                <p
                  className={`mt-4 leading-relaxed text-sm ${
                    p.accent ? "text-fg-inverse/80" : "text-fg-muted"
                  }`}
                >
                  {p.body}
                </p>
                {p.signup ? (
                  <CtaCadastro
                    className={`mt-7 inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                      p.accent
                        ? "text-accent hover:text-white"
                        : "text-fg hover:text-accent"
                    }`}
                  >
                    {p.cta}
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </CtaCadastro>
                ) : (
                  <Link
                    href={p.href!}
                    className={`mt-7 inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                      p.accent
                        ? "text-accent hover:text-white"
                        : "text-fg hover:text-accent"
                    }`}
                  >
                    {p.cta}
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                )}
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ============== DIFERENCIAIS ============== */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="max-w-2xl mb-14">
            <div className="eyebrow mb-4">o que nos move</div>
            <h2 className="text-display-lg">
              <TextReveal>
                Por que{" "}
                <span className="text-gradient-blue">vale a pena</span>.
              </TextReveal>
            </h2>
          </div>
        </Reveal>

        <Reveal className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 reveal-stagger">
          {diferenciais.map((d) => (
            <div
              key={d.title}
              className="rounded-2xl border border-border bg-bg-elev p-6 hover:border-accent transition-colors group"
            >
              <div className="text-3xl mb-4">{d.icon}</div>
              <h3 className="text-lg font-bold tracking-tight">{d.title}</h3>
              <p className="mt-2 text-fg-muted text-sm leading-relaxed">{d.body}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ============== TRUST / SEGURANÇA ============== */}
      <section className="border-t border-border bg-bg-card">
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <Reveal className="grid md:grid-cols-12 gap-10 items-start">
            <div className="md:col-span-5">
              <div className="eyebrow mb-4">segurança</div>
              <h2 className="text-display-md">
                <TextReveal>
                  <span className="text-gradient-blue">Operação regulada</span>,
                  controle total.
                </TextReveal>
              </h2>
            </div>
            <div className="md:col-span-7 space-y-5 text-fg-muted text-lg leading-relaxed">
              <p>
                Cada operação tem contrato registrado e assinatura digital com
                validade jurídica. Documentos armazenados com criptografia.
              </p>
              <p>
                A construtora envolvida acompanha tudo em tempo real e confirma
                a operação antes da liquidação.{" "}
                <span className="text-fg">Ninguém é pego de surpresa.</span>
              </p>
              <Link
                href={LINKS.perguntas}
                className="link-underline text-fg hover:text-accent inline-flex"
              >
                Ver perguntas frequentes <span className="arrow">→</span>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal>
          <div className="rounded-[2rem] bg-bg-dark text-fg-inverse p-12 md:p-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-mesh-dark mesh-float-2 pointer-events-none" aria-hidden />
            <div className="absolute inset-0 bg-grid-dark opacity-40 pointer-events-none" aria-hidden />
            <div className="relative max-w-3xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent mb-5">
                pronto pra começar
              </div>
              <h2 className="text-display-lg">
                <TextReveal>
                  Sua próxima venda paga{" "}
                  <span className="text-gradient-blue">o seu próximo mês</span>.
                </TextReveal>
              </h2>
              <p className="mt-6 text-fg-inverse/70 text-xl leading-relaxed max-w-xl">
                Não o próximo ano. Cadastre-se em 5 minutos e simule a sua
                primeira operação ainda hoje.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <CtaCadastro className="btn-primary">
                  Cadastre-se grátis <span className="arrow">→</span>
                </CtaCadastro>
                <CtaSimular className="btn-ghost !bg-white/10 !border-white/20 !text-fg-inverse hover:!bg-white/20 hover:!border-accent hover:!text-accent">
                  Simular antes
                </CtaSimular>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
