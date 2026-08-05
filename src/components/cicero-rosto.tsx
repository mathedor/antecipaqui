/**
 * Rosto do Cícero — atendente da Antecipaqui.
 *
 * Desenhado em SVG (nada de emoji na iconografia): consultor de terno,
 * gravata na cor da marca. Escala por `size`; `tom` troca a paleta pra
 * funcionar tanto sobre fundo escuro (FAB/header) quanto claro (balão).
 */

type Tom = "claro" | "escuro";

export function CiceroRosto({
  size = 40,
  tom = "escuro",
  className = "",
}: {
  size?: number;
  /** "escuro" = peça sobre fundo escuro · "claro" = sobre fundo claro */
  tom?: Tom;
  className?: string;
}) {
  const pele = tom === "escuro" ? "#F2C6A0" : "#E8B68C";
  const cabelo = tom === "escuro" ? "#2A3342" : "#1F2937";
  const terno = tom === "escuro" ? "#2A3A52" : "#243244";
  const camisa = "#FFFFFF";
  const gravata = "#2B7DE2";
  const traco = tom === "escuro" ? "#0F1622" : "#111827";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="Cícero, atendente da Antecipaqui"
    >
      <defs>
        <clipPath id="cicero-circulo">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>

      <g clipPath="url(#cicero-circulo)">
        {/* fundo */}
        <circle cx="32" cy="32" r="32" fill={tom === "escuro" ? "#0E1726" : "#EAF1FB"} />

        {/* ombros / terno */}
        <path
          d="M5 64c0-11.9 9.6-19.5 27-19.5S59 52.1 59 64H5z"
          fill={terno}
        />
        {/* camisa em V */}
        <path d="M24.8 45.6 32 56.5l7.2-10.9-7.2-3.2-7.2 3.2z" fill={camisa} />
        {/* gravata */}
        <path d="M32 46.6l2.8 2.8-1.9 7.6-.9 2.8-.9-2.8-1.9-7.6 2.8-2.8z" fill={gravata} />
        {/* colarinho */}
        <path
          d="M24.8 45.6 32 51l-2.4 2.4-5.8-5.3 1-2.5zM39.2 45.6 32 51l2.4 2.4 5.8-5.3-1-2.5z"
          fill={camisa}
          stroke={traco}
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* pescoço */}
        <path d="M27 37.5h10v6.5c0 1.4-2 2.3-5 2.3s-5-.9-5-2.3v-6.5z" fill={pele} />

        {/* cabeça */}
        <ellipse cx="32" cy="27" rx="13" ry="14.5" fill={pele} />

        {/* orelhas */}
        <ellipse cx="19.2" cy="28" rx="2.1" ry="3" fill={pele} />
        <ellipse cx="44.8" cy="28" rx="2.1" ry="3" fill={pele} />

        {/* cabelo — entradas altas, ar de veterano */}
        <path
          d="M19.4 25.5c-.3-8.2 5.2-13.5 12.6-13.5s12.9 5.3 12.6 13.5c-1.6-1-3-3.2-3.4-5.6-3 2.3-6.6 3.2-9.2 3.2-3.4 0-6-.6-8-1.9-.7 2-2.2 3.6-4.6 4.3z"
          fill={cabelo}
        />
        {/* têmporas grisalhas */}
        <path
          d="M19.6 26.4c-.2 1.6-.1 3 .2 4.3-1.1-1.2-1.5-3-.2-4.3zM44.4 26.4c1.3 1.3.9 3.1-.2 4.3.3-1.3.4-2.7.2-4.3z"
          fill="#9AA6B8"
        />

        {/* sobrancelhas */}
        <path
          d="M25 24.2c1.4-.9 3.3-.9 4.7-.1M34.3 24.1c1.4-.8 3.3-.8 4.7.1"
          stroke={traco}
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {/* olhos */}
        <circle cx="27.2" cy="28" r="1.7" fill={traco} />
        <circle cx="36.8" cy="28" r="1.7" fill={traco} />
        <circle cx="27.8" cy="27.4" r="0.55" fill="#fff" />
        <circle cx="37.4" cy="27.4" r="0.55" fill="#fff" />

        {/* nariz */}
        <path
          d="M32 28.8v3.1c0 .5-.4.9-1 1"
          stroke={traco}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* sorriso discreto */}
        <path
          d="M28.2 35.4c1.2 1.3 2.4 1.9 3.8 1.9s2.6-.6 3.8-1.9"
          stroke={traco}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
