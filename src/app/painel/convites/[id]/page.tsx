import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { documentos } from "@/db/schema";
import { requireActiveUser } from "@/lib/auth-user";
import { getConviteById } from "@/lib/actions/pending-operacoes";
import { getTaxaMensal } from "@/lib/actions/settings";
import { PainelShell } from "@/components/painel-shell";
import { CompletarConviteForm } from "@/components/completar-convite-form";

export const metadata = { title: "Completar convite" };

type Params = { params: Promise<{ id: string }> };

export default async function CompletarConvitePage({ params }: Params) {
  const user = await requireActiveUser();
  if (user.role === "construtora") redirect("/painel");
  if (user.role === "admin") redirect("/admin");
  if (user.onboardingStatus === "pendente") redirect("/painel/onboarding");

  const { id } = await params;
  const [convite, taxa] = await Promise.all([
    getConviteById(id),
    getTaxaMensal(),
  ]);
  if (!convite) notFound();

  // Detecta KYC docs faltando
  const userDocs = await db
    .select({ tipo: documentos.tipo })
    .from(documentos)
    .where(eq(documentos.userId, user.id));
  const tipos = new Set(userDocs.map((d) => d.tipo));
  const docsFaltando: string[] = [];
  if (!tipos.has("contrato_social")) docsFaltando.push("Contrato social");
  if (!tipos.has("comprovante_endereco"))
    docsFaltando.push("Comprovante de endereço");

  const role = (user.role === "imobiliaria" ? "imobiliaria" : "corretor") as
    | "corretor"
    | "imobiliaria";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/convites">
      <Link
        href="/painel/convites"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← convites
      </Link>

      <div className="mb-6">
        <div className="eyebrow mb-2">completar operação</div>
        <h1 className="text-display-md">
          Antecipar com{" "}
          <span className="text-gradient-blue">
            {convite.construtoraNome}
          </span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Os dados financeiros foram preenchidos pela construtora. Você só
          precisa anexar os 3 documentos da operação e enviar pra análise.
        </p>
      </div>

      {docsFaltando.length > 0 ? (
        <div className="rounded-3xl border border-warn/40 bg-yellow-50 p-8 text-center">
          <div className="size-12 mx-auto rounded-full bg-warn/15 text-warn flex items-center justify-center text-2xl mb-4">
            📎
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Faltam documentos pessoais
          </h2>
          <p className="mt-3 text-fg-muted max-w-lg mx-auto">
            Antes de aceitar uma operação, você precisa enviar:
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
        <CompletarConviteForm
          convite={{
            id: convite.id,
            construtoraNome: convite.construtoraNome ?? "",
            valorVenda: convite.valorVenda,
            valorComissao: convite.valorComissao,
            numeroParcelas: convite.numeroParcelas,
            dataPrimeiraParcela: convite.dataPrimeiraParcela,
            observacoes: convite.observacoes,
          }}
          taxaMensalSugerida={taxa}
        />
      )}
    </PainelShell>
  );
}
