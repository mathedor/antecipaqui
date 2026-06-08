/**
 * Faixa fixa no topo identificando o ambiente de DEMONSTRAÇÃO.
 * Só aparece quando NEXT_PUBLIC_DEMO === "1" (setado apenas no deploy demo).
 * Em produção (www.antecipaqui.digital) a flag é ausente e nada renderiza.
 */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO !== "1") return null;
  return (
    <div
      role="status"
      className="w-full bg-amber-400 text-amber-950 text-center text-xs sm:text-sm font-semibold px-3 py-1.5 z-50"
    >
      ⚠️ Ambiente de DEMONSTRAÇÃO — dados fictícios, livre para testar. Site
      oficial:{" "}
      <a
        href="https://www.antecipaqui.digital"
        className="underline underline-offset-2"
      >
        www.antecipaqui.digital
      </a>
    </div>
  );
}
