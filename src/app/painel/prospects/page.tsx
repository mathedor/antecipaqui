import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { listMyProspectPontos } from "@/lib/actions/comercial-prospects";
import { ProspectsMap } from "@/components/dashboards/comercial-prospects-map";

export const metadata = { title: "Mapa de prospects" };
export const dynamic = "force-dynamic";

export default async function ComercialProspectsPage() {
  const user = await requireActiveUser();
  if (user.role !== "comercial") redirect("/painel");

  const pontos = await listMyProspectPontos();
  const googlePlacesEnabled = !!process.env.GOOGLE_PLACES_API_KEY;

  return (
    <PainelShell
      role="comercial"
      userName={user.nome}
      active="/painel/prospects"
    >
      <div className="mb-6">
        <div className="eyebrow mb-2">prospects · mapa</div>
        <h1 className="text-display-md">
          Mapa de <span className="text-gradient-blue">prospects</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Adicione imobiliárias e construtoras alvo no mapa. Clique num pin
          pra ver dados de contato + abrir WhatsApp/email com mensagem pronta
          incluindo o link da apresentação. Quem já é cliente AQ aparece em
          vermelho — pula essas.
          {!googlePlacesEnabled && (
            <span className="block mt-2 text-xs text-warn">
              Busca automática via Google Places está desativada. Configure{" "}
              <code>GOOGLE_PLACES_API_KEY</code> no env pra ativar.
            </span>
          )}
        </p>
      </div>
      <ProspectsMap
        initialPontos={pontos}
        googlePlacesEnabled={googlePlacesEnabled}
      />
    </PainelShell>
  );
}
