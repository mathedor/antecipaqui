import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listMyConviteLinks } from "@/lib/actions/comercial-convite";
import { ConviteLinksManager } from "@/components/dashboards/comercial-convite-manager";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Link de convite" };
export const dynamic = "force-dynamic";

export default async function ComercialConvidarPage() {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  const links = await listMyConviteLinks();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return (
    <PainelShell
      role="comercial"
      userName={user.nome}
      active="/painel/convidar"
    >
      <div className="mb-8">
        <div className="eyebrow mb-2">link de convite · tracking</div>
        <h1 className="text-display-md">
          Convide imobiliárias <span className="text-gradient-blue">com tracking</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Gere um link único, mande no WhatsApp. Quando a imobiliária se
          cadastrar via esse link, ela entra automaticamente na sua carteira —
          sem você precisar avisar o admin. Cada link tem contador de cliques
          e conversões.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-convidar" />
        </div>
      </div>
      <ConviteLinksManager initialLinks={links} siteUrl={siteUrl} />
    </PainelShell>
  );
}
