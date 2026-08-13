import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fundos } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { OperaIntegracaoForm } from "@/components/opera-integracao-form";
import { contratoPadraoJson } from "@/lib/actions/opera";

export const metadata = { title: "Admin · Integração do fundo" };

type Params = { params: Promise<{ id: string }> };

export default async function FundoIntegracaoPage({ params }: Params) {
  const admin = await requireAdmin();
  const { id } = await params;

  const [fundo] = await db
    .select()
    .from(fundos)
    .where(eq(fundos.id, id))
    .limit(1);
  if (!fundo) notFound();

  const contratoPadrao = await contratoPadraoJson();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.antecipaqui.digital";

  return (
    <AdminShell active="/admin/fundos" userName={admin.nome}>
      <Link
        href={`/admin/fundos/${id}`}
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg transition-colors mb-3 inline-block"
      >
        ← {fundo.nomeFantasia ?? fundo.razaoSocial}
      </Link>

      <h1 className="text-display-md mb-2">
        Integração —{" "}
        <span className="text-gradient-blue">
          {fundo.nomeFantasia ?? fundo.razaoSocial}
        </span>
      </h1>
      <p className="text-fg-muted mb-8 max-w-2xl">
        Quando um fundo tem sistema próprio, a operação continua nascendo aqui,
        mas roda lá dentro. Esta tela é a ponte: credenciais, ambiente, o
        mapeamento de campos e os endereços que o fundo precisa chamar.
      </p>

      <OperaIntegracaoForm
        fundoId={fundo.id}
        fundoNome={fundo.nomeFantasia ?? fundo.razaoSocial}
        baseUrl={baseUrl}
        contratoPadrao={contratoPadrao}
        atual={{
          tipo: fundo.integracaoTipo,
          ambiente: fundo.integracaoAmbiente,
          apiUrl: fundo.integracaoApiUrl,
          credenciais: fundo.integracaoCredenciais,
          contrato: fundo.integracaoContrato,
          temSegredo: Boolean(fundo.integracaoWebhookSecret),
          ultimoOkEm: fundo.integracaoUltimoOkEm,
          ultimoErro: fundo.integracaoUltimoErro,
        }}
      />
    </AdminShell>
  );
}
