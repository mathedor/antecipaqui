import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { ImportarContratoForm } from "@/components/importar-contrato-form";

export const metadata = { title: "Importar contrato" };

export default async function ImportarPage() {
  const user = await requireActiveUser();
  if (user.role !== "corretor" && user.role !== "imobiliaria")
    redirect("/painel");

  return (
    <PainelShell
      role={user.role === "imobiliaria" ? "imobiliaria" : "corretor"}
      userName={user.nome}
      active="/painel/operacoes/importar"
    >
      <Link
        href="/painel/operacoes/nova"
        className="font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg mb-3 inline-block"
      >
        ← nova operação
      </Link>

      <div className="mb-6">
        <div className="eyebrow mb-2">atalho</div>
        <h1 className="text-display-md">
          Importar <span className="text-gradient-blue">contrato</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Tire foto ou suba o PDF do contrato de venda ou comissão. Nossa IA
          extrai os campos-chave (valor, data, parcelas) e pré-preenche o
          form. Você confere e ajusta antes de enviar.
        </p>
      </div>

      <ImportarContratoForm />
    </PainelShell>
  );
}
