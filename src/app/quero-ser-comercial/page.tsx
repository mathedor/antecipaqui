import Link from "next/link";
import { CandidaturaComercialForm } from "@/components/candidatura-comercial-form";

export const metadata = {
  title: "Quero ser comercial",
  description:
    "Cadastre-se como comercial da Antecipaqui. Comissão recorrente sobre a sua carteira, ferramentas de captação e holerite mensal.",
};

const passos = [
  {
    num: "01",
    title: "Você preenche",
    body: "Dados pessoais ou da sua empresa, onde você atua e um resumo da sua experiência. Leva 3 minutos, tudo pelo celular.",
  },
  {
    num: "02",
    title: "A Antecipaqui aprova",
    body: "Sua ficha cai na mesa do administrador. Conferimos os dados e, aprovado, seu acesso é criado na hora.",
  },
  {
    num: "03",
    title: "Você começa",
    body: "Recebe o convite por e-mail, cria a senha e já entra no painel do comercial — com mapa, pipeline e seu link de convite ativo.",
  },
];

const ganhos = [
  {
    emoji: "💸",
    title: "Comissão recorrente",
    body: "Você ganha sobre o lucro de cada operação da sua carteira — enquanto ela rodar, você recebe.",
  },
  {
    emoji: "🗺️",
    title: "Ferramentas de campo",
    body: "Mapa geolocalizado de prospects, pipeline kanban, cadastro express e templates de WhatsApp prontos.",
  },
  {
    emoji: "📄",
    title: "Holerite mensal",
    body: "Fechamento automático, operação por operação, com PDF pra contabilidade. Transparência de contracheque.",
  },
  {
    emoji: "🤝",
    title: "Sem exclusividade",
    body: "Cadastro gratuito, sem meta obrigatória. Você toca a sua carteira do seu jeito.",
  },
];

export default function QueroSerComercialPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a0e1a] via-[#0d1729] to-[#1c6dd0] text-white">
        <div className="relative max-w-5xl mx-auto px-6 py-14 md:py-20">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-200 mb-3 font-bold">
            Antecipaqui · time comercial
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] max-w-3xl">
            Quero ser comercial
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-blue-200 bg-clip-text text-transparent">
              da Antecipaqui.
            </span>
          </h1>
          <p className="mt-6 text-base md:text-lg text-blue-50 max-w-2xl leading-relaxed">
            Tem corretor esperando comissão agora mesmo. Você leva a solução até
            ele — e ganha sobre cada operação da sua carteira, todo mês.
            Preencha a ficha abaixo: analisamos e liberamos seu acesso.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#ficha"
              className="h-12 px-6 rounded-xl bg-white text-[#0a0e1a] font-bold text-sm inline-flex items-center hover:bg-blue-50 transition"
            >
              Ir pra ficha →
            </a>
            <Link
              href="/apresentacao/comercial"
              className="h-12 px-6 rounded-xl border border-white/30 text-white font-bold text-sm inline-flex items-center hover:bg-white/10 transition"
            >
              Ver a apresentação do comercial
            </Link>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="bg-white py-14 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="eyebrow mb-2">como funciona</div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-10">
            Do cadastro ao primeiro prospect em 3 passos
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {passos.map((p) => (
              <div
                key={p.num}
                className="rounded-2xl border border-border bg-bg-elev p-6"
              >
                <div className="font-mono text-xs text-accent font-bold mb-3">
                  {p.num}
                </div>
                <h3 className="font-bold mb-2">{p.title}</h3>
                <p className="text-sm text-fg-muted leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {ganhos.map((g) => (
              <div
                key={g.title}
                className="rounded-2xl border border-border p-5"
              >
                <div className="text-2xl mb-3" aria-hidden>
                  {g.emoji}
                </div>
                <h3 className="font-bold text-sm mb-1.5">{g.title}</h3>
                <p className="text-xs text-fg-muted leading-relaxed">{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FICHA */}
      <section id="ficha" className="py-14 md:py-20 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="eyebrow mb-2">sua ficha</div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-3">
            Preencha e a gente analisa
          </h2>
          <p className="text-fg-muted mb-10 max-w-2xl leading-relaxed">
            Todos os campos com * são obrigatórios. Depois de enviar, é só
            aguardar o e-mail de aprovação — normalmente respondemos em até 1 dia
            útil.
          </p>
          <CandidaturaComercialForm />
        </div>
      </section>
    </>
  );
}
