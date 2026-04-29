import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getCurrentDbUser } from "@/lib/auth-user";

export const metadata = {
  title: "Painel",
};

export default async function PainelPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const onboardingComplete = user.onboardingStatus === "aprovado";

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 md:py-20 min-h-[60vh]">
      <div className="rounded-3xl border border-border bg-bg-elev p-8 md:p-12">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <div className="eyebrow mb-3">painel</div>
            <h1 className="text-display-md">
              Olá,{" "}
              <span className="text-gradient-blue">
                {user.nome?.split(" ")[0] ?? "bem-vindo"}
              </span>
              .
            </h1>
            <p className="mt-3 text-fg-muted text-lg max-w-xl">
              Seu painel da Antecipaqui. Atualmente cadastrado como{" "}
              <span className="text-fg font-semibold">{user.role}</span>.
            </p>
          </div>
          <UserButton />
        </div>

        {!onboardingComplete && (
          <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6 mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-accent mb-2">
              próximo passo
            </div>
            <h2 className="text-xl font-bold">Complete seu cadastro</h2>
            <p className="mt-2 text-fg-muted">
              Pra liberar o cadastro de operações, você precisa enviar os
              documentos KYC e ter sua conta aprovada.
            </p>
            <Link
              href="/painel/onboarding"
              className="btn-primary mt-5 !h-11 !px-5"
            >
              Continuar cadastro <span className="arrow">→</span>
            </Link>
          </div>
        )}

        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-card p-6">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-dim mb-3">
            roadmap deste painel
          </div>
          <ul className="space-y-3 text-fg-muted text-sm">
            <li className="flex items-start gap-3">
              <span className="size-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                ✓
              </span>
              Conta Clerk + sync com DB Postgres ✓
            </li>
            <li className="flex items-start gap-3">
              <span className="size-5 rounded-full bg-bg-elev border border-border text-fg-dim text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                ·
              </span>
              Onboarding (escolher perfil + KYC) — Phase 2 fim
            </li>
            <li className="flex items-start gap-3">
              <span className="size-5 rounded-full bg-bg-elev border border-border text-fg-dim text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                ·
              </span>
              Cadastro de operação + simulador integrado — Phase 3
            </li>
            <li className="flex items-start gap-3">
              <span className="size-5 rounded-full bg-bg-elev border border-border text-fg-dim text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                ·
              </span>
              Dashboard de operações + duplicatas a vencer — Phase 3
            </li>
          </ul>
        </div>

        <div className="mt-8 flex justify-between items-center">
          <Link href="/" className="link-underline text-fg-muted hover:text-fg">
            ← Home
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-dim">
            user · {user.id.slice(0, 12)}…
          </span>
        </div>
      </div>
    </section>
  );
}
