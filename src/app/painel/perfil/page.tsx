import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { imobiliarias, construtoras, documentos } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PerfilForm } from "@/components/perfil-form";

export const metadata = { title: "Editar dados" };

function pickDoc<T extends { tipo: string; url: string; nomeOriginal: string }>(
  docs: T[],
  tipo: string,
) {
  const d = docs.find((x) => x.tipo === tipo);
  return d ? { url: d.url, name: d.nomeOriginal } : null;
}

export default async function PerfilPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");

  const [imob, construtora, docs] = await Promise.all([
    db
      .select()
      .from(imobiliarias)
      .where(eq(imobiliarias.ownerUserId, user.id))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(construtoras)
      .where(eq(construtoras.ownerUserId, user.id))
      .limit(1)
      .then((r) => r[0] ?? null),
    db.select().from(documentos).where(eq(documentos.userId, user.id)),
  ]);

  const role = (
    user.role === "construtora"
      ? "construtora"
      : user.role === "imobiliaria"
        ? "imobiliaria"
        : "corretor"
  ) as "construtora" | "imobiliaria" | "corretor";

  return (
    <PainelShell role={role} userName={user.nome} active="/painel/perfil">
      <div className="mb-6">
        <div className="eyebrow mb-2">conta</div>
        <h1 className="text-display-md">
          Editar <span className="text-gradient-blue">dados</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Mantenha seus dados sempre atualizados. Endereço usa CEP automático
          (digite o CEP e os outros campos preenchem sozinhos).
        </p>
      </div>

      <PerfilForm
        user={user}
        imobiliaria={imob}
        construtora={construtora}
        initialDocs={{
          contratoSocial: pickDoc(docs, "contrato_social"),
          comprovanteEndereco: pickDoc(docs, "comprovante_endereco"),
          creci: pickDoc(docs, "creci"),
        }}
      />
    </PainelShell>
  );
}
