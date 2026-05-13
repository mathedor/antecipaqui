import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { ColetaCompradorManager } from "@/components/coleta-comprador-manager";
import { listTokensColetaPendentes } from "@/lib/actions/corretor-velocidade";

export const metadata = { title: "Coleta de comprador" };

export default async function ColetaCompradorAdminPage() {
  const user = await requireActiveUser();
  if (user.role !== "corretor" && user.role !== "imobiliaria")
    redirect("/painel");

  const tokens = await listTokensColetaPendentes();

  return (
    <PainelShell
      role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"}
      userName={user.nome}
      active="/painel/coleta-comprador"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">atalho</div>
        <h1 className="text-display-md">
          Coletar <span className="text-gradient-blue">dados do comprador</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Gere um link que o comprador acessa pra preencher os próprios dados
          (CPF, telefone, endereço). Você economiza tempo e evita erro de
          digitação. Link válido por 24h.
        </p>
      </div>

      <ColetaCompradorManager
        tokens={tokens.map((t) => ({
          id: t.id,
          token: t.token,
          preenchidoEm: t.preenchidoEm,
          expiresAt: t.expiresAt,
          createdAt: t.createdAt,
          dadosColetados: t.dadosColetados as Record<string, unknown> | null,
        }))}
      />
    </PainelShell>
  );
}
