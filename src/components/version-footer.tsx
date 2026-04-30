/**
 * Footer minimalista com versão (commit hash). Aparece em todos os
 * shells da aplicação. A versão é injetada via NEXT_PUBLIC_APP_VERSION
 * no build (next.config.ts pega do git ou Vercel env).
 */
export function VersionFooter() {
  const v = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  return (
    <footer className="mt-12 pt-6 pb-8 border-t border-border">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim">
          Antecipaqui · v.{v}
        </span>
      </div>
    </footer>
  );
}
