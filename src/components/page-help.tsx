"use client";

import { useState, useEffect } from "react";
import { PAGE_HELPS, type PageHelpKey } from "@/lib/page-helps";

/**
 * Link discreto "como utilizar esta área" que abre drawer lateral com
 * mini-tutorial específico da tela atual. Pra reduzir chamados de suporte.
 *
 * Uso:
 *   <PageHelp pageKey="painel-atendimentos" />
 *
 * O conteúdo vem do catálogo em src/lib/page-helps.tsx — adicione nova
 * entrada lá pra cobrir nova página.
 */
export function PageHelp({ pageKey }: { pageKey: PageHelpKey }) {
  const [open, setOpen] = useState(false);
  const data = PAGE_HELPS[pageKey];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open]);

  if (!data) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] text-fg-muted hover:text-accent font-mono uppercase tracking-wider transition-colors"
        aria-label="Como utilizar esta área"
      >
        <span className="inline-flex size-4 items-center justify-center rounded-full border border-current font-bold text-[9px]">
          ?
        </span>
        como utilizar esta área
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className="fixed inset-y-0 right-0 z-[56] w-full max-w-md bg-bg border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
            role="dialog"
            aria-modal="true"
            aria-label={`Como utilizar: ${data.titulo}`}
          >
            <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-border px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                  ajuda rápida
                </div>
                <h2 className="text-lg font-bold tracking-tight mt-0.5 truncate">
                  {data.titulo}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-8 inline-flex items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg hover:border-accent text-lg leading-none shrink-0"
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {data.resumo && (
                <p className="text-sm text-fg leading-relaxed">{data.resumo}</p>
              )}

              {data.visual && (
                <div className="rounded-xl border-2 border-accent/30 bg-accent-soft p-3 font-mono text-[11px]">
                  {data.visual}
                </div>
              )}

              {data.oQueFaz && data.oQueFaz.length > 0 && (
                <Section titulo="O que essa tela faz">
                  <ul className="space-y-2">
                    {data.oQueFaz.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-fg"
                      >
                        <span className="shrink-0 mt-1 size-1.5 rounded-full bg-accent" />
                        <span className="whitespace-pre-line">{p}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {data.comoUsar && data.comoUsar.length > 0 && (
                <Section titulo="Como usar (passo a passo)">
                  <ol className="space-y-2">
                    {data.comoUsar.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 text-sm text-fg"
                      >
                        <span className="shrink-0 size-5 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span className="whitespace-pre-line">{p}</span>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}

              {data.calculos && data.calculos.length > 0 && (
                <Section titulo="O que o sistema calcula">
                  <ul className="space-y-2">
                    {data.calculos.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-fg bg-bg-elev rounded-lg p-2.5 border border-border"
                      >
                        <span className="shrink-0 text-accent">∑</span>
                        <span className="whitespace-pre-line font-mono text-[12px]">
                          {p}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {data.dicas && data.dicas.length > 0 && (
                <Section titulo="Dicas">
                  <ul className="space-y-2">
                    {data.dicas.map((p, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-fg"
                      >
                        <span className="shrink-0 mt-0.5">💡</span>
                        <span className="whitespace-pre-line">{p}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {data.tourId && (
                <div className="pt-4 mt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent(
                          `open-onboarding-tour:${data.tourId}`,
                        ),
                      );
                      setOpen(false);
                    }}
                    className="w-full h-10 px-4 rounded-lg border-2 border-accent text-accent text-sm font-bold hover:bg-accent-soft transition-colors"
                  >
                    🎓 Abrir tour completo do seu role
                  </button>
                  <p className="text-[10px] text-fg-muted text-center mt-2">
                    Esse mini-help cobre só essa tela. O tour completo passa por
                    todas as áreas que você tem acesso.
                  </p>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function Section({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-fg-dim mb-2">
        {titulo}
      </h3>
      {children}
    </section>
  );
}
