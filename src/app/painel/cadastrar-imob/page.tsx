import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { CadastrarImobExpressForm } from "@/components/dashboards/comercial-cadastrar-imob-form";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Cadastrar imobiliária express" };
export const dynamic = "force-dynamic";

export default async function ComercialCadastrarImobPage() {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  return (
    <PainelShell
      role="comercial"
      userName={user.nome}
      active="/painel/cadastrar-imob"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">cadastro express · imobiliária</div>
        <h1 className="text-display-md">
          Trazer cliente <span className="text-gradient-blue">na hora</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Em vez de mandar o link e esperar a imobiliária se cadastrar sozinha,
          você cadastra na hora. Sistema cria o login do corretor, gera senha
          provisória e monta a mensagem de WhatsApp pronta — você só copia e
          manda.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-cadastrar-imob" />
        </div>
      </div>
      <CadastrarImobExpressForm />
    </PainelShell>
  );
}
