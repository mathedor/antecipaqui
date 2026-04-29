import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { OnboardingForm } from "@/components/onboarding-form";
import { getCurrentDbUser } from "@/lib/auth-user";

export const metadata = {
  title: "Onboarding · Dados da empresa",
};

const TITLES = {
  corretor: "Seus dados profissionais",
  imobiliaria: "Dados da imobiliária",
  construtora: "Dados da construtora",
} as const;

export default async function OnboardingDadosPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  if (user.onboardingStatus === "aprovado") redirect("/painel");

  const title = TITLES[user.role as keyof typeof TITLES] ?? "Dados";

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-2xl">
        <div className="rounded-3xl border border-border bg-bg-elev p-8 md:p-12 shadow-xl">
          <div className="flex justify-center mb-8">
            <Logo size={40} />
          </div>

          <OnboardingProgress step={2} />

          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              {title}
            </h1>
            <Link
              href="/painel/onboarding"
              className="text-xs text-fg-muted hover:text-fg transition-colors font-mono"
            >
              ← trocar tipo
            </Link>
          </div>
          <p className="mt-1 text-fg-muted">
            Esses dados aparecem nos contratos e na sua conta. Não compartilhamos
            com ninguém fora das operações que você participar.
          </p>

          <div className="mt-8">
            <OnboardingForm
              role={user.role as "corretor" | "imobiliaria" | "construtora"}
              defaultName={user.nome ?? ""}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
