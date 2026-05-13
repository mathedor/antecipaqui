import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listFundosForSelector } from "@/lib/actions/fundos";
import { getTaxaMensal } from "@/lib/actions/settings";
import { SimuladorAntecipacao } from "@/components/simulador-antecipacao";

export const metadata = { title: "Simulador · Painel" };
export const dynamic = "force-dynamic";

export default async function SimuladorPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "corretor" && user.role !== "imobiliaria")
    redirect("/painel");

  const [fundos, taxaPadrao] = await Promise.all([
    listFundosForSelector(),
    getTaxaMensal(),
  ]);

  // Mapeia fundos com taxa pra passar pro componente
  const fundosComTaxa = fundos
    .filter((f) => f.taxaMensalBase != null)
    .map((f) => ({
      id: f.id,
      nome: f.nomeFantasia ?? f.razaoSocial,
      taxaMensal: parseFloat(f.taxaMensalBase ?? "0"),
    }));

  return (
    <PainelShell
      role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"}
      userName={user.nome}
      active="/painel/simular"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">painel · ferramentas</div>
        <h1 className="text-display-md">
          Simulador de <span className="text-gradient-blue">antecipação</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Calcule quanto você recebe ao antecipar uma comissão vs esperar a
          construtora pagar parcelado. Compare entre fundos e veja o custo
          real de cada cenário antes de cadastrar a operação.
        </p>
      </div>

      <SimuladorAntecipacao
        fundos={fundosComTaxa}
        taxaPadrao={taxaPadrao}
      />

      <div className="mt-8 rounded-2xl border border-border bg-bg-elev p-5 md:p-6 text-center">
        <p className="text-sm text-fg-muted mb-3">
          Pronto pra antecipar essa operação?
        </p>
        <Link
          href="/painel/operacoes/nova"
          className="btn-primary !h-11 !px-6 inline-flex items-center gap-2"
        >
          + Cadastrar operação
        </Link>
      </div>
    </PainelShell>
  );
}
