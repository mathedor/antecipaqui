import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/auth-user";
import { PainelShell } from "@/components/painel-shell";
import { PendenciasInbox } from "@/components/pendencias-inbox";
import {
  listAntecipacoesPendentes,
  listRenegociacoesPendentes,
} from "@/lib/actions/pendencias-decisao";
import { PageHelp } from "@/components/page-help";

export const metadata = { title: "Pendências de decisão" };

export default async function FundoPendenciasPage() {
  const user = await requireActiveUser();
  if (user.role !== "fundo") redirect("/painel");

  const [antecipacoes, renegociacoes] = await Promise.all([
    listAntecipacoesPendentes(),
    listRenegociacoesPendentes(),
  ]);

  return (
    <PainelShell role="fundo" userName={user.nome} active="/painel/pendencias-decisao">
      <div className="mb-6">
        <div className="eyebrow mb-2">decisões pendentes</div>
        <h1 className="text-display-md">
          Pendências de <span className="text-gradient-blue">decisão</span>
        </h1>
        <p className="mt-2 text-fg-muted max-w-2xl">
          Antecipações e renegociações solicitadas pelas construtoras das ops
          do seu fundo.
        </p>
        <div className="mt-2">
          <PageHelp pageKey="painel-pendencias-decisao" />
        </div>
      </div>

      <PendenciasInbox
        antecipacoes={antecipacoes}
        renegociacoes={renegociacoes}
        adminContext={false}
      />
    </PainelShell>
  );
}
