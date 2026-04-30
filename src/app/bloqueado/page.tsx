import { Logo } from "@/components/logo";
import { SairButton } from "@/components/sair-button";
import { WHATSAPP_LINKS } from "@/lib/links";

export const metadata = {
  title: "Cadastro bloqueado",
};

export default function BloqueadoPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Logo size={40} />
        </div>
        <div className="rounded-3xl border border-danger/30 bg-red-50 p-8 md:p-10 text-center">
          <div className="size-14 mx-auto rounded-full bg-danger/15 text-danger flex items-center justify-center text-2xl mb-5">
            ⛔
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Seu cadastro está bloqueado
          </h1>
          <p className="mt-4 text-fg-muted leading-relaxed">
            Identificamos uma restrição na sua conta e o acesso ao painel está
            temporariamente suspenso. Entre em contato com a Antecipaqui pra
            entender o motivo e resolver a pendência.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={WHATSAPP_LINKS.duvida}
              target="_blank"
              rel="noopener"
              className="btn-primary !h-11 !px-5"
            >
              Falar pelo WhatsApp <span className="arrow">↗</span>
            </a>
            <a
              href="mailto:contato@antecipaqui.digital?subject=Cadastro%20bloqueado"
              className="btn-ghost !h-11 !px-5"
            >
              Enviar email
            </a>
          </div>
          <div className="mt-7 pt-5 border-t border-danger/20 flex justify-center">
            <SairButton />
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-fg-dim">
          Já é cliente e acredita que isso é um engano? Mande um email pra
          contato@antecipaqui.digital com seu CNPJ que respondemos em até 1 dia
          útil.
        </p>
      </div>
    </section>
  );
}
