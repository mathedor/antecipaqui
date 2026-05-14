import { requireAdmin } from "@/lib/auth-user";
import { AdminShell } from "@/components/admin-shell";
import { WebhooksManager } from "@/components/webhooks-manager";
import { listMeusWebhooks } from "@/lib/actions/webhooks";

export const metadata = { title: "Admin · Webhooks" };

export default async function AdminWebhooksPage() {
  const admin = await requireAdmin();
  const webhooks = await listMeusWebhooks();
  return (
    <AdminShell active="/admin/webhooks" userName={admin.nome}>
      <div className="mb-6">
        <div className="eyebrow mb-2">integrações</div>
        <h1 className="text-display-md">
          <span className="text-gradient-blue">Webhooks</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Avise sistemas externos (CRMs, ERPs) sobre eventos da plataforma.
          Cada delivery vai assinado com HMAC-SHA256 no header{" "}
          <code className="font-mono">x-antecipaqui-signature</code>. Retry
          exponencial até 4 tentativas (1, 5, 25, 125 min).
        </p>
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
    </AdminShell>
  );
}
