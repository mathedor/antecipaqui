import Link from "next/link";
import { Logo } from "./logo";
import { LINKS, WHATSAPP_LINKS, WHATSAPP_DISPLAY } from "@/lib/links";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-border mt-24 bg-bg-elev">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-6 max-w-md text-fg-muted leading-relaxed text-sm">
              Antecipação de comissões imobiliárias. Sua comissão parcelada vira
              dinheiro na conta em até 1 dia útil.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="dot-pulse" />
              <span className="font-mono text-xs text-fg-muted">
                operando em todo o Brasil
              </span>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-fg-dim uppercase tracking-[0.2em] text-[10px] mb-4 font-mono">
              Plataforma
            </h4>
            <ul className="space-y-2 text-fg-muted text-sm">
              <li><Link href={LINKS.comoFunciona} className="hover:text-fg transition-colors">Como funciona</Link></li>
              <li><Link href={LINKS.simulador} className="hover:text-fg transition-colors">Simulador</Link></li>
              <li><Link href={LINKS.paraConstrutoras} className="hover:text-fg transition-colors">Para construtoras</Link></li>
              <li><Link href={LINKS.perguntas} className="hover:text-fg transition-colors">Perguntas</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-fg-dim uppercase tracking-[0.2em] text-[10px] mb-4 font-mono">
              Conta
            </h4>
            <ul className="space-y-2 text-fg-muted text-sm">
              <li><Link href={LINKS.entrar} className="hover:text-fg transition-colors">Entrar</Link></li>
              <li><Link href={LINKS.cadastrar} className="hover:text-fg transition-colors">Cadastre-se</Link></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-fg-dim uppercase tracking-[0.2em] text-[10px] mb-4 font-mono">
              Contato
            </h4>
            <ul className="space-y-2 text-fg-muted text-sm">
              <li>
                <a href={WHATSAPP_LINKS.default} target="_blank" rel="noopener" className="link-underline hover:text-fg">
                  WhatsApp · {WHATSAPP_DISPLAY} <span className="arrow">↗</span>
                </a>
              </li>
              <li>
                <a href="mailto:contato@antecipaqui.digital" className="link-underline hover:text-fg">
                  contato@antecipaqui.digital <span className="arrow">↗</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-border flex flex-col md:flex-row md:justify-between gap-3 text-[11px] text-fg-dim">
          <span>© {year} Antecipaqui. Todos os direitos reservados.</span>
          <span className="font-mono">CNPJ XX.XXX.XXX/0001-XX · operação financeira regulada</span>
        </div>
      </div>
    </footer>
  );
}
