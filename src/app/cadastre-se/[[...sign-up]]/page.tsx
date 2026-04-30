import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Cadastre-se",
  description: "Crie sua conta Antecipaqui em minutos.",
};

export default function CadastrarPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-md flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <Logo size={40} />
        </div>
        <SignUp
          signInUrl="/entrar"
          forceRedirectUrl="/painel"
          signInForceRedirectUrl="/painel"
        />
        <p className="mt-6 text-center text-xs text-fg-dim max-w-sm leading-relaxed">
          Após criar sua conta você escolhe seu perfil (corretor / imobiliária /
          construtora) e completa o KYC. Leva 5 minutos.
        </p>
      </div>
    </section>
  );
}
