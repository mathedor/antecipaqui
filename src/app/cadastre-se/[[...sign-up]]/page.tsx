import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { avaliarTicketDeConvite } from "@/lib/convite-ticket";

export const metadata = {
  title: "Cadastre-se",
  description: "Crie sua conta Antecipaqui em minutos.",
};

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-md flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <Logo size={40} />
        </div>
        {children}
      </div>
    </section>
  );
}

export default async function CadastrarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Convite com ticket morto deixava o <SignUp> em branco, sem explicação.
  // Avaliamos o ticket no servidor: revogado com substituto pendente →
  // redireciona pro convite novo (link antigo volta a funcionar); sem
  // substituto → explica o que houve em vez da tela vazia.
  const params = await searchParams;
  const ticket = params.__clerk_ticket;
  if (typeof ticket === "string" && ticket) {
    const veredito = await avaliarTicketDeConvite(ticket);
    if (veredito.acao === "redirecionar") redirect(veredito.url);
    if (veredito.acao === "ja_aceito") {
      return (
        <Moldura>
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-2">
              Este convite já foi utilizado
            </h1>
            <p className="text-sm text-fg-muted mb-6">
              A conta deste convite já foi criada. É só entrar normalmente.
            </p>
            <Link
              href="/entrar"
              className="btn-primary inline-flex !h-11 !px-6"
            >
              Entrar na minha conta
            </Link>
          </div>
        </Moldura>
      );
    }
    if (veredito.acao === "morto") {
      return (
        <Moldura>
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-2">
              Este convite não está mais ativo
            </h1>
            <p className="text-sm text-fg-muted max-w-sm">
              Ele foi substituído por um mais novo ou expirou. Procure o
              convite mais recente no seu e-mail — ou peça um novo a quem te
              convidou.
            </p>
          </div>
        </Moldura>
      );
    }
  }

  return (
    <Moldura>
      <SignUp
        signInUrl="/entrar"
        forceRedirectUrl="/painel"
        signInForceRedirectUrl="/painel"
      />
      <p className="mt-6 text-center text-xs text-fg-dim max-w-sm leading-relaxed">
        Após criar sua conta você escolhe seu perfil (corretor / imobiliária /
        construtora) e completa o KYC. Leva 5 minutos.
      </p>
    </Moldura>
  );
}
