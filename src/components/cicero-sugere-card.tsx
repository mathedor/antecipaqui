import Link from "next/link";
import { CiceroRosto } from "@/components/cicero-rosto";
import { getCiceroConselho } from "@/lib/actions/cicero-conselhos";

/**
 * "Cícero sugere" no topo do painel — o mesmo conselho que aparece no chat,
 * só que sem depender do usuário abrir o widget.
 *
 * Server component: se não houver conselho pro papel (ou faltar dado), não
 * renderiza nada em vez de mostrar caixa vazia.
 */
export async function CiceroSugereCard() {
  const conselho = await getCiceroConselho().catch(() => null);
  if (!conselho) return null;

  return (
    <section className="mb-6 rounded-3xl border border-accent/30 bg-accent-soft p-4 md:p-5">
      <div className="flex items-start gap-3 md:gap-4">
        <div className="shrink-0 rounded-full overflow-hidden border border-accent/25">
          <CiceroRosto size={44} tom="claro" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-accent mb-1">
            Cícero sugere
          </div>

          <div className="flex items-start gap-4 flex-wrap">
            <p className="text-sm leading-relaxed text-fg min-w-[16rem] flex-1">
              {conselho.texto}
            </p>

            {conselho.destaque && (
              <div className="shrink-0">
                <div className="text-2xl font-bold leading-none text-fg">
                  {conselho.destaque}
                </div>
                {conselho.legendaDestaque && (
                  <div className="text-[11px] text-fg-muted mt-1">
                    {conselho.legendaDestaque}
                  </div>
                )}
              </div>
            )}
          </div>

          {conselho.cta && (
            <Link
              href={conselho.cta.href}
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold px-4 h-9 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors"
            >
              {conselho.cta.label} <span className="arrow">→</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
