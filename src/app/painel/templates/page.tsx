import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listMyTemplates } from "@/lib/actions/comercial-templates";
import { TemplatesManager } from "@/components/dashboards/comercial-templates-manager";

export const metadata = { title: "Templates de mensagem" };
export const dynamic = "force-dynamic";

export default async function ComercialTemplatesPage() {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  const templates = await listMyTemplates();

  return (
    <PainelShell
      role="comercial"
      userName={user.nome}
      active="/painel/templates"
    >
      <div className="mb-8">
        <div className="eyebrow mb-2">templates · WhatsApp</div>
        <h1 className="text-display-md">
          Seus <span className="text-gradient-blue">templates</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Salve mensagens próprias que vão substituir os textos padrão do{" "}
          <strong>Foco do Dia</strong>. Marque um template como "default" pra
          ele virar a mensagem oficial daquele tipo de ação. Use variáveis
          como <code>{"{nome}"}</code>, <code>{"{empresa}"}</code>,{" "}
          <code>{"{dias_inativa}"}</code>, <code>{"{numero_op}"}</code>,{" "}
          <code>{"{valor_op}"}</code>.
        </p>
      </div>
      <TemplatesManager initialTemplates={templates} />
    </PainelShell>
  );
}
