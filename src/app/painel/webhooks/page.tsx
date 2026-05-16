import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { WebhooksManager } from "@/components/webhooks-manager";
import { listMeusWebhooks } from "@/lib/actions/webhooks";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Webhooks" };

export default async function FundoWebhooksPage() {
  const user = await requireActiveUser();
  if (user.role !== "fundo") redirect("/painel");

  const webhooks = await listMeusWebhooks();
  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/webhooks">
      <div className="mb-6">
        <div className="eyebrow mb-2">integrações</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Webhooks</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Receba notificações em tempo real sobre as operações do seu fundo.
          Cada delivery vai assinado com HMAC-SHA256 no header{" "}
          <code className="font-mono">x-antecipaqui-signature</code>.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-webhooks" />
        </div>
      </div>
      <WebhooksManager
        webhooks={webhooks.map((w) => ({
          id: w.id,
          nome: w.nome,
          targetUrl: w.targetUrl,
          eventos: w.eventos as string[],
          isActive: w.isActive,
          createdAt: w.createdAt,
          lastDeliveryAt: w.lastDeliveryAt,
          lastDeliveryStatus: w.lastDeliveryStatus,
          ownerRole: w.ownerRole,
        }))}
      />
    </PainelShell>
  );
}
