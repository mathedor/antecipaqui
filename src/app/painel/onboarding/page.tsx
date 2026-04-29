import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { getCurrentDbUser } from "@/lib/auth-user";
import { selectRoleAction } from "@/lib/actions/onboarding";

export const metadata = {
  title: "Onboarding · Tipo de cadastro",
};

const tipos = [
  {
    role: "corretor",
    label: "Sou corretor",
    sub: "Pessoa física com CRECI ou empresa individual",
    body: "Vou antecipar comissões das minhas próprias vendas.",
  },
  {
    role: "imobiliaria",
    label: "Sou imobiliária",
    sub: "Empresa com CNPJ, equipe de corretores",
    body: "Antecipo comissões da minha equipe ou da minha própria carteira.",
  },
  {
    role: "construtora",
    label: "Sou construtora",
    sub: "Incorporadora ou loteadora com CNPJ",
    body: "Quero ser parceira de fluxo — corretores recebem à vista, eu pago no prazo combinado.",
  },
];

export default async function OnboardingStartPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  // Se já completou onboarding, devolve pra painel
  if (user.onboardingStatus === "aprovado") redirect("/painel");

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-2xl">
        <div className="rounded-3xl border border-border bg-bg-elev p-8 md:p-12 shadow-xl">
          <div className="flex justify-center mb-8">
            <Logo size={40} />
          </div>

          <OnboardingProgress step={1} />

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Você é <span className="text-gradient-blue">…</span>
          </h1>
          <p className="mt-3 text-fg-muted">
            Escolhe o seu perfil pra adaptarmos o cadastro. Você pode trocar
            depois se mudar de ideia.
          </p>

          <form action={selectRoleAction} className="mt-8 space-y-3">
            {tipos.map((t) => (
              <label
                key={t.role}
                className="block p-5 rounded-2xl border border-border bg-bg-card hover:border-accent transition-colors cursor-pointer has-[:checked]:border-accent has-[:checked]:bg-accent-soft group"
              >
                <input
                  type="radio"
                  name="role"
                  value={t.role}
                  defaultChecked={t.role === user.role}
                  className="sr-only peer"
                  required
                />
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold text-lg group-has-[:checked]:text-accent">
                      {t.label}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mt-1">
                      {t.sub}
                    </div>
                    <div className="mt-2 text-sm text-fg-muted">{t.body}</div>
                  </div>
                  <span className="size-6 rounded-full border border-border-strong flex items-center justify-center shrink-0 mt-1 group-has-[:checked]:border-accent group-has-[:checked]:bg-accent">
                    <span className="size-2 rounded-full bg-white opacity-0 group-has-[:checked]:opacity-100" />
                  </span>
                </div>
              </label>
            ))}

            <button type="submit" className="btn-primary !w-full justify-center mt-6">
              Continuar <span className="arrow">→</span>
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-fg-dim">
            Em conformidade com a LGPD. Seus dados são tratados com sigilo.
          </p>
        </div>
      </div>
    </section>
  );
}
