import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { DiagnosticoSeguranca } from "@/components/diagnostico-seguranca";
import { rodarDiagnosticoFundo } from "@/lib/seguranca/runner";

export const metadata = { title: "Diagnóstico · Painel do fundo" };
export const dynamic = "force-dynamic";

export default async function DiagnosticoFundoPage() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/entrar");
  if (user.role !== "fundo") redirect("/painel");

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/diagnostico">
      <div className="mb-6">
        <div className="eyebrow mb-2">painel do fundo · diagnóstico</div>
        <h1 className="text-display-md">
          Diagnóstico da <span className="text-gradient-blue">integração</span>
        </h1>
        <p className="text-fg-muted mt-2 max-w-2xl">
          Em um clique, os robôs conferem o que é seu: a conexão com o seu
          sistema, se os webhooks estão assinados, se a fila de integração
          está fluindo e se a plataforma está no ar. Se algo pedir atenção,
          você vê aqui na hora — antes de virar problema numa operação.
        </p>
      </div>

      <DiagnosticoSeguranca rodar={rodarDiagnosticoFundo} />
    </PainelShell>
  );
}
