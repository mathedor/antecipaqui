import { redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { construtoras, documentos, imobiliarias } from "@/db/schema";
import { Logo } from "@/components/logo";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { OnboardingForm } from "@/components/onboarding-form";
import { SairButton } from "@/components/sair-button";
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

  // Busca dados existentes pra pré-popular caso o user volte aqui
  // (validação falhou ou está completando docs depois).
  const isImob = user.role === "corretor" || user.role === "imobiliaria";
  const [imobExist, constrExist, userDocs] = await Promise.all([
    isImob
      ? db
          .select()
          .from(imobiliarias)
          .where(eq(imobiliarias.ownerUserId, user.id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    user.role === "construtora"
      ? db
          .select()
          .from(construtoras)
          .where(eq(construtoras.ownerUserId, user.id))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db
      .select()
      .from(documentos)
      .where(eq(documentos.userId, user.id)),
  ]);

  const empresa = imobExist ?? constrExist;
  const docByTipo = new Map(userDocs.map((d) => [d.tipo, d]));

  const initialValues = {
    nome: user.nome ?? "",
    telefone: user.telefone ?? empresa?.telefone ?? "",
    razaoSocial: empresa?.razaoSocial ?? "",
    nomeFantasia: empresa?.nomeFantasia ?? "",
    cnpj: empresa?.cnpj ?? "",
    creci: imobExist?.creciResponsavel ?? "",
    email: constrExist?.email ?? "",
    cep: empresa?.cep ?? "",
    endereco: empresa?.endereco ?? "",
    cidade: empresa?.cidade ?? "",
    uf: empresa?.uf ?? "",
    bancoNome: imobExist?.bancoNome ?? "",
    bancoCodigo: imobExist?.bancoCodigo ?? "",
    bancoAgencia: imobExist?.bancoAgencia ?? "",
    bancoConta: imobExist?.bancoConta ?? "",
  };
  const initialDocs = {
    contratoSocial: docByTipo.get("contrato_social")
      ? {
          url: docByTipo.get("contrato_social")!.url,
          name: docByTipo.get("contrato_social")!.nomeOriginal,
        }
      : null,
    comprovanteEndereco: docByTipo.get("comprovante_endereco")
      ? {
          url: docByTipo.get("comprovante_endereco")!.url,
          name: docByTipo.get("comprovante_endereco")!.nomeOriginal,
        }
      : null,
    creci: docByTipo.get("creci")
      ? {
          url: docByTipo.get("creci")!.url,
          name: docByTipo.get("creci")!.nomeOriginal,
        }
      : null,
  };

  return (
    <section className="min-h-[80vh] flex items-center justify-center px-6 py-16 relative">
      <div className="absolute inset-0 bg-mesh pointer-events-none" aria-hidden />
      <div className="relative w-full max-w-2xl">
        <div className="rounded-3xl border border-border bg-bg-elev p-8 md:p-12 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <Logo size={40} />
            <SairButton />
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
              initialValues={initialValues}
              initialDocs={initialDocs}
              initialPossuiFiliais={imobExist?.possuiFiliais ?? false}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
