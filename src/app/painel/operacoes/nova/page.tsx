import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentos } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { listConstrutorasForSelect } from "@/lib/actions/operacoes";
import { NovaOperacaoForm } from "@/components/nova-operacao-form";
import { PainelShell } from "@/components/painel-shell";

export const metadata = {
  title: "Nova operação",
};

export default async function NovaOperacaoPage() {
  const user = await requireActiveUser();

  if (user.onboardingStatus === "pendente") {
    redirect("/painel/onboarding");
  }

  // Bloqueio: corretor/imobiliária precisa ter docs antes de operar
  let docsFaltando: string[] = [];
  if (user.role === "corretor" || user.role === "imobiliaria") {
    const userDocs = await db
      .select({ tipo: documentos.tipo })
      .from(documentos)
      .where(eq(documentos.userId, user.id));
    const tipos = new Set(userDocs.map((d) => d.tipo));
    if (!tipos.has("contrato_social"))
      docsFaltando.push("Contrato social");
    if (!tipos.has("comprovante_endereco"))
      docsFaltando.push("Comprovante de endereço");
  }

  const construtoras = await listConstrutorasForSelect();

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  return (
    <PainelShell
      role={role}
      userName={user.nome}
      active="/painel/operacoes/nova"
    >
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-display-md">
            Nova <span className="text-gradient-blue">operação</span>
          </h1>
          <p className="mt-2 text-fg-muted">
            Preencha os dados da venda. O valor presente é calculado em tempo
            real conforme você digita.
          </p>
        </div>
      </div>

      {docsFaltando.length > 0 ? (
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-8 md:p-10 text-center">
          <div className="size-12 mx-auto rounded-full bg-warn/15 text-warn flex items-center justify-center text-2xl mb-4">
            📎
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Faltam documentos pra você operar
          </h2>
          <p className="mt-3 text-fg-muted max-w-lg mx-auto">
            Antes de cadastrar uma operação, você precisa enviar:
          </p>
          <ul className="mt-3 inline-block text-left space-y-1">
            {docsFaltando.map((d) => (
              <li key={d} className="text-fg font-medium">
                • {d}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <Link
              href="/painel/onboarding/dados"
              className="btn-primary !h-12 !px-6"
            >
              Enviar documentos agora <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      ) : (
        <NovaOperacaoForm construtoras={construtoras} />
      )}
    </PainelShell>
  );
}
