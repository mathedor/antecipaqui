import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { listConstrutorasForSelect } from "@/lib/actions/operacoes";
import { NovaOperacaoForm } from "@/components/nova-operacao-form";

export const metadata = {
  title: "Nova operação",
};

export default async function NovaOperacaoPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  if (user.onboardingStatus === "pendente") {
    redirect("/painel/onboarding");
  }

  const construtoras = await listConstrutorasForSelect();

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 md:py-16">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <Link
            href="/painel/operacoes"
            className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-2 inline-block"
          >
            ← operações
          </Link>
          <h1 className="text-display-md">
            Nova <span className="text-gradient-blue">operação</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Preencha os dados da venda. O valor presente é calculado em tempo
            real conforme você digita.
          </p>
        </div>
      </div>

      <NovaOperacaoForm construtoras={construtoras} />
    </section>
  );
}
