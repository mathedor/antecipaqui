import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Entrar",
  description: "Acesse sua conta Antecipaqui.",
};

export default function EntrarPage() {
  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-md flex flex-col items-center">
        <div className="flex justify-center mb-6">
          <Logo size={40} />
        </div>
        <SignIn
          signUpUrl="/cadastre-se"
          forceRedirectUrl="/painel"
          signUpForceRedirectUrl="/painel"
        />
        <p className="mt-6 text-center text-xs text-fg-dim max-w-sm">
          Sua conta é protegida com criptografia de ponta. Em conformidade com
          a LGPD.
        </p>
      </div>
    </section>
  );
}
