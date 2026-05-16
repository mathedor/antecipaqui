import type { ReactNode } from "react";

/**
 * Seção temática da landing: print + texto + bullets, com layout alternado.
 * - reverse=false (default): mockup à esquerda, texto à direita
 * - reverse=true: texto à esquerda, mockup à direita
 *
 * Subseções permitem mostrar 2-3 features dentro do mesmo bloco temático.
 */
export function ApresentacaoSection({
  id,
  eyebrow,
  titulo,
  intro,
  children,
  bg = "white",
}: {
  id: string;
  eyebrow: string;
  titulo: string;
  intro?: ReactNode;
  children: ReactNode;
  bg?: "white" | "dark" | "blue";
}) {
  const bgClass =
    bg === "dark"
      ? "bg-[#0a0e1a] text-white"
      : bg === "blue"
        ? "bg-gradient-to-b from-[#020617] to-[#0d1729] text-white"
        : "bg-white text-fg";
  const eyebrowClass = bg === "white" ? "text-accent" : "text-blue-300";
  const introClass =
    bg === "white" ? "text-fg-muted" : "text-blue-100/80";

  return (
    <section id={id} className={`${bgClass} py-16 md:py-24 scroll-mt-20`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-3xl mb-12 md:mb-16">
          <div
            className={`font-mono text-[11px] uppercase tracking-[0.3em] mb-3 font-bold ${eyebrowClass}`}
          >
            {eyebrow}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight mb-4">
            {titulo}
          </h2>
          {intro && (
            <p className={`text-base md:text-lg leading-relaxed ${introClass}`}>
              {intro}
            </p>
          )}
        </div>
        <div className="space-y-16 md:space-y-24">{children}</div>
      </div>
    </section>
  );
}

/**
 * Subseção: linha com mockup + texto+bullets, alternando lado.
 */
export function ApresentacaoFeature({
  titulo,
  desc,
  bullets,
  mockup,
  reverse = false,
  hint,
  onDark = false,
}: {
  titulo: string;
  desc: string;
  bullets?: string[];
  mockup: ReactNode;
  reverse?: boolean;
  hint?: string;
  /** Quando true, cores são pra fundo escuro. */
  onDark?: boolean;
}) {
  const mutedText = onDark ? "text-blue-100/75" : "text-fg-muted";
  const hintText = onDark ? "text-blue-100/50" : "text-fg-muted opacity-70";
  const dotColor = onDark ? "bg-blue-300" : "bg-accent";
  return (
    <div
      className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
    >
      {/* mockup */}
      <div className="flex items-center justify-center">{mockup}</div>

      {/* texto */}
      <div>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 leading-tight">
          {titulo}
        </h3>
        <p className={`text-base md:text-lg leading-relaxed mb-5 ${mutedText}`}>
          {desc}
        </p>
        {bullets && bullets.length > 0 && (
          <ul className="space-y-2.5 mb-4">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm md:text-base">
                <span className={`mt-1.5 size-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                <span className={`leading-relaxed ${mutedText}`}>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {hint && (
          <div className={`text-xs font-mono italic mt-3 ${hintText}`}>
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Grid 2x2 (ou 4 col em desktop) de benefícios — cards iguais.
 */
export function ApresentacaoBeneficios({
  titulo,
  items,
}: {
  titulo: string;
  items: Array<{ emoji: string; titulo: string; desc: string }>;
}) {
  return (
    <section
      id="beneficios"
      className="bg-gradient-to-b from-[#0a0e1a] to-[#020617] text-white py-16 md:py-24 scroll-mt-20"
    >
      <div className="max-w-6xl mx-auto px-6 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-blue-300 font-bold mb-3">
          POR QUÊ
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-12 md:mb-16">
          {titulo}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {items.map((b, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white/5 border border-white/10 p-6 backdrop-blur-sm hover:bg-white/10 transition"
            >
              <div className="text-5xl mb-3">{b.emoji}</div>
              <div className="text-lg md:text-xl font-bold tracking-tight mb-2 text-white">
                {b.titulo}
              </div>
              <div className="text-sm text-blue-100/70 leading-relaxed">
                {b.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
